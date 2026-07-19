import { describe, it, expect } from 'vitest'
import { resolveContext } from './context'
import { resolveConfig } from './config'

const config = resolveConfig({
	baseUrl: 'http://x:9000',
	publishableKey: 'pk',
	defaultRegionId: 'reg_default',
	defaultCountryCode: 'us'
})
const fakeClient = {} as any

function cookiesFrom(map: Record<string, string>) {
	return { get: (name: string) => map[name] }
}

describe('resolveContext', () => {
	it('reads region/country from cookies when present', () => {
		const ctx = resolveContext(
			fakeClient,
			config,
			cookiesFrom({ region: 'reg_eu', country: 'de' })
		)
		expect(ctx.region_id).toBe('reg_eu')
		expect(ctx.country_code).toBe('de')
	})

	it('falls back to config defaults when cookies absent', () => {
		const ctx = resolveContext(fakeClient, config, cookiesFrom({}))
		expect(ctx.region_id).toBe('reg_default')
		expect(ctx.country_code).toBe('us')
	})

	it('headers() replays the session when the sid cookie is set', () => {
		const ctx = resolveContext(fakeClient, config, cookiesFrom({ sid: 'abc' }))
		expect(ctx.headers()).toEqual({ Cookie: 'connect.sid=abc' })
	})

	it('headers() is empty when no session cookie', () => {
		const ctx = resolveContext(fakeClient, config, cookiesFrom({}))
		expect(ctx.headers()).toEqual({})
	})

	it('exposes the passed client by reference', () => {
		const ctx = resolveContext(fakeClient, config, cookiesFrom({}))
		expect(ctx.client).toBe(fakeClient)
	})
})
