import { describe, expect, it, vi } from 'vitest'
import type { CivicSupabaseClient } from '../supabase/client'
import type { MunicipalRecord } from '../../types/municipalRecord'
import { saveProposal } from './proposalApi'

function sampleRecord(): MunicipalRecord {
  return {
    id: 'test-proposal-1',
    title: 'Test proposal',
    description: 'A description',
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
      coordinates: [-79.38, 43.65],
      precision: 'approximate',
      locationRole: 'official_representative_point_not_impact_boundary',
      note: 'Representative point',
    },
    sources: [
      {
        label: 'Notice',
        href: 'https://example.com/notice',
        verifiedOn: '2026-11-14',
      },
    ],
    evidence: [],
    relatedProcesses: [],
    metrics: [],
    dataOrigin: 'curated',
  }
}

function mockClient(handlers: {
  maybeSingleExisting?: unknown
  insertError?: { message: string } | null
  updateError?: { message: string } | null
}) {
  const insertSingle = vi.fn().mockResolvedValue({
    data: {
      ...handlers,
      id: 'test-proposal-1',
      publication_status: 'draft',
      title: 'Test proposal',
      description: 'A description',
      municipality: 'Toronto',
      ward_id: null,
      category_raw: 'housing',
      category_kind: 'housing',
      record_type: 'notice',
      project_status: 'pending',
      gis_source_status: null,
      decision_status: 'pending',
      decision_stage: 'proposal',
      participation_availability: 'unknown',
      can_participate_now: null,
      participation_deadline: null,
      participation_method: null,
      participation_url: null,
      location_lng: -79.38,
      location_lat: 43.65,
      location: sampleRecord().location,
      participation_options: [],
      events: [],
      potential_impacts: [],
      uncertainties: [],
      sources: sampleRecord().sources,
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
      record: sampleRecord(),
      created_at: '2026-11-14T00:00:00.000Z',
      updated_at: '2026-11-14T00:00:00.000Z',
      created_by: 'user-1',
      updated_by: 'user-1',
    },
    error: handlers.insertError ?? null,
  })

  const existingMaybeSingle = vi.fn().mockResolvedValue({
    data: handlers.maybeSingleExisting ?? null,
    error: null,
  })

  const from = vi.fn().mockImplementation(() => {
    const query: Record<string, unknown> = {}
    query.select = vi.fn().mockReturnValue(query)
    query.eq = vi.fn().mockReturnValue(query)
    query.maybeSingle = existingMaybeSingle
    query.insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: insertSingle,
      }),
    })
    query.update = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: handlers.updateError ?? { message: 'update failed' },
          }),
        }),
      }),
    })
    query.order = vi.fn().mockResolvedValue({ data: [], error: null })
    return query
  })

  return { from } as unknown as CivicSupabaseClient
}

describe('saveProposal', () => {
  it('blocks invalid payloads before touching Supabase', async () => {
    const client = mockClient({})
    const record = sampleRecord()
    record.title = ''
    const result = await saveProposal(client, record, 'draft', 'user-1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/Title/i)
    expect(client.from).not.toHaveBeenCalled()
  })

  it('inserts a new draft through the municipal_records table', async () => {
    const client = mockClient({ maybeSingleExisting: null })
    const result = await saveProposal(
      client,
      sampleRecord(),
      'draft',
      'user-1',
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.publicationStatus).toBe('draft')
      expect(result.data.record.id).toBe('test-proposal-1')
    }
  })

  it('surfaces unauthorized update failures from Supabase/RLS', async () => {
    const client = mockClient({
      maybeSingleExisting: { id: 'test-proposal-1', created_by: 'user-1' },
      updateError: { message: 'new row violates row-level security policy' },
    })
    const result = await saveProposal(
      client,
      sampleRecord(),
      'published',
      'user-1',
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/row-level security/i)
  })

  it('rejects createOnly saves when the record id already exists', async () => {
    const client = mockClient({
      maybeSingleExisting: { id: 'test-proposal-1', created_by: 'other' },
    })
    const result = await saveProposal(
      client,
      sampleRecord(),
      'draft',
      'user-1',
      { createOnly: true },
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/already exists/i)
  })
})
