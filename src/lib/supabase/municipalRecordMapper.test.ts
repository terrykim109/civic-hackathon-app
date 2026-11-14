import { describe, expect, it } from 'vitest'
import type { MunicipalRecord } from '../../types/municipalRecord'
import {
  municipalRecordToRow,
  rowToMunicipalRecord,
} from './municipalRecordMapper'
import type { MunicipalRecordRow } from './types'

const sample: MunicipalRecord = {
  id: 'toronto-notice-8007-rental-demolition',
  title: 'Kennedy–Danforth: rental demolition proposal',
  description: 'Example description',
  municipality: 'Toronto',
  wardId: '20',
  categoryRaw: 'rental_housing',
  categoryKind: 'housing',
  recordType: 'public_meeting_notice',
  projectStatus: 'public_meeting_scheduled',
  gisSourceStatus: null,
  decisionStatus: 'pending',
  decisionStage: 'committee_review',
  participationAvailability: 'open',
  canParticipateNow: true,
  participationDeadline: '2026-11-16',
  participationMethod: 'public_meeting',
  participationUrl: 'https://example.com',
  participationOptions: [
    {
      method: 'public_meeting',
      availability: 'open',
      deadline: '2026-11-16',
    },
  ],
  events: [{ type: 'public_meeting', date: '2026-11-16' }],
  potentialImpacts: [{ text: 'Loss of rental units', kind: 'source_stated' }],
  uncertainties: ['Final unit mix may change'],
  location: {
    coordinates: [-79.26078934, 43.715763632],
    precision: 'approximate',
    locationRole: 'official_representative_point_not_impact_boundary',
    affectedArea: 'Kennedy & Danforth',
    note: 'Representative point',
  },
  sources: [
    {
      label: 'Notice',
      href: 'https://example.com/notice',
      verifiedOn: '2026-11-13',
    },
  ],
  evidence: [],
  dataConfidence: { facts: 'medium' },
  lastVerified: '2026-11-13',
  verificationMethod: 'manual',
  officialSourceUrl: 'https://example.com/notice',
  relatedProcesses: [],
  metrics: [{ label: 'Units', value: '8' }],
  dataOrigin: 'curated',
}

describe('municipalRecordToRow / rowToMunicipalRecord', () => {
  it('preserves the canonical MunicipalRecord in JSONB and mirrors scalars', () => {
    const row = municipalRecordToRow(sample, 'draft')

    expect(row.publication_status).toBe('draft')
    expect(row.id).toBe(sample.id)
    expect(row.title).toBe(sample.title)
    expect(row.location_lng).toBe(sample.location.coordinates[0])
    expect(row.location_lat).toBe(sample.location.coordinates[1])
    expect(row.participation_availability).toBe('open')
    expect(row.can_participate_now).toBe(true)
    expect(row.record).toEqual(sample)
    expect(row.record.id).toBe(row.id)
  })

  it('round-trips through the record JSON document', () => {
    const partial = municipalRecordToRow(sample, 'published')
    const row: MunicipalRecordRow = {
      ...partial,
      created_at: '2026-11-14T00:00:00.000Z',
      updated_at: '2026-11-14T00:00:00.000Z',
      created_by: null,
      updated_by: null,
    }

    expect(rowToMunicipalRecord(row)).toEqual(sample)
    expect(row.publication_status).toBe('published')
  })

  it('keeps publication_status independent of decisionStatus', () => {
    const draft = municipalRecordToRow(sample, 'draft')
    const published = municipalRecordToRow(sample, 'published')
    expect(draft.decision_status).toBe('pending')
    expect(published.decision_status).toBe('pending')
    expect(draft.publication_status).toBe('draft')
    expect(published.publication_status).toBe('published')
  })
})
