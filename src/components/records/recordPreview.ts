import type {
  MunicipalRecord,
  ParticipationAvailability,
  PotentialImpact,
} from '../../types/municipalRecord'

/** Turn snake_case / kebab tokens into readable labels. */
export function humanizeToken(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function formatParticipationAvailability(
  value: ParticipationAvailability,
): string {
  switch (value) {
    case 'open':
      return 'Open for feedback'
    case 'not_open':
      return 'Not open for feedback'
    case 'closed':
      return 'Feedback closed'
    case 'unknown':
      return 'Feedback availability unknown'
  }
}

/** Prefer a human-readable date fragment; return null if empty. */
export function formatDisplayDate(value: string | null | undefined): string | null {
  if (!value || !value.trim()) return null
  const trimmed = value.trim()
  // Keep ISO date / datetime readable without inventing timezone conversions.
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.replace('T', ' ').replace(/([+-]\d{2}:\d{2}|Z)$/, '')
  }
  return trimmed
}

export function isSourceStatedImpact(impact: PotentialImpact): boolean {
  const kind = (impact.kind ?? '').toLowerCase()
  return kind.includes('source_stated')
}

export interface RecordPreviewSections {
  categoryLabel: string
  recordTypeLabel: string
  title: string
  municipality: string
  affectedArea: string | null
  projectStatusLabel: string
  decisionStatusLabel: string | null
  summary: string | null
  sourceStatedImpacts: string[]
  otherImpacts: string[]
  uncertainties: string[]
  participationLabel: string
  participationDeadline: string | null
  participationVerifiedOn: string | null
  officialSourceUrl: string | null
  lastVerified: string | null
}

/**
 * Pure projection of a MunicipalRecord into preview panel content.
 * Missing values stay null/empty so the UI can hide sections.
 */
export function buildRecordPreviewSections(
  record: MunicipalRecord,
): RecordPreviewSections {
  const sourceStatedImpacts: string[] = []
  const otherImpacts: string[] = []
  for (const impact of record.potentialImpacts) {
    if (isSourceStatedImpact(impact)) sourceStatedImpacts.push(impact.text)
    else otherImpacts.push(impact.text)
  }

  const decisionStatusLabel =
    record.decisionStatus !== 'unknown'
      ? humanizeToken(record.decisionStatus)
      : null

  return {
    categoryLabel: humanizeToken(record.categoryRaw),
    recordTypeLabel: humanizeToken(record.recordType),
    title: record.title,
    municipality: record.municipality,
    affectedArea: record.location.affectedArea?.trim() || null,
    projectStatusLabel: humanizeToken(record.projectStatus),
    decisionStatusLabel,
    summary: record.description.trim() || null,
    sourceStatedImpacts,
    otherImpacts,
    uncertainties: [...record.uncertainties],
    participationLabel: formatParticipationAvailability(
      record.participationAvailability,
    ),
    participationDeadline: formatDisplayDate(record.participationDeadline),
    participationVerifiedOn: formatDisplayDate(record.lastVerified),
    officialSourceUrl: record.officialSourceUrl ?? record.sources[0]?.href ?? null,
    lastVerified: formatDisplayDate(record.lastVerified),
  }
}
