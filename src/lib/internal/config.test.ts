import { describe, it, expect } from 'vitest'
import { resolveConfig, DEFAULT_COOKIES } from './config'

describe('resolveConfig', () => {
	const base = { baseUrl: 'http://localhost:9000', publishableKey: 'pk_test' }

	it('applies cookie-name and misc defaults', () => {
		const c = resolveConfig(base)
		expect(c.cookies).toEqual(DEFAULT_COOKIES)
		expect(c.backendSessionCookie).toBe('connect.sid')
		expect(c.transferCartOnLogin).toBe(true)
		expect(c.globalHeaders).toEqual({})
		expect(c.debug).toBe(false)
	})

	it('honors overrides and partial cookie overrides', () => {
		const c = resolveConfig({
			...base,
			cookies: { session: 'sess' },
			transferCartOnLogin: false,
			backendSessionCookie: 'sid.backend'
		})
		expect(c.cookies.session).toBe('sess')
		expect(c.cookies.region).toBe('region') // untouched default
		expect(c.transferCartOnLogin).toBe(false)
		expect(c.backendSessionCookie).toBe('sid.backend')
	})

	it('throws when baseUrl or publishableKey missing', () => {
		expect(() => resolveConfig({ baseUrl: '', publishableKey: 'x' })).toThrow(/baseUrl/)
		expect(() => resolveConfig({ baseUrl: 'x', publishableKey: '' })).toThrow(/publishableKey/)
	})
})
