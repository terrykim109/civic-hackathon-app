import type { FeedbackInboxItem } from './feedbackAdminApi'

const CSV_HEADERS = [
  'submission_id',
  'municipal_record_id',
  'proposal_title',
  'proposal_municipality',
  'proposal_publication_status',
  'submitted_at',
  'review_status',
  'reviewed_at',
  'reviewed_by',
  'perspective',
  'contact_name',
  'contact_email',
  'comment',
] as const

/**
 * Escape a CSV field and neutralize spreadsheet formula injection.
 * Prefixes values that start with =, +, -, @, tab, or CR with a single quote.
 */
export function escapeCsvCell(value: string | null | undefined): string {
  const raw = value ?? ''
  const neutralized = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
  if (/[",\n\r]/.test(neutralized)) {
    return `"${neutralized.replace(/"/g, '""')}"`
  }
  return neutralized
}

export function buildFeedbackCsv(
  items: readonly FeedbackInboxItem[],
): string {
  const lines = [CSV_HEADERS.join(',')]

  for (const item of items) {
    const row = [
      item.id,
      item.municipalRecordId,
      item.proposalTitle,
      item.proposalMunicipality,
      item.proposalPublicationStatus,
      item.createdAt,
      item.reviewStatus,
      item.reviewedAt,
      item.reviewedBy,
      item.perspective,
      item.contactName,
      item.contactEmail,
      item.comment,
    ].map((cell) => escapeCsvCell(cell))
    lines.push(row.join(','))
  }

  // BOM helps Excel open UTF-8 correctly without changing cell semantics.
  return `\uFEFF${lines.join('\r\n')}\r\n`
}

export function feedbackCsvFilename(now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 10)
  return `civiclens-feedback-${stamp}.csv`
}
