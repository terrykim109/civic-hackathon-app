import { describe, expect, it } from 'vitest'
import {
  trimAssistantHistory,
  validateAssistantResponse,
} from './validateAssistantResponse'

describe('validateAssistantResponse', () => {
  it('accepts a well-formed structured turn with citations', () => {
    const result = validateAssistantResponse({
      message: 'Here is what the records show.',
      nextQuestion: 'What should we look at next?',
      options: ['Timelines', 'Participation', 'Something else'],
      researchFocus: 'Deadlines',
      sources: [{ label: 'City notice', href: 'https://toronto.ca/notice' }],
      citations: [
        {
          label: 'City notice',
          href: 'https://toronto.ca/notice',
          passage: 'A public meeting will consider the application.',
          recordId: 'r1',
        },
      ],
      evidenceStatus: 'retrieved',
      conversationComplete: false,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.message).toMatch(/records show/)
    expect(result.data.nextQuestion).toMatch(/look at next/)
    expect(result.data.options).toHaveLength(3)
    expect(result.data.sources).toEqual([
      { label: 'City notice', href: 'https://toronto.ca/notice' },
    ])
    expect(result.data.citations[0]?.passage).toMatch(/public meeting/i)
    expect(result.data.evidenceStatus).toBe('retrieved')
    expect(result.data.conversationComplete).toBe(false)
    expect(result.data.researchBrief).toBeNull()
    expect(result.data.language).toBe('en')
    expect(result.data.glossary).toEqual([])
    expect(result.data.detailedExplanation).toBeNull()
    expect(result.data.comparisonNote).toBeNull()
  })

  it('preserves multilingual metadata, glossary, and comparison limits', () => {
    const result = validateAssistantResponse(
      {
        message: 'Voici ce que montrent les dossiers.',
        nextQuestion: 'Que voulez-vous approfondir?',
        options: ['Processus d’approbation', 'Comparer les projets'],
        glossary: [
          {
            term: 'zoning by-law amendment',
            plainLanguage: 'A change to the rules about what can be built.',
          },
        ],
        detailedExplanation: 'Plus de détails sur les étapes municipales.',
        comparisonNote:
          'Not enough official evidence is available to compare these two proposals yet.',
        language: 'fr-CA',
        conversationComplete: false,
      },
      { language: 'fr' },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.language).toBe('fr')
    expect(result.data.glossary[0]?.term).toMatch(/zoning/i)
    expect(result.data.detailedExplanation).toMatch(/détails/i)
    expect(result.data.comparisonNote).toMatch(/Not enough official evidence/i)
  })

  it('validates an embedded research brief and rejects required missing briefs', () => {
    const withBrief = validateAssistantResponse({
      message: 'Here is your research brief.',
      nextQuestion: 'Which section should we dig into?',
      options: ['Documented facts', 'Uncertainties'],
      researchBrief: {
        title: 'Area brief',
        focus: 'Housing',
        sections: [
          {
            id: 'overview',
            findings: [
              {
                text: 'A municipal notice is associated with this area.',
                kind: 'documented_fact',
                recordId: 'r1',
                citations: [],
              },
            ],
          },
        ],
      },
      conversationComplete: false,
    }, {
      recordIds: ['r1'],
      evidenceStatus: 'partial',
      requireResearchBrief: true,
    })

    expect(withBrief.ok).toBe(true)
    if (!withBrief.ok) return
    expect(withBrief.data.researchBrief?.sections[0]?.id).toBe('overview')

    const missing = validateAssistantResponse(
      {
        message: 'No brief payload',
        conversationComplete: false,
      },
      { requireResearchBrief: true },
    )
    expect(missing.ok).toBe(false)
  })

  it('rejects empty or missing message payloads', () => {
    expect(validateAssistantResponse(null).ok).toBe(false)
    expect(validateAssistantResponse({}).ok).toBe(false)
    expect(validateAssistantResponse({ message: '   ' }).ok).toBe(false)
  })

  it('clears nextQuestion when the conversation is complete', () => {
    const result = validateAssistantResponse({
      message: 'Thanks for exploring.',
      nextQuestion: 'Should not appear',
      options: ['Ignore'],
      conversationComplete: true,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.conversationComplete).toBe(true)
    expect(result.data.nextQuestion).toBeNull()
    expect(result.data.citations).toEqual([])
    expect(result.data.evidenceStatus).toBe('skipped')
  })

  it('drops invalid source hrefs and empty options', () => {
    const result = validateAssistantResponse({
      message: 'Limited sources available.',
      options: ['  ', 'Valid option', 12, 'Another'],
      sources: [
        { label: 'Bad', href: 'javascript:alert(1)' },
        { label: 'Ok', href: 'https://example.com/ok' },
        { label: 'No href' },
      ],
      conversationComplete: false,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.options).toEqual(['Valid option', 'Another'])
    expect(result.data.sources).toEqual([
      { label: 'Ok', href: 'https://example.com/ok' },
    ])
  })

  it('drops invented citations that are not in the allowed href set', () => {
    const result = validateAssistantResponse(
      {
        message: 'Claim with a fake citation.',
        citations: [
          {
            label: 'Invented',
            href: 'https://evil.example/fake',
            passage: 'Made up quote',
          },
          {
            label: 'Real',
            href: 'https://www.toronto.ca/notice',
            passage: 'Documented sentence',
          },
        ],
        sources: [
          { label: 'Invented', href: 'https://evil.example/fake' },
          { label: 'Real', href: 'https://www.toronto.ca/notice' },
        ],
        conversationComplete: false,
      },
      {
        allowedCitationHrefs: ['https://www.toronto.ca/notice'],
        evidenceStatus: 'partial',
      },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.citations).toEqual([
      {
        label: 'Real',
        href: 'https://www.toronto.ca/notice',
        passage: 'Documented sentence',
        recordId: null,
        isOriginalPassage: true,
      },
    ])
    expect(result.data.sources).toEqual([
      { label: 'Real', href: 'https://www.toronto.ca/notice' },
    ])
    expect(result.data.evidenceStatus).toBe('partial')
  })

  it('falls back to grounded citations when the model omits them', () => {
    const result = validateAssistantResponse(
      {
        message: 'Based on the notice.',
        conversationComplete: false,
      },
      {
        evidenceStatus: 'retrieved',
        groundedCitations: [
          {
            label: 'Notice',
            href: 'https://secure.toronto.ca/notice',
            passage: 'Eight rental units are proposed for demolition.',
            recordId: 'r1',
          },
        ],
        allowedCitationHrefs: ['https://secure.toronto.ca/notice'],
      },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.citations).toHaveLength(1)
    expect(result.data.sources[0]?.href).toBe('https://secure.toronto.ca/notice')
  })
})

describe('trimAssistantHistory', () => {
  it('keeps only the most recent turns', () => {
    const history = Array.from({ length: 5 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `m${i}`,
    }))

    expect(trimAssistantHistory(history, 3).map((m) => m.content)).toEqual([
      'm2',
      'm3',
      'm4',
    ])
    expect(trimAssistantHistory(history, 10)).toHaveLength(5)
  })
})
