import { command, getRequestEvent } from '$app/server'
import * as v from 'valibot'
import { requestContext } from './server/request'
import { getConfig } from './internal/state'
import { formatBraintreeAddress } from './helpers/braintree'

function currentCartId(): string | undefined {
	return getRequestEvent().cookies.get(getConfig().cookies.cart)
}

function backendHeaders(session: Record<string, string>): Record<string, string> {
	const cfg = getConfig()
	return {
		'Content-Type': 'application/json',
		'x-publishable-api-key': cfg.publishableKey,
		...cfg.globalHeaders,
		...session
	}
}

/**
 * Initiate a Braintree payment session. When a client-side `payment_method_nonce`
 * (and optional `deviceData`) is supplied, it is sent with a Braintree customer/
 * address context via the payment-collections API; otherwise a plain session is
 * initiated through the SDK.
 */
export const initiateBraintreePaymentSession = command(
	v.object({
		provider_id: v.pipe(v.string(), v.nonEmpty()),
		data: v.optional(
			v.object({
				payment_method_nonce: v.optional(v.string()),
				deviceData: v.optional(v.string())
			})
		)
	}),
	async ({ provider_id, data }) => {
		const ctx = requestContext()
		const cfg = getConfig()
		const cartId = currentCartId()
		if (!cartId) return null
		const { cart } = await ctx.client.store.cart.retrieve(cartId, {}, ctx.headers())
		if (!cart) return null

		if (data?.payment_method_nonce) {
			const res = await fetch(`${cfg.baseUrl}/store/payment-collections/${cart.payment_collection?.id}/payment-sessions`, {
				method: 'POST',
				headers: backendHeaders(ctx.headers()),
				body: JSON.stringify({
					provider_id,
					data: {
						payment_method_nonce: data.payment_method_nonce,
						context: {
							customer: {
								email: cart.email,
								firstName: cart.billing_address?.first_name || cart.shipping_address?.first_name || '',
								lastName: cart.billing_address?.last_name || cart.shipping_address?.last_name || '',
								phone: cart.billing_address?.phone || cart.shipping_address?.phone || ''
							},
							shipping: formatBraintreeAddress('shipping', cart),
							billing: formatBraintreeAddress('billing', cart),
							deviceData: data.deviceData
						}
					}
				})
			})
			return res.json()
		}

		return ctx.client.store.payment.initiatePaymentSession(cart, { provider_id }, {}, ctx.headers())
	}
)
