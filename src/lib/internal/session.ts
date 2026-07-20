import { parseSetCookie } from 'cookie'

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
		const parsed = parseSetCookie(raw)
		if (parsed.name !== backendSessionCookie || !parsed.value) continue
		const result: ParsedSession = { value: parsed.value }
		if (parsed.expires) {
			const maxAge = Math.floor((parsed.expires.getTime() - now) / 1000)
			if (!Number.isNaN(maxAge)) result.maxAge = maxAge
		}
		return result
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
