import { describe, expect, it } from 'vitest'
import type { MunicipalRecord } from '../../types/municipalRecord'
import {
  buildProposalBrief,
  nextActionLabel,
  nextStageId,
} from './proposalStages'

function baseRecord(overrides: Partial<MunicipalRecord> = {}): MunicipalRecord {
  return {
    id: 'test-record',
    title: 'Sample proposal',
    description: 'A proposed change documented in the source notice.',
    municipality: 'Toronto',
    categoryRaw: 'transit',
    categoryKind: 'transit',
    recordType: 'public_meeting_notice',
    projectStatus: 'public_meeting_scheduled',
    gisSourceStatus: null,
    decisionStatus: 'pending',
    decisionStage: 'public_consultation',
    participationAvailability: 'open',
    canParticipateNow: true,
    participationDeadline: '2026-11-19',
    participationOptions: [],
    events: [],
    potentialImpacts: [
      { text: 'Lanes would be reduced during construction.', kind: 'source_stated' },
    ],
    uncertainties: ['Funding confirmation is incomplete.'],
    location: {
      coordinates: [-79.26, 43.71],
      precision: 'approximate',
      locationRole: 'official_representative_point_not_impact_boundary',
      affectedArea: 'Kennedy Road corridor',
      note: 'Representative point — not a surveyed boundary.',
    },
    sources: [
      {
        label: 'City notice',
        href: 'https://secure.toronto.ca/nm/api/individual/notice/8007.do',
        verifiedOn: '2026-11-13',
      },
    ],
    evidence: [],
    relatedProcesses: [],
    metrics: [{ label: 'Stops', value: '24' }],
    lastVerified: '2026-11-13',
    dataOrigin: 'curated',
    ...overrides,
  }
}

describe('buildProposalBrief', () => {
  it('projects available fields without inventing missing sections', () => {
    const brief = buildProposalBrief(
      baseRecord(),
      new Date('2026-11-14T12:00:00.000Z'),
    )
    expect(brief.title).toBe('Sample proposal')
    expect(brief.breadcrumb).toBe('Transit / Toronto')
    expect(brief.proposed).toMatch(/proposed change/i)
    expect(brief.knownImpacts).toEqual([
      'Lanes would be reduced during construction.',
    ])
    expect(brief.uncertainItems).toEqual(['Funding confirmation is incomplete.'])
    expect(brief.deadlineBadge?.tone).toBe('approaching')
    expect(brief.deadlineBadge?.label).toMatch(/5d left|approaching/i)
    expect(brief.officialRecords[0]?.href).toContain('toronto.ca')
    expect(brief.metrics[0]?.value).toBe('24')
  })

  it('omits invented impacts and deadline badges when data is absent', () => {
    const brief = buildProposalBrief(
      baseRecord({
        description: '   ',
        potentialImpacts: [],
        uncertainties: [],
        participationAvailability: 'unknown',
        canParticipateNow: null,
        participationDeadline: null,
        sources: [],
        metrics: [],
        lastVerified: null,
      }),
    )
    expect(brief.proposed).toBeNull()
    expect(brief.knownImpacts).toEqual([])
    expect(brief.uncertainItems).toEqual([])
    expect(brief.deadlineBadge).toBeNull()
    expect(brief.officialRecords).toEqual([])
    expect(brief.updatedLabel).toBeNull()
  })

  it('does not claim approaching deadlines without a real deadline date', () => {
    const brief = buildProposalBrief(
      baseRecord({
        participationDeadline: null,
      }),
      new Date('2026-11-14T12:00:00.000Z'),
    )
    expect(brief.deadlineBadge?.tone).toBe('open')
    expect(brief.deadlineBadge?.label).not.toMatch(/\d+d left/)
  })
})

describe('stage navigation helpers', () => {
  it('walks forward through stages and labels next actions', () => {
    expect(nextStageId('proposal')).toBe('impact')
    expect(nextStageId('records')).toBeNull()
    expect(nextActionLabel('proposal')).toMatch(/affect you/i)
    expect(nextActionLabel('records')).toBeNull()
  })
})
