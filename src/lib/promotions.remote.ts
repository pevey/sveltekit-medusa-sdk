import { command, getRequestEvent } from '$app/server'
import * as v from 'valibot'
import { requestContext } from './server/request'
import { getConfig } from './internal/state'
import { getCart } from './cart.remote'

const cartRelations = { fields: '+shipping_methods.name' }

function currentCartId(): string | undefined {
  return getRequestEvent().cookies.get(getConfig().cookies.cart)
}

// Standard Medusa store promotion API (adds to existing codes).
export const addPromotion = command(v.pipe(v.string(), v.nonEmpty()), async (code: string) => {
  const ctx = requestContext()
  const cartId = currentCartId()
  if (!cartId) return null
  const { cart } = await ctx.client.store.cart.addPromotions(cartId, { promo_codes: [code] }, cartRelations, ctx.headers())
  getCart().set(cart)
  return cart
})

export const removePromotion = command(v.pipe(v.string(), v.nonEmpty()), async (code: string) => {
  const ctx = requestContext()
  const cartId = currentCartId()
  if (!cartId) return null
  const { cart } = await ctx.client.store.cart.removePromotions(cartId, { promo_codes: [code] }, cartRelations, ctx.headers())
  getCart().set(cart)
  return cart
})
