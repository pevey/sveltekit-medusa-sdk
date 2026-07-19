// Importing from `$app/server` seals this to the server. Not part of the public
// `/server` surface — internal helpers shared by affiliate.remote and cart.remote.
import { getRequestEvent } from '$app/server'
import { getConfig } from '../internal/state'
import type { MedusaContext } from '../types'

const cartRelations = { fields: '+shipping_methods.name' }

/** The affiliate code currently stored for this visitor, if any. */
export function pendingAffiliateCode(): string | undefined {
	return getRequestEvent().cookies.get(getConfig().affiliate.cookie)
}

/**
 * Apply an affiliate promo code to a cart, returning the updated cart (or null
 * on failure). Best-effort: an invalid/expired code — or the backend guard
 * rejecting a disallowed stack — must never break cart creation. The affiliate
 * plugin's cart-promotion guard hook enforces one-affiliate-per-cart and
 * last-click replacement server-side, so the storefront just applies the code.
 */
export async function applyAffiliateToCart(ctx: MedusaContext, cartId: string, code: string) {
	try {
		const { cart } = await ctx.client.store.cart.addPromotions(
			cartId,
			{ promo_codes: [code] },
			cartRelations,
			ctx.headers()
		)
		return cart
	} catch {
		return null
	}
}
