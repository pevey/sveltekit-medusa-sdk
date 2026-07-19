import { describe, it, expect } from 'vitest'
import { parseSetCookieSession, buildSessionHeader } from './session'

describe('parseSetCookieSession', () => {
	const now = Date.parse('2026-07-13T00:00:00Z')

	it('extracts the backend session value and computes maxAge from Expires', () => {
		const expires = new Date(now + 3600_000).toUTCString() // +1h
		const headers = [`connect.sid=abc123; Path=/; Expires=${expires}; HttpOnly; SameSite=Lax`]
		const r = parseSetCookieSession(headers, 'connect.sid', now)
		expect(r?.value).toBe('abc123')
		expect(r?.maxAge).toBe(3600)
	})

	it('returns value with no maxAge when Expires absent', () => {
		const r = parseSetCookieSession(['connect.sid=xyz; Path=/; HttpOnly'], 'connect.sid', now)
		expect(r).toEqual({ value: 'xyz' })
	})

	it('returns null when the named cookie is not present', () => {
		expect(parseSetCookieSession(['other=1; Path=/'], 'connect.sid', now)).toBeNull()
		expect(parseSetCookieSession([], 'connect.sid', now)).toBeNull()
	})
})

describe('buildSessionHeader', () => {
	it('builds a Cookie header replaying the backend session name', () => {
		expect(buildSessionHeader('abc123', 'connect.sid')).toEqual({ Cookie: 'connect.sid=abc123' })
	})
	it('returns an empty object when no session value', () => {
		expect(buildSessionHeader(undefined, 'connect.sid')).toEqual({})
	})
})
