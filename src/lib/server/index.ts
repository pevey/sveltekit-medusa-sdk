// ─────────────────────────────────────────────────────────────────────────────
// lib/server — SERVER-ONLY entry (`sveltekit-medusa-sdk/server`).
//
// Anything here MUST run on the server: it statically imports `$app/server`
// (or otherwise depends on request-scoped server state). It is intentionally NOT
// re-exported from the package barrel (`.`), because SvelteKit's guard rejects any
// static path from browser code to `$app/server`. Import from this entry only
// inside your own remote functions (`*.remote.ts`, which SvelteKit compiles to
// client stubs) or other server-only code.
// ─────────────────────────────────────────────────────────────────────────────
// Seals this entry to the server (see note above): SvelteKit's guard throws if a
// client-reachable path statically imports `$app/server`.
import '$app/server'
export { createMedusaHandle } from './hooks'
export { requestContext as getMedusaContext } from './request'
export { forwardAnalytics, analyticsPOST, setTraits } from './events'
