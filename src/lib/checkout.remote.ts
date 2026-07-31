import { form, getRequestEvent } from '$app/server'
import { requestContext } from './server/request'
import { getConfig } from './internal/state'
import { checkoutSchema } from './schemas/checkout'
import { getCart } from './cart.remote'

const cartRelations = { fields: '+shipping_methods.name' }

function currentCartId(): string | undefined {
	return getRequestEvent().cookies.get(getConfig().cookies.cart)
}

/**
 * Apply checkout details (email + shipping/billing addresses) to the cart.
 * A minimal, ready-to-use checkout form shared by every payment provider; most
 * stores will build their own.
 */
export const checkoutForm = form(checkoutSchema, async data => {
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

	const { cart } = await ctx.client.store.cart.update(cartId, { email: data.email, shipping_address, billing_address }, cartRelations, ctx.headers())
	getCart().set(cart)
	return { ok: true as const }
})
