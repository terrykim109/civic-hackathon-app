import { describe, expect, it } from 'vitest'
import type { MunicipalRecord } from '../../types/municipalRecord'
import { adaptPublishedMunicipalRow } from './adaptPublishedRecord'

function publishedRow(overrides: Record<string, unknown> = {}) {
  const record: MunicipalRecord = {
    id: 'admin-published-1',
    title: 'Admin published proposal',
    description: 'Created in admin',
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
      coordinates: [-79.4, 43.7],
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

  return {
    id: record.id,
    publication_status: 'published',
    title: record.title,
    description: record.description,
    municipality: record.municipality,
    ward_id: null,
    category_raw: record.categoryRaw,
    category_kind: record.categoryKind,
    record_type: record.recordType,
    project_status: record.projectStatus,
    gis_source_status: null,
    decision_status: record.decisionStatus,
    decision_stage: record.decisionStage,
    participation_availability: record.participationAvailability,
    can_participate_now: null,
    participation_deadline: null,
    participation_method: null,
    participation_url: null,
    location_lng: -79.4,
    location_lat: 43.7,
    location: record.location,
    participation_options: [],
    events: [],
    potential_impacts: [],
    uncertainties: [],
    sources: [],
    evidence: [],
    data_confidence: null,
    related_processes: [],
    metrics: [],
    last_verified: null,
    verification_method: null,
    official_source_url: null,
    geometry_source_url: null,
    geometry_source_record: null,
    gis_project_name: null,
    decision_body: null,
    agenda_item_id: null,
    published_date: null,
    decision_date: null,
    source_modified_date: null,
    source_feature_id: null,
    data_origin: 'curated',
    record,
    created_at: '2026-11-14T00:00:00.000Z',
    updated_at: '2026-11-14T00:00:00.000Z',
    created_by: null,
    updated_by: null,
    ...overrides,
  }
}

describe('adaptPublishedMunicipalRow', () => {
  it('accepts published rows with valid MunicipalRecord payloads', () => {
    const adapted = adaptPublishedMunicipalRow(publishedRow())
    expect(adapted.record?.id).toBe('admin-published-1')
    expect(adapted.skippedReason).toBeNull()
  })

  it('rejects drafts and archived rows even if returned by the API', () => {
    expect(
      adaptPublishedMunicipalRow(publishedRow({ publication_status: 'draft' }))
        .record,
    ).toBeNull()
    expect(
      adaptPublishedMunicipalRow(
        publishedRow({ publication_status: 'archived' }),
      ).record,
    ).toBeNull()
  })

  it('rejects malformed coordinates and missing titles', () => {
    expect(
      adaptPublishedMunicipalRow(
        publishedRow({ location_lng: 'nope', location_lat: 43.7 }),
      ).record,
    ).toBeNull()

    expect(
      adaptPublishedMunicipalRow(
        publishedRow({
          title: '',
          record: {
            ...publishedRow().record,
            title: '',
          },
        }),
      ).record,
    ).toBeNull()
  })
})
