import { describe, expect, it } from 'vitest'
import { listParams } from './list-params'

describe('listParams', () => {
	it('returns an empty object when nothing is set', () => {
		expect(listParams({})).toEqual({})
	})

	it('stringifies numeric limit and offset', () => {
		expect(listParams({ limit: 12, offset: 24 })).toEqual({ limit: '12', offset: '24' })
	})

	it('keeps offset 0 (does not drop a falsy-but-valid value)', () => {
		expect(listParams({ limit: 12, offset: 0 })).toEqual({ limit: '12', offset: '0' })
	})

	it('passes string filters through', () => {
		expect(listParams({ order: '-created_at', q: 'shirt' })).toEqual({ order: '-created_at', q: 'shirt' })
	})

	it('passes array filters through as arrays', () => {
		expect(listParams({ category_id: ['cat_1', 'cat_2'] })).toEqual({ category_id: ['cat_1', 'cat_2'] })
	})

	it('passes single-string relation filters through', () => {
		expect(listParams({ category_id: 'cat_1', collection_id: 'col_1', type_id: 'ptyp_1' })).toEqual({
			category_id: 'cat_1',
			collection_id: 'col_1',
			type_id: 'ptyp_1'
		})
	})

	it('includes parent_category_id when set', () => {
		expect(listParams({ parent_category_id: 'pcat_1' })).toEqual({ parent_category_id: 'pcat_1' })
	})

	it('drops empty strings and negative numbers', () => {
		expect(listParams({ q: '', order: '', limit: -5, offset: -1 })).toEqual({})
	})
})
