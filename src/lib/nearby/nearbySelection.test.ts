import { describe, expect, it } from 'vitest'
import type { MunicipalRecord } from '../../types/municipalRecord'
import { nearbySelectionCenter } from './nearbySelection'

function sample(overrides: Partial<MunicipalRecord> = {}): MunicipalRecord {
  return {
    id: 'rec-1',
    title: 'Test',
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
      coordinates: [-79.26, 43.71],
      precision: 'approximate',
      locationRole: 'official_representative_point_not_impact_boundary',
      note: 'Representative point',
    },
    sources: [],
    evidence: [],
    relatedProcesses: [],
    metrics: [],
    dataOrigin: 'curated',
    ...overrides,
  }
}

describe('nearbySelectionCenter', () => {
  it('returns the record coordinates for map fly + detail selection', () => {
    expect(nearbySelectionCenter(sample())).toEqual([-79.26, 43.71])
  })

  it('returns null when coordinates are invalid so selection can still open the panel', () => {
    const broken = sample({
      location: {
        coordinates: [Number.NaN, 43] as [number, number],
        precision: 'unknown',
        locationRole: 'unknown',
        note: 'Missing',
      },
    })
    expect(nearbySelectionCenter(broken)).toBeNull()
  })
})
