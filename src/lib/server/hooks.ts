// Seals this module to the server: SvelteKit's guard throws if a client-reachable
// path statically imports `$app/server`, so a stray browser import fails loudly.
import '$app/server'
import type { Handle } from '@sveltejs/kit'
import { setConfig, getClient, getConfig } from '../internal/state'
import { resolveContext } from '../internal/context'
import type { MedusaHandleConfig, MedusaContext } from '../types'

/**
 * Configure the shared Medusa client (once, at module-eval time) and mirror a
 * per-request MedusaContext onto `event.locals.medusa` for use in the consumer's
 * own load functions / endpoints. The library's remote functions resolve the same
 * context via `getRequestEvent()`, so they do not depend on this handle running.
 */
// ~1 year — the anonymous id should outlive individual carts/sessions.
const ANON_ID_MAX_AGE = 60 * 60 * 24 * 365

export function createMedusaHandle(config: MedusaHandleConfig): Handle {
	setConfig(config)
	return async ({ event, resolve }) => {
		// Assign a stable anonymous visitor id on first visit. Server-managed and
		// httpOnly so the analytics forwarder can stamp it as an unspoofable
		// actor_id, decoupled from the cart (which is deleted on order completion).
		const anonCookie = getConfig().cookies.anonymousId
		if (!event.cookies.get(anonCookie)) {
			event.cookies.set(anonCookie, crypto.randomUUID(), {
				path: '/',
				maxAge: ANON_ID_MAX_AGE,
				sameSite: 'lax',
				httpOnly: true,
				secure: true
			})
		}

		// The consumer augments App.Locals with `medusa` (see README). The library
		// can't see that augmentation in its own typecheck, so assert the shape here.
		;(event.locals as { medusa: MedusaContext }).medusa = resolveContext(
			getClient(),
			getConfig(),
			event.cookies
		)
		return resolve(event)
	}
}
