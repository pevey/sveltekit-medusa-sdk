import type Medusa from 'medusa-js-sdk'

export interface CookieNames {
	session: string
	region: string
	country: string
	cart: string
	/** Stable anonymous visitor id; the analytics forwarder stamps it as actor_id. */
	anonymousId: string
}

export type AttributionBasis = 'last-click' | 'first-touch'

export interface AffiliateConfig {
	/** Cookie storing the captured affiliate code. */
	cookie: string
	/** How long the captured code persists (the sales-cycle window). */
	maxAgeDays: number
	/** `last-click` overwrites on a new code; `first-touch` keeps the first. */
	basis: AttributionBasis
}

export interface AnalyticsConfig {
	/** Override the header the client IP is read from. Auto-detected if unset. */
	clientIpHeader?: string
	/** Store only the country and drop the raw IP (IP-restricted jurisdictions). */
	omitIp: boolean
}

export interface MedusaHandleConfig {
	baseUrl: string
	publishableKey: string
	globalHeaders?: Record<string, string>
	defaultRegionId?: string
	defaultCountryCode?: string
	backendSessionCookie?: string
	cookies?: Partial<CookieNames>
	affiliate?: Partial<AffiliateConfig>
	analytics?: Partial<AnalyticsConfig>
	transferCartOnLogin?: boolean
	debug?: boolean
}

export interface ResolvedConfig {
	baseUrl: string
	publishableKey: string
	globalHeaders: Record<string, string>
	defaultRegionId?: string
	defaultCountryCode?: string
	backendSessionCookie: string
	cookies: CookieNames
	affiliate: AffiliateConfig
	analytics: AnalyticsConfig
	transferCartOnLogin: boolean
	debug: boolean
}

export interface MedusaContext {
	client: Medusa
	region_id: string
	country_code: string
	headers(): Record<string, string>
}

/** Structured result for auth forms so consumers map codes to their own copy/i18n. */
export interface AuthResult {
	ok: boolean
	code?: string
}
