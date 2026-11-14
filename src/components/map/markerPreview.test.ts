import { describe, expect, it } from 'vitest'
import type { MunicipalRecord } from '../../types/municipalRecord'
import { buildMarkerPreview } from './markerPreview'

function baseRecord(overrides: Partial<MunicipalRecord> = {}): MunicipalRecord {
  return {
    id: 'test-record',
    title: 'Kennedy–Danforth rental demolition',
    description: 'Source description',
    municipality: 'Toronto',
    categoryRaw: 'rental_housing',
    categoryKind: 'housing',
    recordType: 'public_meeting_notice',
    projectStatus: 'public_meeting_scheduled',
    gisSourceStatus: null,
    decisionStatus: 'pending',
    decisionStage: 'public_consultation',
    participationAvailability: 'open',
    canParticipateNow: true,
    participationOptions: [],
    events: [],
    potentialImpacts: [],
    uncertainties: [],
    location: {
      coordinates: [-79.26, 43.71],
      precision: 'approximate',
      locationRole: 'official_representative_point_not_impact_boundary',
      note: '',
    },
    sources: [],
    evidence: [],
    relatedProcesses: [],
    metrics: [],
    lastVerified: '2026-11-13',
    dataOrigin: 'curated',
    ...overrides,
  }
}

describe('buildMarkerPreview', () => {
  it('returns title, humanized category, and humanized status from the record', () => {
    expect(buildMarkerPreview(baseRecord())).toEqual({
      title: 'Kennedy–Danforth rental demolition',
      category: 'Rental Housing',
      status: 'Public Meeting Scheduled',
    })
  })

  it('omits category and status when blank or unknown', () => {
    expect(
      buildMarkerPreview(
        baseRecord({
          categoryRaw: '  ',
          projectStatus: 'unknown',
        }),
      ),
    ).toEqual({
      title: 'Kennedy–Danforth rental demolition',
      category: null,
      status: null,
    })
  })
})
