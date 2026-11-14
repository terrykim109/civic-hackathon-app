export interface FeedbackSubmissionInput {
  municipalRecordId: string
  comment: string
  perspective?: string
  contactName?: string
  contactEmail?: string
  /** Honeypot — must stay empty. */
  website?: string
}

export interface FeedbackValidationResult {
  ok: boolean
  errors: string[]
  cleaned: {
    municipalRecordId: string
    comment: string
    perspective: string | null
    contactName: string | null
    contactEmail: string | null
  } | null
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Client-side validation mirror of server rules.
 * Server-side RPC remains authoritative.
 */
export function validateFeedbackSubmission(
  input: FeedbackSubmissionInput,
): FeedbackValidationResult {
  const errors: string[] = []

  if (input.website && input.website.trim()) {
    return {
      ok: false,
      errors: ['Unable to submit feedback right now.'],
      cleaned: null,
    }
  }

  const municipalRecordId = input.municipalRecordId?.trim() ?? ''
  if (!municipalRecordId) {
    errors.push('Municipal record id is required.')
  }

  const comment = input.comment?.trim() ?? ''
  if (!comment) errors.push('Feedback comment is required.')
  if (comment.length > 10000) {
    errors.push('Feedback comment must be 10,000 characters or fewer.')
  }

  const perspective = input.perspective?.trim() || null
  if (perspective && perspective.length > 2000) {
    errors.push('Perspective must be 2,000 characters or fewer.')
  }

  const contactName = input.contactName?.trim() || null
  if (contactName && contactName.length > 200) {
    errors.push('Contact name must be 200 characters or fewer.')
  }

  const contactEmail = input.contactEmail?.trim() || null
  if (contactEmail) {
    if (contactEmail.length > 320) {
      errors.push('Contact email must be 320 characters or fewer.')
    } else if (!EMAIL_PATTERN.test(contactEmail)) {
      errors.push('Enter a valid contact email or leave it blank.')
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors, cleaned: null }
  }

  return {
    ok: true,
    errors: [],
    cleaned: {
      municipalRecordId,
      comment,
      perspective,
      contactName,
      contactEmail,
    },
  }
}
