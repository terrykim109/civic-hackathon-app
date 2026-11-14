import { describe, expect, it } from 'vitest'
import type { MunicipalRecord } from '../../types/municipalRecord'
import { findNearbyProposals } from './findNearbyProposals'
import { NEARBY_RADIUS_DEFAULT_M } from './nearbyRadius'

function record(
  id: string,
  lng: number,
  lat: number,
  title = id,
): MunicipalRecord {
  return {
    id,
    title,
    description: 'Test',
    municipality: 'Toronto',
    categoryRaw: 'housing',
    categoryKind: 'housing',
    recordType: 'notice',
    projectStatus: 'pending',
    gisSourceStatus: null,
    decisionStatus: 'pending',
    decisionStage: 'proposal',
    participationAvailability: 'unknown',
    canParticipateNow: null,
    participationOptions: [],
    events: [],
    potentialImpacts: [],
    uncertainties: [],
    location: {
      coordinates: [lng, lat],
      precision: 'approximate',
      locationRole: 'official_representative_point_not_impact_boundary',
      note: 'Representative point',
    },
    sources: [],
    evidence: [],
    relatedProcesses: [],
    metrics: [],
    dataOrigin: 'curated',
  }
}

describe('findNearbyProposals', () => {
  const origin: [number, number] = [-79.38, 43.65]

  it('defaults to filtering within 3 km and sorts nearest first', () => {
    const near = record('near', -79.381, 43.651, 'Near')
    const mid = record('mid', -79.39, 43.66, 'Mid')
    const far = record('far', -79.5, 43.8, 'Far')

    const results = findNearbyProposals(
      origin,
      [far, mid, near],
      NEARBY_RADIUS_DEFAULT_M,
    )

    expect(results.map((item) => item.record.id)).toEqual(['near', 'mid'])
    expect(results[0]!.distanceMeters).toBeLessThan(results[1]!.distanceMeters)
  })

  it('includes the exact radius boundary and updates immediately with radius', () => {
    // ~1 km east of origin
    const oneKm = record('one-km', -79.3675, 43.65)
    const at500 = findNearbyProposals(origin, [oneKm], 500)
    const at1500 = findNearbyProposals(origin, [oneKm], 1500)

    expect(at500).toHaveLength(0)
    expect(at1500).toHaveLength(1)
    expect(at1500[0]!.distanceMeters).toBeLessThanOrEqual(1500)
  })

  it('deduplicates by id and skips invalid coordinates', () => {
    const good = record('dup', -79.381, 43.651, 'First')
    const duplicate = record('dup', -79.382, 43.652, 'Second')
    const invalid = record('bad', Number.NaN, 43.65)

    const results = findNearbyProposals(
      origin,
      [good, duplicate, invalid],
      5_000,
    )
    expect(results).toHaveLength(1)
    expect(results[0]!.record.title).toBe('First')
  })

  it('returns empty for invalid origins without throwing', () => {
    expect(
      findNearbyProposals([Number.NaN, 43] as [number, number], [record('a', -79.38, 43.65)], 3000),
    ).toEqual([])
    expect(findNearbyProposals(null, [record('a', -79.38, 43.65)], 3000)).toEqual(
      [],
    )
  })
})
