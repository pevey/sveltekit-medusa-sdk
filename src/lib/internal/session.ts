import * as cookie from 'cookie'

export interface ParsedSession {
	value: string
	maxAge?: number
}

/**
 * Extract the backend session cookie (e.g. `connect.sid`) from the Set-Cookie
 * headers returned by `POST /auth/session`. `now` is injected for testability.
 */
export function parseSetCookieSession(
	setCookieHeaders: string[],
	backendSessionCookie: string,
	now: number
): ParsedSession | null {
	for (const raw of setCookieHeaders) {
		const parsed = cookie.parse(raw)
		const value = parsed[backendSessionCookie]
		if (value) {
			const result: ParsedSession = { value }
			if (parsed['Expires']) {
				const expires = new Date(parsed['Expires']).getTime()
				if (!Number.isNaN(expires)) result.maxAge = Math.floor((expires - now) / 1000)
			}
			return result
		}
	}
	return null
}

/** Build the Cookie header that replays the backend session, server-side only. */
export function buildSessionHeader(
	sessionValue: string | undefined,
	backendSessionCookie: string
): Record<string, string> {
	if (!sessionValue) return {}
	return { Cookie: `${backendSessionCookie}=${sessionValue}` }
}
