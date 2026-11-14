import { describe, expect, it } from 'vitest'
import {
  cellNoise,
  pruneExpired,
  pushTrailPoint,
  speedToIntensity,
  stepIntensity,
} from './cursorAuraMath'

describe('cursorAuraMath', () => {
  it('maps speed into a bounded intensity', () => {
    expect(speedToIntensity(0)).toBe(0)
    expect(speedToIntensity(700)).toBeCloseTo(0.5, 5)
    expect(speedToIntensity(10_000)).toBe(1)
  })

  it('decays idle intensity gradually and rises quickly when moving', () => {
    const rising = stepIntensity(0.1, 0.8, 1 / 60)
    expect(rising).toBeGreaterThan(0.1)
    expect(rising).toBeLessThan(0.8)

    const falling = stepIntensity(0.8, 0, 1 / 60)
    expect(falling).toBeLessThan(0.8)
    expect(falling).toBeGreaterThan(0.7)
  })

  it('caps trail length and prunes expired points', () => {
    let trail = pushTrailPoint([], { x: 1, y: 1, strength: 1, bornAt: 0 }, 3)
    trail = pushTrailPoint(trail, { x: 2, y: 2, strength: 1, bornAt: 1 }, 3)
    trail = pushTrailPoint(trail, { x: 3, y: 3, strength: 1, bornAt: 2 }, 3)
    trail = pushTrailPoint(trail, { x: 4, y: 4, strength: 1, bornAt: 3 }, 3)
    expect(trail).toHaveLength(3)
    expect(trail[0]?.x).toBe(2)

    expect(
      pruneExpired(
        [
          { x: 0, y: 0, strength: 1, bornAt: 0 },
          { x: 1, y: 1, strength: 1, bornAt: 900 },
        ],
        1000,
        500,
      ),
    ).toEqual([{ x: 1, y: 1, strength: 1, bornAt: 900 }])
  })

  it('returns stable noise in unit range', () => {
    const a = cellNoise(3, 7)
    const b = cellNoise(3, 7)
    expect(a).toBe(b)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(1)
  })
})
