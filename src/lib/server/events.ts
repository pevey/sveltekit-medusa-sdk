// Importing from `$app/server` seals this module to the server (SvelteKit's
// guard throws on client import).
import { getRequestEvent } from '$app/server'
import type { RequestEvent } from '@sveltejs/kit'
import type { AnalyticsEvent } from 'medusa-js-sdk'
import { getClient, getConfig } from '../internal/state'

// Throttle cookie for the per-session identity refresh (person-per-visitor).
const IDENTITY_REFRESH_COOKIE = 'aid_r'
const IDENTITY_REFRESH_MAX_AGE = 60 * 30 // ~one session

/**
 * Read the real client IP + country at the edge. Only the first hop (browser →
 * this server) has them; Medusa would only see this server's IP. Auto-detects
 * Cloudflare (`CF-Connecting-IP` / `CF-IPCountry`), falls back to
 * `X-Forwarded-For` (leftmost) then the platform address. `omitIp` drops the raw
 * IP while keeping the country.
 */
function readClientGeo(): Record<string, unknown> {
	const event = getRequestEvent()
	const cfg = getConfig()
	const h = event.request.headers

	const country = h.get('cf-ipcountry') ?? undefined

	let ip: string | undefined
	if (cfg.analytics.clientIpHeader) {
		ip = h.get(cfg.analytics.clientIpHeader) ?? undefined
	} else {
		ip = h.get('cf-connecting-ip') ?? h.get('x-forwarded-for') ?? undefined
	}
	if (ip?.includes(',')) ip = ip.split(',')[0].trim()
	if (!ip) {
		try {
			ip = event.getClientAddress()
		} catch {
			// getClientAddress not available on this adapter
		}
	}

	const geo: Record<string, unknown> = {}
	if (country) geo.country = country
	if (ip && !cfg.analytics.omitIp) geo.ip = ip
	return geo
}

function shouldRefreshIdentity(): boolean {
	return !getRequestEvent().cookies.get(IDENTITY_REFRESH_COOKIE)
}

function markIdentityRefreshed(): void {
	getRequestEvent().cookies.set(IDENTITY_REFRESH_COOKIE, '1', {
		path: '/',
		maxAge: IDENTITY_REFRESH_MAX_AGE,
		sameSite: 'lax',
		httpOnly: true,
		secure: true
	})
}

/**
 * Receive a batch of analytics events (a normal fetch flush or an exit
 * `sendBeacon`) and forward them to Medusa `/store/ping`. Identity is stamped
 * here, server-side: `actor_id` from the `anonymous_id` cookie (stable across
 * carts/orders, unspoofable), `cart_id` added as a property. Once per session it
 * also appends an `_identify` carrying the current geo — creating the identity on
 * the first batch (person-per-visitor) and keeping the country fresh thereafter.
 * Best-effort: analytics never fails the storefront.
 *
 * Wire it up in a same-origin route the <Analytics> component points at:
 *
 * ```ts
 * // src/routes/api/ping/+server.ts
 * export { analyticsPOST as POST } from 'sveltekit-medusa-sdk/server'
 * ```
 */
export async function forwardAnalytics(request: Request): Promise<Response> {
	let body: AnalyticsEvent | AnalyticsEvent[]
	try {
		body = (await request.json()) as AnalyticsEvent | AnalyticsEvent[]
	} catch {
		return new Response(null, { status: 400 })
	}

	const { cookies } = getRequestEvent()
	const cfg = getConfig()
	const actorId = cookies.get(cfg.cookies.anonymousId)
	const cartId = cookies.get(cfg.cookies.cart)

	const events: AnalyticsEvent[] = (Array.isArray(body) ? body : [body]).map((e) => ({
		...e,
		...(actorId ? { actor_id: actorId } : {}),
		properties: {
			...e.properties,
			// cart_id belongs on events, not on the identity's `_identify`.
			...(e.event !== '_identify' && cartId ? { cart_id: cartId } : {})
		}
	}))

	if (actorId && shouldRefreshIdentity()) {
		events.push({ event: '_identify', actor_id: actorId, properties: readClientGeo() })
		markIdentityRefreshed()
	}

	try {
		await getClient().store.analytics.track(events)
	} catch {
		// Swallow — a failed analytics forward must not break the page.
	}

	return new Response(null, { status: 202 })
}

/** Ready-made `+server.ts` POST handler; re-export as `POST`. */
export const analyticsPOST = (event: RequestEvent): Promise<Response> =>
	forwardAnalytics(event.request)

/**
 * Attach traits to the current anonymous visitor's identity, server-side. Use it
 * from your own remote functions / `+server.ts` / actions where request headers
 * are available (e.g. capturing a first-touch country from `cf-ipcountry`). Pairs
 * with the browser `setTraits` (barrel export). No-op if there is no visitor yet;
 * best-effort.
 */
export async function setTraits(traits: Record<string, unknown>): Promise<void> {
	const cfg = getConfig()
	const actorId = getRequestEvent().cookies.get(cfg.cookies.anonymousId)
	if (!actorId) return
	try {
		await getClient().store.analytics.track([
			{ event: '_identify', actor_id: actorId, properties: traits }
		])
	} catch {
		// Best-effort — trait capture must not break the request.
	}
}

/**
 * Stitch the current anonymous visitor to the customer they just authenticated
 * as. Called from the auth flow with the freshly-established session. Fires an
 * `_identify` with `actor_id = customer_id` and the old `anonymous_id`, which the
 * backend merges (re-attributing the anonymous history to the customer). Carries
 * the current geo too, so the customer's country is refreshed on login. No-op if
 * there is no anonymous id yet; best-effort so it never fails login.
 */
export async function stitchAnalyticsIdentity(sessionValue: string): Promise<void> {
	const cfg = getConfig()
	const anonymousId = getRequestEvent().cookies.get(cfg.cookies.anonymousId)
	if (!anonymousId) return

	try {
		const client = getClient()
		const { customer } = await client.store.customer.retrieve(
			{},
			{ Cookie: `${cfg.backendSessionCookie}=${sessionValue}` }
		)
		if (!customer?.id) return

		await client.store.analytics.track([
			{
				event: '_identify',
				actor_id: customer.id,
				properties: {
					anonymous_id: anonymousId,
					customer_id: customer.id,
					...readClientGeo()
				}
			}
		])
	} catch {
		// Best-effort — analytics identity stitching must not break authentication.
	}
}
