import { describe, it, expect } from 'vitest'
import { regionForCountry, countriesFromRegions } from './regions'

const REGIONS = [
	{ id: 'reg_na', countries: [
		{ iso_2: 'us', display_name: 'United States' },
		{ iso_2: 'ca', display_name: 'Canada' }
	] },
	{ id: 'reg_eu', countries: [
		{ iso_2: 'gb', display_name: 'United Kingdom' },
		{ iso_2: 'de', display_name: 'Germany' }
	] }
]

describe('regionForCountry', () => {
	it('finds the region whose countries include the code (case-insensitive)', () => {
		expect(regionForCountry(REGIONS, 'ca')?.id).toBe('reg_na')
		expect(regionForCountry(REGIONS, 'GB')?.id).toBe('reg_eu')
	})
	it('returns undefined for no match / empty / null', () => {
		expect(regionForCountry(REGIONS, 'jp')).toBeUndefined()
		expect(regionForCountry([], 'us')).toBeUndefined()
		expect(regionForCountry(null, 'us')).toBeUndefined()
	})
})

describe('countriesFromRegions', () => {
	it('flattens, dedupes by code, sorts by name, lower-cases codes', () => {
		expect(countriesFromRegions(REGIONS)).toEqual([
			{ code: 'ca', name: 'Canada' },
			{ code: 'de', name: 'Germany' },
			{ code: 'gb', name: 'United Kingdom' },
			{ code: 'us', name: 'United States' }
		])
	})
	it('falls back to upper-cased code when display_name is missing; handles null/empty', () => {
		expect(countriesFromRegions([{ countries: [{ iso_2: 'fr' }] }])).toEqual([{ code: 'fr', name: 'FR' }])
		expect(countriesFromRegions(null)).toEqual([])
		expect(countriesFromRegions([{ countries: null }])).toEqual([])
	})
	it('dedupes a country appearing in multiple regions', () => {
		const dup = [{ countries: [{ iso_2: 'us', display_name: 'United States' }] }, { countries: [{ iso_2: 'us', display_name: 'United States' }] }]
		expect(countriesFromRegions(dup)).toEqual([{ code: 'us', name: 'United States' }])
	})
})
