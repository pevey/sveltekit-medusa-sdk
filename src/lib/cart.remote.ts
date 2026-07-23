import { query, command, getRequestEvent } from '$app/server'
import { error } from '@sveltejs/kit'
import * as v from 'valibot'
import { requestContext } from './server/request'
import { getConfig } from './internal/state'
import { getDefaultRegionId } from './internal/region'
import { pendingAffiliateCode, applyAffiliateToCart } from './server/affiliate'
import type { MedusaContext } from './types'

// Always resolve `shipping_methods.name` on cart reads/mutations.
const cartRelations = { fields: '+shipping_methods.name' }
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 400

function cartCookieName() {
  return getConfig().cookies.cart
}

function setCartCookie(id: string) {
  getRequestEvent().cookies.set(cartCookieName(), id, {
    path: '/',
    maxAge: CART_COOKIE_MAX_AGE,
    sameSite: 'strict',
    httpOnly: true,
    secure: true
  })
}

function currentCartId(): string | undefined {
  return getRequestEvent().cookies.get(cartCookieName())
}

// A stale/foreign cart id (deleted, expired, or left over from a different backend) makes the
// store cart endpoints throw a 404.
function isCartNotFound(e: unknown): boolean {
  return (e as { status?: number } | null)?.status === 404
}

// Reads treat a 404 as "no cart" and return null, so `getCart` renders an empty cart instead of
// 500-ing the whole page. A `query` may NOT mutate cookies, so the stale cookie is left in place
// here; it is healed on the next mutation (a `command` — see `addToCart`, which can set cookies).
// A real backend error (network, 5xx) is rethrown so it still surfaces.
async function retrieveCart(ctx: MedusaContext, cartId: string) {
  try {
    const { cart } = await ctx.client.store.cart.retrieve(cartId, cartRelations, ctx.headers())
    return cart ?? null
  } catch (e) {
    if (isCartNotFound(e)) return null
    throw e
  }
}

const addressSchema = v.object({
  first_name: v.optional(v.string()),
  last_name: v.optional(v.string()),
  address_1: v.optional(v.string()),
  address_2: v.optional(v.string()),
  city: v.optional(v.string()),
  province: v.optional(v.string()),
  country_code: v.optional(v.string()),
  postal_code: v.optional(v.string()),
  phone: v.optional(v.string()),
  company: v.optional(v.string())
})

export const getCart = query(async () => {
  const ctx = requestContext()
  const cartId = currentCartId()
  if (!cartId) return null
  return retrieveCart(ctx, cartId)
})

export const getCartById = query(v.optional(v.string()), async (cartId?: string) => {
  if (!cartId) return null
  const ctx = requestContext()
  const cart = await retrieveCart(ctx, cartId)
  if (cart) setCartCookie(cart.id)
  return cart
})

async function createCartBody(ctx: MedusaContext): Promise<Record<string, string>> {
  const region_id = ctx.region_id || (await getDefaultRegionId())
  return region_id ? { region_id } : {}
}

export const createCart = command(async () => {
  const ctx = requestContext()
  const { cart } = await ctx.client.store.cart.create(await createCartBody(ctx), cartRelations, ctx.headers())
  setCartCookie(cart.id)
  // Apply a pending affiliate code captured before the cart existed.
  const code = pendingAffiliateCode()
  const withPromo = code ? await applyAffiliateToCart(ctx, cart.id, code) : null
  const result = withPromo ?? cart
  getCart().set(result)
  return result
})

// Create a new cart, set the cookie, and apply any pending affiliate code. Setting the cookie is
// allowed here because every caller is a `command`.
async function createFreshCart(ctx: MedusaContext): Promise<string> {
  const { cart } = await ctx.client.store.cart.create(await createCartBody(ctx), cartRelations, ctx.headers())
  setCartCookie(cart.id)
  // Apply a pending affiliate code captured before the cart existed.
  const code = pendingAffiliateCode()
  if (code) await applyAffiliateToCart(ctx, cart.id, code)
  return cart.id
}

async function ensureCartId(ctx: MedusaContext): Promise<string> {
  return currentCartId() ?? (await createFreshCart(ctx))
}

async function addLine(ctx: MedusaContext, cartId: string, variant_id: string, quantity: number) {
  const { cart } = await ctx.client.store.cart.createLineItem(cartId, { variant_id, quantity }, cartRelations, ctx.headers())
  getCart().set(cart)
  return cart
}

// SvelteKit sanitizes a raw thrown error to a generic "Internal Error" on the client. Re-throw
// the backend's status + message as an `error()` (HttpError), which IS passed through — so a
// consumer's `onerror` (e.g. an add-to-cart button) can show or map a real message instead.
function throwCartError(e: unknown): never {
  const err = e as { status?: number; message?: string } | null
  const status = typeof err?.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 400
  throw error(status, err?.message || 'Could not update the cart.')
}

export const addToCart = command(
  v.object({
    variant_id: v.pipe(v.string(), v.nonEmpty()),
    quantity: v.optional(v.pipe(v.number(), v.minValue(1)), 1)
  }),
  async ({ variant_id, quantity }) => {
    const ctx = requestContext()
    const cartId = await ensureCartId(ctx)
    try {
      return await addLine(ctx, cartId, variant_id, quantity)
    } catch (e) {
      // Stale cart id (e.g. a cookie left over from another backend): `ensureCartId` reused it
      // because a cookie existed. Start a fresh cart and retry once; surface anything else.
      if (isCartNotFound(e)) {
        try {
          return await addLine(ctx, await createFreshCart(ctx), variant_id, quantity)
        } catch (retryErr) {
          throwCartError(retryErr)
        }
      }
      throwCartError(e)
    }
  }
)

export const removeFromCart = command(v.string(), async (lineId: string) => {
  const ctx = requestContext()
  const cartId = currentCartId()
  if (!cartId) return null
  const { parent } = await ctx.client.store.cart.deleteLineItem(cartId, lineId, cartRelations, ctx.headers())
  if (parent) getCart().set(parent)
  return parent ?? null
})

export const updateCartItem = command(
  v.object({
    item_id: v.pipe(v.string(), v.nonEmpty()),
    quantity: v.pipe(v.number(), v.minValue(0))
  }),
  async ({ item_id, quantity }) => {
    const ctx = requestContext()
    const cartId = currentCartId()
    if (!cartId) return null
    const { cart } = await ctx.client.store.cart.updateLineItem(cartId, item_id, { quantity }, cartRelations, ctx.headers())
    getCart().set(cart)
    return cart
  }
)

export const updateCart = command(
  v.object({
    email: v.optional(v.pipe(v.string(), v.nonEmpty(), v.email())),
    region_id: v.optional(v.string()),
    shipping_address_id: v.optional(v.string()),
    shipping_address: v.optional(addressSchema),
    billing_address_id: v.optional(v.string()),
    billing_address: v.optional(addressSchema),
    metadata: v.optional(v.record(v.string(), v.unknown()))
  }),
  async (data) => {
    const ctx = requestContext()
    const cartId = currentCartId()
    if (!cartId) return null
    const { cart } = await ctx.client.store.cart.update(cartId, data, cartRelations, ctx.headers())
    getCart().set(cart)
    return cart
  }
)

export const selectShippingOption = command(v.string(), async (optionId: string) => {
  const ctx = requestContext()
  const cartId = currentCartId()
  if (!cartId) return null
  const { cart } = await ctx.client.store.cart.addShippingMethod(cartId, { option_id: optionId }, cartRelations, ctx.headers())
  getCart().set(cart)
  return cart
})

export const getShippingOptions = query(async () => {
  const ctx = requestContext()
  const cartId = currentCartId()
  if (!cartId) return []
  const { shipping_options } = await ctx.client.store.fulfillment.listCartOptions({ cart_id: cartId }, ctx.headers())
  return shipping_options
})

export const completeCart = command(async () => {
  const ctx = requestContext()
  const { cookies } = getRequestEvent()
  const cartId = currentCartId()
  if (!cartId) return null
  const result = await ctx.client.store.cart.complete(cartId, {}, ctx.headers())
  if (result.type === 'order') {
    cookies.delete(cartCookieName(), { path: '/' })
    return result.order
  }
  // type === 'cart' means completion failed validation; return the cart with its errors.
  return result.cart
})
