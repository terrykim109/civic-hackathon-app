import { describe, expect, it, vi } from 'vitest'
import type { CivicSupabaseClient } from '../supabase/client'
import type { MunicipalRecord } from '../../types/municipalRecord'
import {
  fetchPublishedMunicipalRecords,
  mergeStaticAndPublishedRecords,
} from './fetchPublishedRecords'

const staticRecord: MunicipalRecord = {
  id: 'static-1',
  title: 'Static',
  description: 'Bundled',
  municipality: 'Toronto',
  categoryRaw: 'housing',
  categoryKind: 'housing',
  recordType: 'notice',
  projectStatus: 'pending',
  gisSourceStatus: null,
  decisionStatus: 'unknown',
  decisionStage: 'unknown',
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
  dataOrigin: 'geojson',
}

function publishedPayload(id: string, publicationStatus = 'published') {
  return {
    id,
    publication_status: publicationStatus,
    title: `Published ${id}`,
    description: 'From supabase',
    municipality: 'Toronto',
    ward_id: null,
    category_raw: 'parks',
    category_kind: 'parks',
    record_type: 'project',
    project_status: 'in_progress',
    gis_source_status: null,
    decision_status: 'pending',
    decision_stage: 'proposal',
    participation_availability: 'unknown',
    can_participate_now: null,
    participation_deadline: null,
    participation_method: null,
    participation_url: null,
    location_lng: -79.4,
    location_lat: 43.7,
    location: {
      coordinates: [-79.4, 43.7],
      precision: 'approximate',
      locationRole: 'official_representative_point_not_impact_boundary',
      note: 'Representative point',
    },
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
    record: {
      ...staticRecord,
      id,
      title: `Published ${id}`,
      description: 'From supabase',
      categoryRaw: 'parks',
      categoryKind: 'parks',
      recordType: 'project',
      projectStatus: 'in_progress',
      dataOrigin: 'curated',
      location: {
        coordinates: [-79.4, 43.7],
        precision: 'approximate',
        locationRole: 'official_representative_point_not_impact_boundary',
        note: 'Representative point',
      },
    },
    created_at: '2026-11-14T00:00:00.000Z',
    updated_at: '2026-11-14T00:00:00.000Z',
    created_by: null,
    updated_by: null,
  }
}

function mockClient(result: { data: unknown; error: { message: string } | null }) {
  const order = vi.fn().mockResolvedValue(result)
  const eq = vi.fn().mockReturnValue({ order })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })
  return { from, _eq: eq } as unknown as CivicSupabaseClient & {
    _eq: ReturnType<typeof vi.fn>
  }
}

describe('mergeStaticAndPublishedRecords', () => {
  it('keeps static records and adds only new published ids', () => {
    const publishedDuplicate: MunicipalRecord = {
      ...staticRecord,
      title: 'Should not replace static',
    }
    const publishedNew: MunicipalRecord = {
      ...staticRecord,
      id: 'published-2',
      title: 'New published',
    }

    const merged = mergeStaticAndPublishedRecords(
      [staticRecord],
      [publishedDuplicate, publishedNew],
    )

    expect(merged).toHaveLength(2)
    expect(merged.find((row) => row.id === 'static-1')?.title).toBe('Static')
    expect(merged.find((row) => row.id === 'published-2')?.title).toBe(
      'New published',
    )
  })
})

describe('fetchPublishedMunicipalRecords', () => {
  it('requests only published rows and adapts valid records', async () => {
    const client = mockClient({
      data: [
        publishedPayload('pub-1'),
        publishedPayload('draft-1', 'draft'),
        publishedPayload('pub-1'),
      ],
      error: null,
    })

    const result = await fetchPublishedMunicipalRecords(client)
    expect(client.from).toHaveBeenCalledWith('municipal_records')
    expect(client._eq).toHaveBeenCalledWith('publication_status', 'published')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.records.map((row) => row.id)).toEqual(['pub-1'])
      expect(result.skippedCount).toBeGreaterThan(0)
    }
  })

  it('returns an explicit error on database failure (not a silent empty success)', async () => {
    const client = mockClient({
      data: null,
      error: { message: 'connection refused' },
    })
    const result = await fetchPublishedMunicipalRecords(client)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/connection refused/i)
      expect(result.records).toEqual([])
    }
  })
})
