import { getRequestEvent } from '$app/server'
import { getClient, getConfig } from '../internal/state'
import { resolveContext } from '../internal/context'
import type { MedusaContext } from '../types'

/** Resolve the Medusa context for the current request. */
export function requestContext(): MedusaContext {
	const { cookies } = getRequestEvent()
	return resolveContext(getClient(), getConfig(), cookies)
}
