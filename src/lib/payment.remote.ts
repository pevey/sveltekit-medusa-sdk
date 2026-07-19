import { query, command, getRequestEvent } from '$app/server'
import * as v from 'valibot'
import { requestContext } from './server/request'
import { getConfig } from './internal/state'

function currentCartId(): string | undefined {
  return getRequestEvent().cookies.get(getConfig().cookies.cart)
}

export const listPaymentProviders = query(async () => {
  const ctx = requestContext()
  return ctx.client.store.payment.listPaymentProviders({ region_id: ctx.region_id }, ctx.headers())
})

// Generic payment-session initiation for a provider (no provider-specific context).
export const initiatePaymentSession = command(
  v.object({ provider_id: v.pipe(v.string(), v.nonEmpty()) }),
  async ({ provider_id }) => {
    const ctx = requestContext()
    const cartId = currentCartId()
    if (!cartId) return null
    const { cart } = await ctx.client.store.cart.retrieve(cartId, {}, ctx.headers())
    if (!cart) return null
    return ctx.client.store.payment.initiatePaymentSession(cart, { provider_id }, {}, ctx.headers())
  }
)
