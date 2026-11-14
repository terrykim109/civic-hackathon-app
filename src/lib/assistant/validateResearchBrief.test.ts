import { describe, expect, it } from 'vitest'
import {
  fallbackResearchBrief,
  validateResearchBrief,
} from './validateResearchBrief'

describe('validateResearchBrief', () => {
  it('keeps supported sections and grounded citations', () => {
    const brief = validateResearchBrief(
      {
        title: 'Kennedy–Danforth research brief',
        focus: 'Rental demolition',
        summaryNote: null,
        sections: [
          {
            id: 'overview',
            findings: [
              {
                text: 'A rental housing demolition application is recorded for Danforth Road.',
                kind: 'documented_fact',
                citations: [
                  {
                    label: 'City notice',
                    href: 'https://secure.toronto.ca/notice',
                    passage: 'Rental Housing Demolition application…',
                    recordId: 'r1',
                  },
                ],
              },
            ],
          },
          {
            id: 'potentialImpacts',
            findings: [
              {
                text: 'Nearby residents may want to review replacement-rental conditions.',
                kind: 'potential_impact',
                citations: [],
              },
            ],
          },
          {
            id: 'emptyShouldDrop',
            findings: [{ text: 'Ignored bad section', kind: 'documented_fact' }],
          },
        ],
      },
      {
        allowedCitationHrefs: ['https://secure.toronto.ca/notice'],
        evidenceStatus: 'retrieved',
        recordIds: ['r1'],
      },
    )

    expect(brief).not.toBeNull()
    expect(brief!.sections.map((s) => s.id)).toEqual([
      'overview',
      'potentialImpacts',
    ])
    expect(brief!.sections[0]!.findings[0]!.citations[0]!.href).toBe(
      'https://secure.toronto.ca/notice',
    )
    expect(brief!.sections[1]!.findings[0]!.kind).toBe('potential_impact')
  })

  it('drops invented citations and demotes unsupported documented facts', () => {
    const brief = validateResearchBrief(
      {
        title: 'Brief',
        sections: [
          {
            id: 'documentedFacts',
            findings: [
              {
                text: 'Council approved a secret by-law yesterday.',
                kind: 'documented_fact',
                citations: [
                  {
                    label: 'Fake',
                    href: 'https://evil.example/fake',
                    passage: 'Invented',
                  },
                ],
              },
              {
                text: 'The notice schedules a public meeting.',
                kind: 'documented_fact',
                citations: [
                  {
                    label: 'Notice',
                    href: 'https://www.toronto.ca/notice',
                    passage: 'Public meeting scheduled',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        allowedCitationHrefs: ['https://www.toronto.ca/notice'],
        evidenceStatus: 'partial',
      },
    )

    expect(brief).not.toBeNull()
    const findings = brief!.sections[0]!.findings
    expect(findings[0]!.kind).toBe('uncertainty')
    expect(findings[0]!.citations).toEqual([])
    expect(findings[1]!.kind).toBe('documented_fact')
    expect(findings[1]!.citations).toHaveLength(1)
  })

  it('returns null for empty or malformed briefs', () => {
    expect(validateResearchBrief(null)).toBeNull()
    expect(validateResearchBrief({ title: 'x', sections: [] })).toBeNull()
    expect(
      validateResearchBrief({
        title: 'x',
        sections: [{ id: 'overview', findings: [{ text: '   ' }] }],
      }),
    ).toBeNull()
  })

  it('builds a fallback uncertainty brief when generation fails', () => {
    const brief = fallbackResearchBrief({
      areaLabel: 'Ward 20',
      evidenceStatus: 'unavailable',
      note: 'Official documents could not be retrieved.',
    })
    expect(brief.sections).toHaveLength(1)
    expect(brief.sections[0]!.id).toBe('uncertainties')
    expect(brief.evidenceStatus).toBe('unavailable')
  })
})
