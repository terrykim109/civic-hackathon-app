import { describe, expect, it } from 'vitest'
import { pickPlaceLabel, type PlaceCandidate } from './placeLabel'

describe('pickPlaceLabel', () => {
  it('prefers neighbourhood over city and composes "local · city"', () => {
    const candidates: PlaceCandidate[] = [
      { name: 'Toronto', className: 'city', distanceSq: 0.01 },
      { name: 'Clairlea-Birchmount', className: 'neighbourhood', distanceSq: 0.0001 },
    ]
    expect(pickPlaceLabel(candidates)).toBe('Clairlea-Birchmount · Toronto')
  })

  it('returns the fallback when there are no candidates', () => {
    expect(pickPlaceLabel([], 'Home label')).toBe('Home label')
  })

  it('uses suburb when neighbourhood is absent', () => {
    const candidates: PlaceCandidate[] = [
      { name: 'Scarborough', className: 'suburb', distanceSq: 0.001 },
      { name: 'Toronto', className: 'city', distanceSq: 0.01 },
    ]
    expect(pickPlaceLabel(candidates)).toBe('Scarborough · Toronto')
  })
})
