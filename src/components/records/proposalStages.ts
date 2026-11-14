import { evaluateFeedbackAvailability } from '../../lib/feedback/feedbackAvailability'
import type { MunicipalRecord } from '../../types/municipalRecord'
import {
  buildRecordPreviewSections,
  formatDisplayDate,
  formatParticipationAvailability,
  humanizeToken,
} from './recordPreview'

export type ProposalStageId = 'proposal' | 'impact' | 'haveYourSay' | 'records'

export interface ProposalStageMeta {
  id: ProposalStageId
  index: number
  label: string
  shortLabel: string
}

export const PROPOSAL_STAGES: readonly ProposalStageMeta[] = [
  { id: 'proposal', index: 1, label: 'Proposal', shortLabel: 'Proposal' },
  { id: 'impact', index: 2, label: 'Impact', shortLabel: 'Impact' },
  { id: 'haveYourSay', index: 3, label: 'Your say', shortLabel: 'Your say' },
  { id: 'records', index: 4, label: 'Records', shortLabel: 'Records' },
] as const

export type ParticipationTone = 'open' | 'approaching' | 'closed' | 'finalized' | 'unknown'

export interface DeadlineBadge {
  tone: ParticipationTone
  label: string
}

export interface OfficialRecordLink {
  title: string
  href: string
  typeLabel: string
  reference: string | null
  verifiedOn: string | null
}

export interface ProposalBriefModel {
  title: string
  breadcrumb: string
  updatedLabel: string | null
  deadlineBadge: DeadlineBadge | null
  /** At-a-glance fields — only populated when data exists. */
  proposed: string | null
  impactSummary: string | null
  yourRole: string | null
  deadlineLabel: string | null
  locationLines: string[]
  whereItStands: string[]
  knownImpacts: string[]
  uncertainItems: string[]
  neighbourhoodLines: string[]
  participationLabel: string
  participationOpen: boolean
  feedbackHeadline: string | null
  feedbackDeadline: string | null
  participationCheckedOn: string | null
  officialRecords: OfficialRecordLink[]
  relatedProcessNotes: string[]
  metrics: Array<{ label: string; value: string; detail?: string }>
  openQuestions: string[]
}

const APPROACHING_DAYS = 7

function daysUntilDeadline(deadline: string, now: Date): number | null {
  const trimmed = deadline.trim()
  let end: Date | null = null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    end = new Date(`${trimmed}T23:59:59.999Z`)
  } else {
    const parsed = new Date(trimmed)
    end = Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (!end) return null
  const ms = end.getTime() - now.getTime()
  return Math.ceil(ms / (24 * 60 * 60 * 1000))
}

function buildDeadlineBadge(
  record: MunicipalRecord,
  now: Date,
): DeadlineBadge | null {
  const availability = evaluateFeedbackAvailability(record)
  const deadline = record.participationDeadline?.trim() || null

  if (record.decisionStatus === 'approved' || record.decisionStatus === 'rejected') {
    return {
      tone: 'finalized',
      label: `Decision ${humanizeToken(record.decisionStatus)}`,
    }
  }

  if (availability.reason === 'deadline_passed' || availability.reason === 'participation_closed') {
    return { tone: 'closed', label: 'Feedback closed' }
  }

  if (availability.available && deadline) {
    const days = daysUntilDeadline(deadline, now)
    if (days != null && days >= 0 && days <= APPROACHING_DAYS) {
      return {
        tone: 'approaching',
        label:
          days === 0
            ? 'Deadline approaching · today'
            : `Deadline approaching · ${days}d left`,
      }
    }
    return { tone: 'open', label: 'Open for feedback' }
  }

  if (availability.available) {
    return { tone: 'open', label: 'Open for feedback' }
  }

  if (record.participationAvailability === 'unknown') {
    return null
  }

  return {
    tone: 'unknown',
    label: formatParticipationAvailability(record.participationAvailability),
  }
}

function buildYourRole(record: MunicipalRecord, badge: DeadlineBadge | null): string | null {
  if (badge?.tone === 'approaching') {
    return 'Feedback closes soon — act now.'
  }
  if (badge?.tone === 'open') {
    return 'You can submit feedback while this proposal is open.'
  }
  if (badge?.tone === 'closed') {
    return 'Feedback is closed for this proposal in CivicLens.'
  }
  if (record.participationUrl?.trim()) {
    return 'Official participation channels are linked in the sources below.'
  }
  return null
}

function collectOfficialRecords(record: MunicipalRecord): OfficialRecordLink[] {
  const links: OfficialRecordLink[] = []
  const seen = new Set<string>()

  const push = (
    title: string,
    href: string,
    typeLabel: string,
    reference: string | null,
    verifiedOn: string | null,
  ) => {
    const key = href.trim()
    if (!key || seen.has(key)) return
    if (key.startsWith('/') || key.startsWith('blob:') || key.startsWith('data:')) return
    seen.add(key)
    links.push({ title, href: key, typeLabel, reference, verifiedOn })
  }

  for (const source of record.sources) {
    push(
      source.label?.trim() || 'Official source',
      source.href,
      'Official source',
      null,
      formatDisplayDate(source.verifiedOn),
    )
  }

  if (record.officialSourceUrl?.trim()) {
    push(
      'Official source',
      record.officialSourceUrl,
      'Official source',
      record.agendaItemId ?? null,
      formatDisplayDate(record.lastVerified),
    )
  }

  for (const item of record.evidence) {
    push(
      item.locator?.trim() || item.evidenceId || 'Evidence',
      item.sourceUrl,
      'Evidence',
      item.evidenceId,
      formatDisplayDate(record.lastVerified),
    )
  }

  for (const related of record.relatedProcesses) {
    for (const source of related.sources) {
      push(
        `${related.label}: ${source.label?.trim() || 'source'}`,
        source.href,
        'Related process',
        related.id,
        formatDisplayDate(source.verifiedOn),
      )
    }
  }

  return links
}

/**
 * Project a MunicipalRecord into the four-stage proposal brief.
 * Omits sections when underlying fields are empty — never invents content.
 */
export function buildProposalBrief(
  record: MunicipalRecord,
  now: Date = new Date(),
): ProposalBriefModel {
  const preview = buildRecordPreviewSections(record)
  const badge = buildDeadlineBadge(record, now)
  const availability = evaluateFeedbackAvailability(record)

  const locationLines: string[] = []
  if (preview.municipality) locationLines.push(preview.municipality)
  if (preview.affectedArea) locationLines.push(preview.affectedArea)
  if (record.location.note?.trim()) locationLines.push(record.location.note.trim())

  const whereItStands: string[] = []
  if (preview.projectStatusLabel) {
    whereItStands.push(`Municipal status: ${preview.projectStatusLabel}`)
  }
  if (preview.decisionStatusLabel) {
    whereItStands.push(`Decision outcome: ${preview.decisionStatusLabel}`)
  }
  if (record.decisionStage && record.decisionStage !== 'unknown') {
    whereItStands.push(`Stage: ${humanizeToken(record.decisionStage)}`)
  }
  if (record.gisSourceStatus?.trim()) {
    whereItStands.push(`GIS source status: ${record.gisSourceStatus.trim()}`)
  }

  const neighbourhoodLines: string[] = []
  if (preview.affectedArea) neighbourhoodLines.push(preview.affectedArea)
  if (preview.municipality) neighbourhoodLines.push(preview.municipality)

  const relatedProcessNotes = record.relatedProcesses
    .map((item) => {
      const status =
        item.status !== 'unknown' ? ` (${humanizeToken(item.status)})` : ''
      const note = item.note?.trim() ? ` — ${item.note.trim()}` : ''
      return `${item.label}${status}${note}`
    })
    .filter(Boolean)

  let feedbackHeadline: string | null = null
  if (badge?.tone === 'approaching') {
    feedbackHeadline = 'Feedback closes soon — act now.'
  } else if (availability.available) {
    feedbackHeadline = 'Feedback is open in CivicLens for this proposal.'
  } else if (badge?.tone === 'closed') {
    feedbackHeadline = 'Feedback is not open right now.'
  }

  return {
    title: preview.title,
    breadcrumb: `${preview.categoryLabel} / ${preview.municipality}`,
    updatedLabel: preview.lastVerified
      ? `Updated ${preview.lastVerified}`
      : null,
    deadlineBadge: badge,
    proposed: preview.summary,
    impactSummary: preview.sourceStatedImpacts[0] ?? preview.otherImpacts[0] ?? null,
    yourRole: buildYourRole(record, badge),
    deadlineLabel: preview.participationDeadline
      ? `Feedback deadline: ${preview.participationDeadline}`
      : null,
    locationLines,
    whereItStands,
    knownImpacts: [
      ...preview.sourceStatedImpacts,
      ...preview.otherImpacts,
    ],
    uncertainItems: preview.uncertainties,
    neighbourhoodLines,
    participationLabel: preview.participationLabel,
    participationOpen: availability.available,
    feedbackHeadline,
    feedbackDeadline: preview.participationDeadline,
    participationCheckedOn: preview.participationVerifiedOn,
    officialRecords: collectOfficialRecords(record),
    relatedProcessNotes,
    metrics: record.metrics.map((metric) => ({
      label: metric.label,
      value: metric.value,
      detail: metric.detail,
    })),
    openQuestions: preview.uncertainties,
  }
}

export function stageIndex(id: ProposalStageId): number {
  return PROPOSAL_STAGES.find((stage) => stage.id === id)?.index ?? 1
}

export function nextStageId(id: ProposalStageId): ProposalStageId | null {
  const index = PROPOSAL_STAGES.findIndex((stage) => stage.id === id)
  return PROPOSAL_STAGES[index + 1]?.id ?? null
}

export function previousStageId(id: ProposalStageId): ProposalStageId | null {
  const index = PROPOSAL_STAGES.findIndex((stage) => stage.id === id)
  return index > 0 ? PROPOSAL_STAGES[index - 1]!.id : null
}

/** Next-button label for the footer primary action. */
export function nextActionLabel(id: ProposalStageId): string | null {
  switch (id) {
    case 'proposal':
      return 'How this could affect you'
    case 'impact':
      return 'Have your say'
    case 'haveYourSay':
      return 'Official records'
    case 'records':
      return null
  }
}
