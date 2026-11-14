import { describe, expect, it } from 'vitest'
import { rankPassages, splitIntoPassages, tokenizeQuery } from './rankPassages'

describe('tokenizeQuery', () => {
  it('drops stopwords and short tokens', () => {
    expect(tokenizeQuery('What is the rental demolition deadline?')).toEqual([
      'rental',
      'demolition',
      'deadline',
    ])
  })
})

describe('splitIntoPassages', () => {
  it('creates passages from paragraphs', () => {
    const text = [
      'Alpha planning staff reviewed the rental housing demolition application for Danforth Road in detail.',
      '',
      'Beta parks staff described playground renovations planned for several wards this summer season.',
    ].join('\n')
    const passages = splitIntoPassages(text)
    expect(passages.length).toBeGreaterThanOrEqual(1)
    expect(passages.some((p) => /housing/i.test(p))).toBe(true)
  })
})

describe('rankPassages', () => {
  it('prioritizes passages that answer the question', () => {
    const ranked = rankPassages(
      [
        {
          href: 'https://www.toronto.ca/a',
          title: 'Parks update',
          organization: 'City of Toronto',
          text: 'The park playground replacement is scheduled for spring maintenance.',
          recordId: 'parks',
        },
        {
          href: 'https://www.toronto.ca/b',
          title: 'Rental demolition notice',
          organization: 'City of Toronto',
          text: 'A rental housing demolition application proposes demolishing eight existing rental dwelling units at Danforth Road. A public meeting will consider the application.',
          recordId: 'housing',
        },
      ],
      'What does the rental demolition application propose?',
      { maxResults: 3 },
    )

    expect(ranked.length).toBeGreaterThan(0)
    expect(ranked[0]!.href).toBe('https://www.toronto.ca/b')
    expect(ranked[0]!.passage.toLowerCase()).toMatch(/rental/)
  })

  it('returns empty when nothing matches a specific query', () => {
    const ranked = rankPassages(
      [
        {
          href: 'https://www.toronto.ca/a',
          title: 'Parks',
          organization: 'City of Toronto',
          text: 'Playground renovations continue this summer in several wards.',
        },
      ],
      'zoning tribunal appeal timeline',
    )
    expect(ranked).toEqual([])
  })
})
