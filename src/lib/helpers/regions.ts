import type { Country } from '../types'

type RegionLike = { countries?: ({ iso_2?: string; display_name?: string } | null)[] | null }

/** The region whose countries include `countryCode` (case-insensitive iso_2). */
export function regionForCountry<R extends RegionLike>(
	regions: R[] | null | undefined,
	countryCode: string
): R | undefined {
	const code = countryCode.toLowerCase()
	return regions?.find((r) => r.countries?.some((c) => c?.iso_2?.toLowerCase() === code))
}

/** Deduped, name-sorted { code, name } for every country across all regions (the shippable set). */
export function countriesFromRegions(regions: RegionLike[] | null | undefined): Country[] {
	const byCode = new Map<string, Country>()
	for (const region of regions ?? []) {
		for (const c of region.countries ?? []) {
			const iso = c?.iso_2?.toLowerCase()
			if (!iso || byCode.has(iso)) continue
			byCode.set(iso, { code: iso, name: c?.display_name ?? iso.toUpperCase() })
		}
	}
	return [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name))
}
