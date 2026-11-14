import { describe, expect, it, vi } from 'vitest'
import type { CivicSupabaseClient } from '../supabase/client'
import {
  filterFeedbackItems,
  listFeedbackProposalOptions,
  listFeedbackSubmissions,
  updateFeedbackReviewStatus,
  type FeedbackInboxItem,
} from './feedbackAdminApi'

function sampleItem(
  overrides: Partial<FeedbackInboxItem> = {},
): FeedbackInboxItem {
  return {
    id: 'fb-1',
    municipalRecordId: 'rec-1',
    proposalTitle: 'Park renewal',
    proposalMunicipality: 'Toronto',
    proposalPublicationStatus: 'published',
    comment: 'Keep the trees',
    perspective: null,
    contactName: null,
    contactEmail: null,
    reviewStatus: 'new',
    createdAt: '2026-11-14T12:00:00.000Z',
    reviewedAt: null,
    reviewedBy: null,
    ...overrides,
  }
}

describe('filterFeedbackItems', () => {
  const items = [
    sampleItem(),
    sampleItem({
      id: 'fb-2',
      municipalRecordId: 'rec-2',
      proposalTitle: 'Housing notice',
      reviewStatus: 'reviewed',
    }),
    sampleItem({
      id: 'fb-3',
      municipalRecordId: 'rec-1',
      reviewStatus: 'under_review',
    }),
  ]

  it('filters by proposal without leaking other proposal rows', () => {
    const filtered = filterFeedbackItems(items, { proposalId: 'rec-1' })
    expect(filtered.map((item) => item.id)).toEqual(['fb-1', 'fb-3'])
    expect(filtered.every((item) => item.municipalRecordId === 'rec-1')).toBe(
      true,
    )
  })

  it('filters by review status', () => {
    const filtered = filterFeedbackItems(items, { reviewStatus: 'reviewed' })
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.id).toBe('fb-2')
  })

  it('combines proposal and status filters', () => {
    const filtered = filterFeedbackItems(items, {
      proposalId: 'rec-1',
      reviewStatus: 'under_review',
    })
    expect(filtered.map((item) => item.id)).toEqual(['fb-3'])
  })
})

describe('listFeedbackProposalOptions', () => {
  it('returns unique proposal options sorted by title', () => {
    const options = listFeedbackProposalOptions([
      sampleItem({ municipalRecordId: 'b', proposalTitle: 'Zebra' }),
      sampleItem({ municipalRecordId: 'a', proposalTitle: 'Alpha' }),
      sampleItem({ municipalRecordId: 'a', proposalTitle: 'Alpha' }),
    ])
    expect(options).toEqual([
      { id: 'a', title: 'Alpha' },
      { id: 'b', title: 'Zebra' },
    ])
  })
})

describe('listFeedbackSubmissions', () => {
  it('maps joined proposal fields on success', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'fb-1',
          municipal_record_id: 'rec-1',
          comment: 'Hello',
          perspective: 'parks',
          contact_name: 'Alex',
          contact_email: 'alex@example.com',
          review_status: 'new',
          created_at: '2026-11-14T12:00:00.000Z',
          reviewed_at: null,
          reviewed_by: null,
          municipal_records: {
            id: 'rec-1',
            title: 'Park renewal',
            municipality: 'Toronto',
            publication_status: 'published',
          },
        },
      ],
      error: null,
    })
    const select = vi.fn().mockReturnValue({ order })
    const from = vi.fn().mockReturnValue({ select })
    const client = { from } as unknown as CivicSupabaseClient

    const result = await listFeedbackSubmissions(client)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data[0]).toMatchObject({
        id: 'fb-1',
        municipalRecordId: 'rec-1',
        proposalTitle: 'Park renewal',
        contactEmail: 'alex@example.com',
        reviewStatus: 'new',
      })
    }
  })

  it('surfaces unauthorized or database failures', async () => {
    const order = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'permission denied for table feedback_submissions' },
    })
    const select = vi.fn().mockReturnValue({ order })
    const from = vi.fn().mockReturnValue({ select })
    const client = { from } as unknown as CivicSupabaseClient

    const result = await listFeedbackSubmissions(client)
    expect(result).toEqual({
      ok: false,
      error: 'permission denied for table feedback_submissions',
    })
  })
})

describe('updateFeedbackReviewStatus', () => {
  it('persists status and returns the updated row', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'fb-1',
        municipal_record_id: 'rec-1',
        comment: 'Hello',
        perspective: null,
        contact_name: null,
        contact_email: null,
        review_status: 'reviewed',
        created_at: '2026-11-14T12:00:00.000Z',
        reviewed_at: '2026-11-14T13:00:00.000Z',
        reviewed_by: 'admin-1',
        municipal_records: {
          id: 'rec-1',
          title: 'Park renewal',
          municipality: 'Toronto',
          publication_status: 'published',
        },
      },
      error: null,
    })
    const select = vi.fn().mockReturnValue({ maybeSingle })
    const eq = vi.fn().mockReturnValue({ select })
    const update = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ update })
    const client = { from } as unknown as CivicSupabaseClient

    const result = await updateFeedbackReviewStatus(
      client,
      'fb-1',
      'reviewed',
      'admin-1',
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.reviewStatus).toBe('reviewed')
      expect(result.data.reviewedBy).toBe('admin-1')
    }
    expect(update).toHaveBeenCalled()
  })

  it('rejects invalid status values before calling Supabase', async () => {
    const from = vi.fn()
    const client = { from } as unknown as CivicSupabaseClient
    const result = await updateFeedbackReviewStatus(
      client,
      'fb-1',
      'nope' as never,
      null,
    )
    expect(result).toEqual({ ok: false, error: 'Invalid review status.' })
    expect(from).not.toHaveBeenCalled()
  })
})
