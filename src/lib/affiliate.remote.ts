import { command, getRequestEvent } from '$app/server'
import * as v from 'valibot'
import { requestContext } from './server/request'
import { getConfig } from './internal/state'
import { getCart } from './cart.remote'
import { applyAffiliateToCart } from './server/affiliate'

/**
 * Capture an affiliate code (from the `<Affiliate>` component reading it off the
 * URL). Writes the affiliate cookie per the configured attribution basis and, if
 * a cart already exists, applies the code immediately for correct pricing. Does
 * NOT create a cart — a pending code is applied when the cart is first created
 * (see cart.remote's ensureCartId/createCart).
 */
export const captureAffiliate = command(
	v.object({ code: v.pipe(v.string(), v.nonEmpty()) }),
	async ({ code }) => {
		const { cookies } = getRequestEvent()
		const cfg = getConfig()
		const aff = cfg.affiliate

		const existing = cookies.get(aff.cookie)
		const keepFirst = aff.basis === 'first-touch' && !!existing
		const activeCode = keepFirst ? (existing as string) : code

		if (!keepFirst) {
			cookies.set(aff.cookie, code, {
				path: '/',
				maxAge: aff.maxAgeDays * 60 * 60 * 24,
				sameSite: 'lax',
				httpOnly: true,
				secure: true
			})
		}

		const cartId = cookies.get(cfg.cookies.cart)
		if (cartId) {
			const cart = await applyAffiliateToCart(requestContext(), cartId, activeCode)
			if (cart) getCart().set(cart)
		}

		return { code: activeCode }
	}
)
