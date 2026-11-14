import { describe, expect, it } from 'vitest'
import { isCanadianPostalCode, validateLocationQuery } from './validateQuery'

describe('validateLocationQuery', () => {
  it('rejects empty and symbol-only input', () => {
    expect(validateLocationQuery('').ok).toBe(false)
    expect(validateLocationQuery('   ').ok).toBe(false)
    expect(validateLocationQuery('???').ok).toBe(false)
  })

  it('requires at least 3 characters for place names', () => {
    expect(validateLocationQuery('ab').ok).toBe(false)
    expect(validateLocationQuery('abc').ok).toBe(true)
  })

  it('accepts Canadian postal codes with or without spaces', () => {
    const spaced = validateLocationQuery('m1k2p5')
    expect(spaced.ok).toBe(true)
    expect(spaced.looksLikePostalCode).toBe(true)
    expect(spaced.normalized).toBe('M1K 2P5')
    expect(isCanadianPostalCode('M1K 2P5')).toBe(true)
  })

  it('normalizes whitespace in addresses', () => {
    expect(validateLocationQuery('  411   Kennedy   Road  ').normalized).toBe(
      '411 Kennedy Road',
    )
  })
})
