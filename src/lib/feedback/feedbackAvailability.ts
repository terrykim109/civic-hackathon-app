import type {
  MunicipalRecord,
  ParticipationOption,
} from '../../types/municipalRecord'

export type FeedbackAvailabilityReason =
  | 'available'
  | 'participation_not_open'
  | 'participation_closed'
  | 'participation_unknown'
  | 'can_participate_not_confirmed'
  | 'window_not_yet_open'
  | 'deadline_passed'

export interface FeedbackAvailabilityResult {
  /** Whether the CivicLens resident feedback form may be shown. */
  available: boolean
  reason: FeedbackAvailabilityReason
  /** Clarifies that CivicLens collects submissions; not a municipal portal claim. */
  collectionNote: string
}

const COLLECTION_NOTE =
  'When available, feedback submitted here is collected by CivicLens for administrator review. It is separate from official municipal consultation channels unless an official source says otherwise.'

export interface FeedbackAvailabilityInput {
  participationAvailability: MunicipalRecord['participationAvailability']
  canParticipateNow: MunicipalRecord['canParticipateNow']
  participationDeadline?: string | null
  participationOptions?: readonly ParticipationOption[]
}

/**
 * Parse a participation date/datetime string without inventing timezone rules.
 * Accepts YYYY-MM-DD or ISO-like strings; returns null if unusable.
 */
export function parseParticipationInstant(
  value: string | null | undefined,
): Date | null {
  if (!value || !value.trim()) return null
  const trimmed = value.trim()

  // Date-only: treat as end of that civil day UTC for deadline comparisons,
  // and start of day UTC for opens-on comparisons — callers choose semantics.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(`${trimmed}T00:00:00.000Z`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function endOfUtcDay(dateOnly: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly.trim())) return null
  const parsed = new Date(`${dateOnly.trim()}T23:59:59.999Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function isDeadlinePassed(deadline: string, now: Date): boolean {
  const trimmed = deadline.trim()
  const instant = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? endOfUtcDay(trimmed)
    : parseParticipationInstant(trimmed)
  if (!instant) {
    // Ambiguous deadline → do not treat as open permission.
    return true
  }
  return now.getTime() > instant.getTime()
}

function isBeforeOpen(opensOn: string, now: Date): boolean {
  const instant = parseParticipationInstant(opensOn)
  if (!instant) {
    // Ambiguous opens-on → do not treat as open permission.
    return true
  }
  return now.getTime() < instant.getTime()
}

/**
 * Derive whether CivicLens may offer a resident feedback form for this record.
 *
 * Rules (strict — missing/ambiguous data never grants permission):
 * 1. participationAvailability must be exactly `open`.
 * 2. canParticipateNow must be exactly `true` (null/false block).
 * 3. If participationDeadline is set, it must not be past.
 * 4. If any participation option marked available/open has opensOn in the future, block.
 * 5. If any such option has a past deadline, block.
 *
 * Does not use publication_status, decisionStatus, or GIS status.
 */
export function evaluateFeedbackAvailability(
  record: FeedbackAvailabilityInput,
  now: Date = new Date(),
): FeedbackAvailabilityResult {
  const availability = record.participationAvailability

  if (availability === 'closed') {
    return {
      available: false,
      reason: 'participation_closed',
      collectionNote: COLLECTION_NOTE,
    }
  }
  if (availability === 'not_open') {
    return {
      available: false,
      reason: 'participation_not_open',
      collectionNote: COLLECTION_NOTE,
    }
  }
  if (availability !== 'open') {
    return {
      available: false,
      reason: 'participation_unknown',
      collectionNote: COLLECTION_NOTE,
    }
  }

  if (record.canParticipateNow !== true) {
    return {
      available: false,
      reason: 'can_participate_not_confirmed',
      collectionNote: COLLECTION_NOTE,
    }
  }

  if (record.participationDeadline) {
    if (isDeadlinePassed(record.participationDeadline, now)) {
      return {
        available: false,
        reason: 'deadline_passed',
        collectionNote: COLLECTION_NOTE,
      }
    }
  }

  const options = record.participationOptions ?? []
  for (const option of options) {
    const optionAvailability = (option.availability ?? '').toLowerCase()
    const optionLooksOpen =
      optionAvailability === 'open' || optionAvailability === 'available'

    if (!optionLooksOpen) continue

    if (option.opensOn && isBeforeOpen(option.opensOn, now)) {
      return {
        available: false,
        reason: 'window_not_yet_open',
        collectionNote: COLLECTION_NOTE,
      }
    }
    if (option.deadline && isDeadlinePassed(option.deadline, now)) {
      return {
        available: false,
        reason: 'deadline_passed',
        collectionNote: COLLECTION_NOTE,
      }
    }
  }

  return {
    available: true,
    reason: 'available',
    collectionNote: COLLECTION_NOTE,
  }
}

/** Convenience boolean for UI gating. */
export function isFeedbackFormAvailable(
  record: FeedbackAvailabilityInput,
  now: Date = new Date(),
): boolean {
  return evaluateFeedbackAvailability(record, now).available
}
