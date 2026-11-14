import { describe, expect, it } from 'vitest'
import { haversineDistanceMeters, isValidLngLat } from './haversine'

describe('isValidLngLat', () => {
  it('accepts finite GeoJSON lon/lat pairs', () => {
    expect(isValidLngLat([-79.38, 43.65])).toBe(true)
  })

  it('rejects missing, non-finite, and out-of-range values', () => {
    expect(isValidLngLat(null)).toBe(false)
    expect(isValidLngLat(undefined)).toBe(false)
    expect(isValidLngLat([Number.NaN, 43])).toBe(false)
    expect(isValidLngLat([-200, 43])).toBe(false)
    expect(isValidLngLat([-79, 100])).toBe(false)
  })
})

describe('haversineDistanceMeters', () => {
  it('returns ~0 for identical points', () => {
    const point: [number, number] = [-79.3832, 43.6532]
    expect(haversineDistanceMeters(point, point)).toBeLessThan(0.01)
  })

  it('computes a known Toronto short hop in metres', () => {
    // ~1 km east-west near downtown Toronto (approx).
    const a: [number, number] = [-79.39, 43.65]
    const b: [number, number] = [-79.3775, 43.65]
    const distance = haversineDistanceMeters(a, b)
    expect(distance).toBeGreaterThan(900)
    expect(distance).toBeLessThan(1100)
  })

  it('is symmetric and uses longitude-first ordering', () => {
    const a: [number, number] = [-79.26, 43.71]
    const b: [number, number] = [-79.27, 43.72]
    expect(haversineDistanceMeters(a, b)).toBeCloseTo(
      haversineDistanceMeters(b, a),
      6,
    )
  })

  it('returns NaN for invalid coordinates', () => {
    expect(haversineDistanceMeters([-79, 43], [Number.NaN, 43])).toBeNaN()
  })
})
