import { describe, expect, it } from 'vitest'
import { getWardOfficialMeta } from './wardOfficialMeta'

describe('getWardOfficialMeta', () => {
  it('returns Open Data labels for known ward ids', () => {
    const ward7 = getWardOfficialMeta('7')
    expect(ward7?.name).toBe('Humber River-Black Creek')
    expect(ward7?.description).toContain('(7)')
    expect(ward7?.areaShortCode).toBe('07')
  })

  it('returns null for unknown wards', () => {
    expect(getWardOfficialMeta('999')).toBeNull()
  })
})
