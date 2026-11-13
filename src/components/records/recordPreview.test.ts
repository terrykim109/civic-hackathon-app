import { describe, expect, it } from 'vitest'
import type { MunicipalRecord } from '../../types/municipalRecord'
import {
  buildRecordPreviewSections,
  formatDisplayDate,
  humanizeToken,
} from './recordPreview'

function baseRecord(
  overrides: Partial<MunicipalRecord> = {},
): MunicipalRecord {
  return {
    id: 'test-record',
    title: 'Sample title',
    description: 'Plain language summary.',
    municipality: 'Example City',
    categoryRaw: 'park_design',
    categoryKind: 'parks',
    recordType: 'project_consultation',
    projectStatus: 'design_consultation',
    gisSourceStatus: null,
    decisionStatus: 'unknown',
    decisionStage: 'unknown',
    participationAvailability: 'open',
    canParticipateNow: true,
    participationDeadline: '2026-11-16',
    participationOptions: [],
    events: [],
    potentialImpacts: [
      {
        text: 'Stated impact',
        kind: 'source_stated',
      },
      {
        text: 'Other impact',
        kind: 'inferred_elsewhere',
      },
    ],
    uncertainties: ['Timing may change.'],
    location: {
      coordinates: [-79.4, 43.7],
      precision: 'approximate',
      locationRole: 'official_representative_point_not_impact_boundary',
      affectedArea: 'Example Park',
      note: 'Representative point',
    },
    sources: [],
    evidence: [],
    relatedProcesses: [],
    metrics: [],
    lastVerified: '2026-11-13',
    officialSourceUrl: 'https://example.com/official',
    dataOrigin: 'geojson',
    ...overrides,
  }
}

describe('recordPreview helpers', () => {
  it('humanizes tokens for display', () => {
    expect(humanizeToken('park_design')).toBe('Park Design')
    expect(humanizeToken('public_meeting_notice')).toBe('Public Meeting Notice')
  })

  it('formats dates without inventing values', () => {
    expect(formatDisplayDate(null)).toBeNull()
    expect(formatDisplayDate('2026-11-16')).toBe('2026-11-16')
    expect(formatDisplayDate('2026-11-24T12:00:00-05:00')).toContain('2026-11-24')
  })

  it('builds sections from the selected record and hides unknown decision status', () => {
    const sections = buildRecordPreviewSections(baseRecord())
    expect(sections.categoryLabel).toBe('Park Design')
    expect(sections.recordTypeLabel).toBe('Project Consultation')
    expect(sections.decisionStatusLabel).toBeNull()
    expect(sections.projectStatusLabel).toBe('Design Consultation')
    expect(sections.sourceStatedImpacts).toEqual(['Stated impact'])
    expect(sections.otherImpacts).toEqual(['Other impact'])
    expect(sections.participationLabel).toMatch(/Open/i)
    expect(sections.officialSourceUrl).toBe('https://example.com/official')
  })

  it('does not invent missing affected area or summary', () => {
    const sections = buildRecordPreviewSections(
      baseRecord({
        description: '   ',
        location: {
          coordinates: [-79.4, 43.7],
          precision: 'approximate',
          locationRole: 'representative',
          affectedArea: null,
          note: 'n/a',
        },
        potentialImpacts: [],
        uncertainties: [],
        officialSourceUrl: null,
        sources: [],
      }),
    )
    expect(sections.summary).toBeNull()
    expect(sections.affectedArea).toBeNull()
    expect(sections.sourceStatedImpacts).toEqual([])
    expect(sections.officialSourceUrl).toBeNull()
  })

  it('updates projection when a different record is supplied', () => {
    const first = buildRecordPreviewSections(baseRecord({ title: 'First' }))
    const second = buildRecordPreviewSections(
      baseRecord({
        title: 'Second',
        categoryRaw: 'rental_housing',
        participationAvailability: 'not_open',
      }),
    )
    expect(first.title).toBe('First')
    expect(second.title).toBe('Second')
    expect(second.categoryLabel).toBe('Rental Housing')
    expect(second.participationLabel).toMatch(/Not open/i)
  })
})
