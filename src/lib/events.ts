// Public event tracking API. Emit events from anywhere in the app; the
// events queue in the collector owned by the <Analytics> layout component and
// flush (batched) to your same-origin endpoint, which forwards to Medusa and
// stamps identity server-side. No-ops until <Analytics> has mounted (and always
// on the server). Identity stitching happens automatically on login (see the
// auth flow) — there is no client-side identify.
import type { TrackOptions } from 'medusa-js-sdk'
import { getCollector } from './internal/events-singleton'

export function track(event: string, options?: TrackOptions): void {
	getCollector()?.track(event, options)
}

/** Attach traits to the current visitor's identity from the browser. For traits
 *  the browser knows; use the `/server` `setTraits` for request-derived data. */
export function setTraits(traits: Record<string, unknown>): void {
	getCollector()?.setTraits(traits)
}
