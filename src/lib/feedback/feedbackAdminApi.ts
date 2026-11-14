import type { CivicSupabaseClient } from '../supabase/client'
import type {
  FeedbackReviewStatus,
  FeedbackSubmissionRow,
  PublicationStatus,
} from '../supabase/types'

export interface FeedbackInboxItem {
  id: string
  municipalRecordId: string
  proposalTitle: string
  proposalMunicipality: string | null
  proposalPublicationStatus: PublicationStatus | null
  comment: string
  perspective: string | null
  contactName: string | null
  contactEmail: string | null
  reviewStatus: FeedbackReviewStatus
  createdAt: string
  reviewedAt: string | null
  reviewedBy: string | null
}

export interface FeedbackListFilters {
  proposalId?: string | 'all'
  reviewStatus?: FeedbackReviewStatus | 'all'
}

export type FeedbackAdminResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const REVIEW_STATUSES: readonly FeedbackReviewStatus[] = [
  'new',
  'under_review',
  'reviewed',
]

type FeedbackJoinRow = FeedbackSubmissionRow & {
  municipal_records:
    | {
        id: string
        title: string
        municipality: string
        publication_status: PublicationStatus
      }
    | null
    | Array<{
        id: string
        title: string
        municipality: string
        publication_status: PublicationStatus
      }>
}

function unwrapProposal(
  joined: FeedbackJoinRow['municipal_records'],
): {
  title: string
  municipality: string | null
  publicationStatus: PublicationStatus | null
} {
  const row = Array.isArray(joined) ? (joined[0] ?? null) : joined
  if (!row) {
    return {
      title: 'Unknown proposal',
      municipality: null,
      publicationStatus: null,
    }
  }
  return {
    title: row.title,
    municipality: row.municipality,
    publicationStatus: row.publication_status,
  }
}

function mapInboxItem(row: FeedbackJoinRow): FeedbackInboxItem {
  const proposal = unwrapProposal(row.municipal_records)
  return {
    id: row.id,
    municipalRecordId: row.municipal_record_id,
    proposalTitle: proposal.title,
    proposalMunicipality: proposal.municipality,
    proposalPublicationStatus: proposal.publicationStatus,
    comment: row.comment,
    perspective: row.perspective,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    reviewStatus: row.review_status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
  }
}

export function isFeedbackReviewStatus(
  value: string,
): value is FeedbackReviewStatus {
  return (REVIEW_STATUSES as readonly string[]).includes(value)
}

/**
 * Filter inbox rows in memory. Always scopes by exact municipal_record_id
 * when a proposal filter is set so other proposals cannot leak into the view.
 */
export function filterFeedbackItems(
  items: readonly FeedbackInboxItem[],
  filters: FeedbackListFilters,
): FeedbackInboxItem[] {
  const proposalId = filters.proposalId ?? 'all'
  const reviewStatus = filters.reviewStatus ?? 'all'

  return items.filter((item) => {
    if (proposalId !== 'all' && item.municipalRecordId !== proposalId) {
      return false
    }
    if (reviewStatus !== 'all' && item.reviewStatus !== reviewStatus) {
      return false
    }
    return true
  })
}

/** Unique proposals represented in the loaded inbox, for filter dropdowns. */
export function listFeedbackProposalOptions(
  items: readonly FeedbackInboxItem[],
): Array<{ id: string; title: string }> {
  const seen = new Map<string, string>()
  for (const item of items) {
    if (!seen.has(item.municipalRecordId)) {
      seen.set(item.municipalRecordId, item.proposalTitle)
    }
  }
  return [...seen.entries()]
    .map(([id, title]) => ({ id, title }))
    .sort((a, b) => a.title.localeCompare(b.title))
}

/**
 * Load feedback for administrators. Relies on RLS (`is_admin()`) — non-admins
 * receive an empty/error response from PostgREST, not client-side secrecy.
 */
export async function listFeedbackSubmissions(
  client: CivicSupabaseClient,
): Promise<FeedbackAdminResult<FeedbackInboxItem[]>> {
  const { data, error } = await client
    .from('feedback_submissions')
    .select(
      'id, municipal_record_id, comment, perspective, contact_name, contact_email, review_status, created_at, reviewed_at, reviewed_by, municipal_records ( id, title, municipality, publication_status )',
    )
    .order('created_at', { ascending: false })

  if (error) {
    return {
      ok: false,
      error: error.message || 'Could not load feedback submissions.',
    }
  }

  return {
    ok: true,
    data: ((data ?? []) as FeedbackJoinRow[]).map(mapInboxItem),
  }
}

export async function updateFeedbackReviewStatus(
  client: CivicSupabaseClient,
  submissionId: string,
  reviewStatus: FeedbackReviewStatus,
  actorUserId: string | null,
): Promise<FeedbackAdminResult<FeedbackInboxItem>> {
  if (!isFeedbackReviewStatus(reviewStatus)) {
    return { ok: false, error: 'Invalid review status.' }
  }
  if (!submissionId.trim()) {
    return { ok: false, error: 'Submission id is required.' }
  }

  const patch: Partial<FeedbackSubmissionRow> =
    reviewStatus === 'new'
      ? {
          review_status: 'new',
          reviewed_at: null,
          reviewed_by: null,
        }
      : {
          review_status: reviewStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: actorUserId,
        }

  const { data, error } = await client
    .from('feedback_submissions')
    .update(patch as never)
    .eq('id', submissionId)
    .select(
      'id, municipal_record_id, comment, perspective, contact_name, contact_email, review_status, created_at, reviewed_at, reviewed_by, municipal_records ( id, title, municipality, publication_status )',
    )
    .maybeSingle()

  if (error) {
    return {
      ok: false,
      error: error.message || 'Could not update review status.',
    }
  }
  if (!data) {
    return {
      ok: false,
      error: 'Submission not found or not visible to this administrator.',
    }
  }

  return { ok: true, data: mapInboxItem(data as FeedbackJoinRow) }
}
