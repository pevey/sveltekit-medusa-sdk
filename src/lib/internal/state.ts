import Medusa from 'medusa-js-sdk'
import { resolveConfig } from './config'
import type { MedusaHandleConfig, ResolvedConfig } from '../types'

let client: Medusa | undefined
let config: ResolvedConfig | undefined

/** Configure the shared client once. Idempotent — the first call wins. */
export function setConfig(raw: MedusaHandleConfig): void {
	if (config) return
	const resolved = resolveConfig(raw)
	config = resolved
	client = new Medusa({
		baseUrl: resolved.baseUrl,
		publishableKey: resolved.publishableKey,
		globalHeaders: resolved.globalHeaders,
		debug: resolved.debug,
		auth: { type: 'session', fetchCredentials: 'omit' }
	})
}

export function getClient(): Medusa {
	if (!client)
		throw new Error(
			'Medusa client is not configured. Add createMedusaHandle(config) to your hooks.server.ts.'
		)
	return client
}

export function getConfig(): ResolvedConfig {
	if (!config)
		throw new Error(
			'Medusa config is not set. Add createMedusaHandle(config) to your hooks.server.ts.'
		)
	return config
}

/**
 * A fresh, throwaway client for the login handshake. Using a separate instance
 * keeps the shared client's auth state untouched (no cross-request token bleed).
 * `type: 'jwt'` makes `auth.login` return the token without an internal session
 * exchange, so we capture the `Set-Cookie` ourselves.
 */
export function createAuthClient(): Medusa {
	const c = getConfig()
	return new Medusa({
		baseUrl: c.baseUrl,
		publishableKey: c.publishableKey,
		globalHeaders: c.globalHeaders,
		debug: c.debug,
		auth: { type: 'jwt' }
	})
}

/** Test-only: reset module state between tests. */
export function __resetForTest(): void {
	client = undefined
	config = undefined
}
