import { describe, expect, it } from 'vitest'
import {
  buildFeedbackCsv,
  escapeCsvCell,
  feedbackCsvFilename,
} from './exportFeedbackCsv'
import type { FeedbackInboxItem } from './feedbackAdminApi'

function sampleItem(
  overrides: Partial<FeedbackInboxItem> = {},
): FeedbackInboxItem {
  return {
    id: 'fb-1',
    municipalRecordId: 'rec-1',
    proposalTitle: 'Park renewal',
    proposalMunicipality: 'Toronto',
    proposalPublicationStatus: 'published',
    comment: 'Please keep trees.',
    perspective: 'parks',
    contactName: 'Alex',
    contactEmail: 'alex@example.com',
    reviewStatus: 'new',
    createdAt: '2026-11-14T12:00:00.000Z',
    reviewedAt: null,
    reviewedBy: null,
    ...overrides,
  }
}

describe('escapeCsvCell', () => {
  it('quotes commas and doubles internal quotes', () => {
    expect(escapeCsvCell('hello, "world"')).toBe('"hello, ""world"""')
  })

  it('neutralizes spreadsheet formula injection prefixes', () => {
    expect(escapeCsvCell('=1+1')).toBe("'=1+1")
    expect(escapeCsvCell('+cmd')).toBe("'+cmd")
    expect(escapeCsvCell('-2')).toBe("'-2")
    expect(escapeCsvCell('@SUM(A1)')).toBe("'@SUM(A1)")
  })
})

describe('buildFeedbackCsv', () => {
  it('includes headers, proposal ids, timestamps, and review status', () => {
    const csv = buildFeedbackCsv([
      sampleItem({
        comment: 'Line1\nLine2',
        reviewStatus: 'under_review',
        reviewedAt: '2026-11-14T13:00:00.000Z',
      }),
    ])
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('submission_id,municipal_record_id,proposal_title')
    expect(csv).toContain('rec-1')
    expect(csv).toContain('under_review')
    expect(csv).toContain('2026-11-14T12:00:00.000Z')
    expect(csv).toContain('"Line1\nLine2"')
  })

  it('escapes formula-like comments in exported rows', () => {
    const csv = buildFeedbackCsv([
      sampleItem({ comment: '=HYPERLINK("http://evil")' }),
    ])
    expect(csv).toContain("'=HYPERLINK(")
  })
})

describe('feedbackCsvFilename', () => {
  it('uses an ISO date stamp', () => {
    expect(feedbackCsvFilename(new Date('2026-11-14T08:00:00.000Z'))).toBe(
      'civiclens-feedback-2026-11-14.csv',
    )
  })
})
