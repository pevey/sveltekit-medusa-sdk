import { describe, it, expect } from 'vitest'
import { pickDefaultRegionId } from './region'

describe('pickDefaultRegionId', () => {
  it('uses the configured id when set (regardless of regions)', () => {
    expect(pickDefaultRegionId('reg_cfg', [{ id: 'reg_a' }, { id: 'reg_b' }])).toBe('reg_cfg')
  })

  it('uses the only region when the backend has exactly one and none configured', () => {
    expect(pickDefaultRegionId(undefined, [{ id: 'reg_only' }])).toBe('reg_only')
  })

  it('returns undefined for multiple regions with no configured default', () => {
    expect(pickDefaultRegionId(undefined, [{ id: 'reg_a' }, { id: 'reg_b' }])).toBeUndefined()
  })

  it('returns undefined when there are no regions', () => {
    expect(pickDefaultRegionId(undefined, [])).toBeUndefined()
  })
})
