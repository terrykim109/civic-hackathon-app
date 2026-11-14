import { describe, expect, it } from 'vitest'
import {
  formatNearbyDistance,
  formatNearbyRadiusLabel,
  NEARBY_RADIUS_DEFAULT_M,
  NEARBY_RADIUS_MAX_M,
  NEARBY_RADIUS_MIN_M,
  NEARBY_RADIUS_STEP_M,
  normalizeNearbyRadiusMeters,
} from './nearbyRadius'

describe('nearby radius contract', () => {
  it('defaults to 3 km with 500 m increments between 500 m and 5 km', () => {
    expect(NEARBY_RADIUS_MIN_M).toBe(500)
    expect(NEARBY_RADIUS_MAX_M).toBe(5_000)
    expect(NEARBY_RADIUS_DEFAULT_M).toBe(3_000)
    expect(NEARBY_RADIUS_STEP_M).toBe(500)
  })

  it('clamps and snaps slider values', () => {
    expect(normalizeNearbyRadiusMeters(0)).toBe(500)
    expect(normalizeNearbyRadiusMeters(9_999)).toBe(5_000)
    expect(normalizeNearbyRadiusMeters(1_240)).toBe(1_000)
    expect(normalizeNearbyRadiusMeters(1_260)).toBe(1_500)
    expect(normalizeNearbyRadiusMeters(Number.NaN)).toBe(3_000)
  })

  it('formats metres below 1 km and kilometres otherwise', () => {
    expect(formatNearbyDistance(499)).toBe('499 m')
    expect(formatNearbyDistance(999)).toBe('999 m')
    expect(formatNearbyDistance(1000)).toBe('1 km')
    expect(formatNearbyDistance(1500)).toBe('1.5 km')
    expect(formatNearbyRadiusLabel(NEARBY_RADIUS_DEFAULT_M)).toBe('3 km')
  })
})
