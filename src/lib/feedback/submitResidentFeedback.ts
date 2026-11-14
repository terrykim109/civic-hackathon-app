import type { CivicSupabaseClient } from '../supabase/client'
import {
  validateFeedbackSubmission,
  type FeedbackSubmissionInput,
} from './validateFeedbackSubmission'

const CLIENT_KEY_STORAGE = 'civicsync.feedback.clientKey'

export type SubmitFeedbackResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

function readClientKey(): string {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return 'anonymous'
  }
  try {
    const existing = window.sessionStorage.getItem(CLIENT_KEY_STORAGE)
    if (existing?.trim()) return existing.trim().slice(0, 80)
    const created =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `ck-${Date.now().toString(36)}`
    window.sessionStorage.setItem(CLIENT_KEY_STORAGE, created)
    return created
  } catch {
    return 'anonymous'
  }
}

function parseRpcPayload(data: unknown): SubmitFeedbackResult {
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Unexpected response from feedback service.' }
  }
  const payload = data as Record<string, unknown>
  if (payload.ok === true && typeof payload.id === 'string') {
    return { ok: true, id: payload.id }
  }
  if (typeof payload.error === 'string' && payload.error.trim()) {
    return { ok: false, error: payload.error }
  }
  return { ok: false, error: 'Unable to submit feedback right now.' }
}

/**
 * Submit resident feedback through the SECURITY DEFINER RPC.
 * Never writes to feedback_submissions directly from the browser.
 */
export async function submitResidentFeedback(
  client: CivicSupabaseClient,
  input: FeedbackSubmissionInput,
): Promise<SubmitFeedbackResult> {
  const validation = validateFeedbackSubmission(input)
  if (!validation.ok || !validation.cleaned) {
    return {
      ok: false,
      error: validation.errors[0] ?? 'Invalid feedback submission.',
    }
  }

  // Cast: hand-written Database Function Args are not full Supabase codegen output.
  const { data, error } = await client.rpc(
    'submit_resident_feedback',
    {
      p_municipal_record_id: validation.cleaned.municipalRecordId,
      p_comment: validation.cleaned.comment,
      p_perspective: validation.cleaned.perspective,
      p_contact_name: validation.cleaned.contactName,
      p_contact_email: validation.cleaned.contactEmail,
      p_client_key: readClientKey(),
      p_honeypot: input.website?.trim() || null,
    } as never,
  )

  if (error) {
    return {
      ok: false,
      error: error.message || 'Could not reach the feedback service.',
    }
  }

  return parseRpcPayload(data)
}
