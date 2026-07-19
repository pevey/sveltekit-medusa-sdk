import { form, command, getRequestEvent } from '$app/server'
import * as v from 'valibot'
import { requestContext } from './server/request'
import { getConfig } from './internal/state'
import { formatBraintreeAddress } from './helpers/braintree'
import { braintreeCheckoutSchema } from './schemas/braintree'
import { getCart } from './cart.remote'

const cartRelations = { fields: '+shipping_methods.name' }

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
 * Apply checkout details (email + shipping/billing addresses) to the cart.
 * A minimal, ready-to-use checkout form; most stores will build their own.
 */
export const braintreeCheckoutForm = form(braintreeCheckoutSchema, async data => {
	const ctx = requestContext()
	const cartId = currentCartId()
	if (!cartId) return { ok: false as const, code: 'no_cart' }

	const shipping_address = {
		first_name: data.first_name,
		last_name: data.last_name,
		address_1: data.address_1,
		address_2: data.address_2,
		city: data.city,
		province: data.province,
		country_code: data.country_code,
		postal_code: data.postal_code,
		phone: data.phone
	}
	const billing_address = data.hideBilling
		? shipping_address
		: {
				first_name: data.billing_first_name,
				last_name: data.billing_last_name,
				address_1: data.billing_address_1,
				address_2: data.billing_address_2,
				city: data.billing_city,
				province: data.billing_province,
				country_code: data.billing_country_code,
				postal_code: data.billing_postal_code,
				phone: data.billing_phone
			}

	const { cart } = await ctx.client.store.cart.update(
		cartId,
		{ email: data.email, shipping_address, billing_address },
		cartRelations,
		ctx.headers()
	)
	getCart().set(cart)
	return { ok: true as const }
})

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
			const res = await fetch(
				`${cfg.baseUrl}/store/payment-collections/${cart.payment_collection?.id}/payment-sessions`,
				{
					method: 'POST',
					headers: backendHeaders(ctx.headers()),
					body: JSON.stringify({
						provider_id,
						data: {
							payment_method_nonce: data.payment_method_nonce,
							context: {
								customer: {
									email: cart.email,
									firstName:
										cart.billing_address?.first_name ||
										cart.shipping_address?.first_name ||
										'',
									lastName:
										cart.billing_address?.last_name ||
										cart.shipping_address?.last_name ||
										'',
									phone: cart.billing_address?.phone || cart.shipping_address?.phone || ''
								},
								shipping: formatBraintreeAddress('shipping', cart),
								billing: formatBraintreeAddress('billing', cart),
								deviceData: data.deviceData
							}
						}
					})
				}
			)
			return res.json()
		}

		return ctx.client.store.payment.initiatePaymentSession(
			cart,
			{ provider_id },
			{},
			ctx.headers()
		)
	}
)
