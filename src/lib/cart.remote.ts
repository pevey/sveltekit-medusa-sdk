import { query, command, getRequestEvent } from '$app/server'
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
  const { cart } = await ctx.client.store.cart.retrieve(cartId, cartRelations, ctx.headers())
  return cart
})

export const getCartById = query(v.optional(v.string()), async (cartId?: string) => {
  if (!cartId) return null
  const ctx = requestContext()
  const { cart } = await ctx.client.store.cart.retrieve(cartId, cartRelations, ctx.headers())
  if (cart) setCartCookie(cart.id)
  return cart ?? null
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

async function ensureCartId(ctx: MedusaContext): Promise<string> {
  const existing = currentCartId()
  if (existing) return existing
  const { cart } = await ctx.client.store.cart.create(await createCartBody(ctx), cartRelations, ctx.headers())
  setCartCookie(cart.id)
  // Apply a pending affiliate code captured before the cart existed.
  const code = pendingAffiliateCode()
  if (code) await applyAffiliateToCart(ctx, cart.id, code)
  return cart.id
}

export const addToCart = command(
  v.object({
    variant_id: v.pipe(v.string(), v.nonEmpty()),
    quantity: v.optional(v.pipe(v.number(), v.minValue(1)), 1)
  }),
  async ({ variant_id, quantity }) => {
    const ctx = requestContext()
    const cartId = await ensureCartId(ctx)
    const { cart } = await ctx.client.store.cart.createLineItem(cartId, { variant_id, quantity }, cartRelations, ctx.headers())
    getCart().set(cart)
    return cart
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
