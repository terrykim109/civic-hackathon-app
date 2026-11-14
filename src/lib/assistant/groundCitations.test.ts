import { describe, expect, it } from 'vitest'
import {
  buildEvidenceQuery,
  citationsFromPassages,
  evidenceStatusFromRetrieval,
} from './groundCitations'

describe('citationsFromPassages', () => {
  it('keeps one citation per URL with the top passage', () => {
    const citations = citationsFromPassages([
      {
        href: 'https://www.toronto.ca/a',
        title: 'Notice A',
        organization: 'City of Toronto',
        passage: 'First relevant passage about demolition.',
        score: 5,
        recordId: 'r1',
      },
      {
        href: 'https://www.toronto.ca/a',
        title: 'Notice A',
        organization: 'City of Toronto',
        passage: 'Second passage same URL.',
        score: 2,
        recordId: 'r1',
      },
      {
        href: 'https://www.toronto.ca/b',
        title: 'Report B',
        organization: 'City of Toronto',
        passage: 'Planning report excerpt.',
        score: 3,
        recordId: 'r1',
      },
    ])

    expect(citations).toHaveLength(2)
    expect(citations[0]).toMatchObject({
      href: 'https://www.toronto.ca/a',
      passage: 'First relevant passage about demolition.',
    })
  })
})

describe('evidenceStatusFromRetrieval', () => {
  it('maps retrieval outcomes', () => {
    expect(
      evidenceStatusFromRetrieval({
        attempted: 0,
        retrieved: 0,
        unsupported: 0,
        failed: 0,
      }),
    ).toBe('skipped')
    expect(
      evidenceStatusFromRetrieval({
        attempted: 2,
        retrieved: 0,
        unsupported: 1,
        failed: 1,
      }),
    ).toBe('unavailable')
    expect(
      evidenceStatusFromRetrieval({
        attempted: 2,
        retrieved: 1,
        unsupported: 1,
        failed: 0,
      }),
    ).toBe('partial')
    expect(
      evidenceStatusFromRetrieval({
        attempted: 1,
        retrieved: 1,
        unsupported: 0,
        failed: 0,
      }),
    ).toBe('retrieved')
  })
})

describe('buildEvidenceQuery', () => {
  it('prefers the resident message, otherwise area labels', () => {
    expect(
      buildEvidenceQuery({
        userMessage: 'Are replacement rentals required?',
        areaLabel: 'Kennedy',
        recordTitles: ['Notice'],
      }),
    ).toBe('Are replacement rentals required?')

    expect(
      buildEvidenceQuery({
        userMessage: '  ',
        areaLabel: 'Kennedy',
        recordTitles: ['Rental demolition', 'Zoning'],
      }),
    ).toMatch(/Kennedy/)
  })
})
