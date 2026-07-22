import { describe, it, expect } from 'vitest'
import { mergeFields } from './merge-fields'

const BASE = ['*variants.calculated_price']

describe('mergeFields', () => {
  it('returns just the baseline when no consumer fields', () => {
    expect(mergeFields(BASE)).toBe('*variants.calculated_price')
    expect(mergeFields(BASE, undefined)).toBe('*variants.calculated_price')
    expect(mergeFields(BASE, '')).toBe('*variants.calculated_price')
  })

  it('appends a consumer addition while keeping the baseline', () => {
    expect(mergeFields(BASE, '+variants.inventory_quantity')).toBe(
      '*variants.calculated_price,+variants.inventory_quantity'
    )
  })

  it('honors an explicit strip of a baseline field (drops the baseline token)', () => {
    expect(mergeFields(BASE, '-variants.calculated_price')).toBe('-variants.calculated_price')
  })

  it('does not duplicate when the consumer re-adds the baseline field', () => {
    expect(mergeFields(BASE, '*variants.calculated_price')).toBe('*variants.calculated_price')
    expect(mergeFields(BASE, '+variants.calculated_price')).toBe('+variants.calculated_price')
  })

  it('keeps the baseline alongside unrelated consumer fields', () => {
    expect(mergeFields(BASE, 'id,title')).toBe('*variants.calculated_price,id,title')
  })

  it('ignores empty/whitespace tokens and trims', () => {
    expect(mergeFields(BASE, ' +variants.inventory_quantity , , ')).toBe(
      '*variants.calculated_price,+variants.inventory_quantity'
    )
  })

  it('handles multiple baseline tokens independently', () => {
    const base = ['*variants.calculated_price', '+categories']
    expect(mergeFields(base, '-categories')).toBe('*variants.calculated_price,-categories')
    expect(mergeFields(base, '+variants.inventory_quantity')).toBe(
      '*variants.calculated_price,+categories,+variants.inventory_quantity'
    )
  })
})
