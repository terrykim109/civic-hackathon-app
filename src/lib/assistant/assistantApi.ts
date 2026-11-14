import type { CivicSupabaseClient } from '../supabase/client'
import {
  normalizeAssistantLanguage,
  normalizeDetailLevel,
} from './languages'
import {
  ASSISTANT_FUNCTION_NAME,
  ASSISTANT_MAX_HISTORY_TURNS,
  ASSISTANT_MAX_USER_CHARS,
  type AssistantTurnRequest,
  type AssistantTurnResponse,
} from './types'
import {
  trimAssistantHistory,
  validateAssistantResponse,
} from './validateAssistantResponse'

export type AssistantApiResult =
  | { ok: true; data: AssistantTurnResponse }
  | { ok: false; error: string }

const CLIENT_KEY_STORAGE = 'civicsync.assistant.clientKey'
const LANGUAGE_STORAGE = 'civicsync.assistant.language'

export function readAssistantClientKey(): string {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return 'anonymous'
  }
  try {
    const existing = window.sessionStorage.getItem(CLIENT_KEY_STORAGE)
    if (existing?.trim()) return existing.trim().slice(0, 80)
    const created =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `ak-${Date.now().toString(36)}`
    window.sessionStorage.setItem(CLIENT_KEY_STORAGE, created)
    return created
  } catch {
    return 'anonymous'
  }
}

export function readAssistantLanguagePreference(): string {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return normalizeAssistantLanguage('en')
  }
  try {
    return normalizeAssistantLanguage(
      window.sessionStorage.getItem(LANGUAGE_STORAGE),
    )
  } catch {
    return normalizeAssistantLanguage('en')
  }
}

export function writeAssistantLanguagePreference(code: string): string {
  const normalized = normalizeAssistantLanguage(code)
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(LANGUAGE_STORAGE, normalized)
    } catch {
      /* ignore quota / private mode */
    }
  }
  return normalized
}

function sanitizeRequest(input: AssistantTurnRequest): AssistantTurnRequest {
  return {
    area: input.area,
    history: trimAssistantHistory(input.history, ASSISTANT_MAX_HISTORY_TURNS),
    userMessage: input.userMessage.trim().slice(0, ASSISTANT_MAX_USER_CHARS),
    clientKey: input.clientKey.trim().slice(0, 80) || 'anonymous',
    mode: input.mode === 'research_brief' ? 'research_brief' : 'converse',
    language: normalizeAssistantLanguage(input.language),
    detailLevel: normalizeDetailLevel(input.detailLevel),
  }
}

/** Prefer the Edge Function JSON `error` field over the generic non-2xx message. */
async function readFunctionsErrorMessage(error: unknown): Promise<string | null> {
  if (!error || typeof error !== 'object') return null
  const context = (error as { context?: unknown }).context
  if (!context || typeof context !== 'object') return null

  try {
    if (typeof (context as Response).json === 'function') {
      const payload = (await (context as Response).json()) as {
        error?: unknown
      }
      if (typeof payload?.error === 'string' && payload.error.trim()) {
        return payload.error.trim()
      }
    }
  } catch {
    /* body already consumed or not JSON */
  }
  return null
}

/**
 * Call the municipal-research-assistant Edge Function via the anon Supabase client.
 * The OpenRouter API key stays on the server.
 */
export async function requestAssistantTurn(
  client: CivicSupabaseClient,
  input: AssistantTurnRequest,
): Promise<AssistantApiResult> {
  const body = sanitizeRequest(input)

  // Prefer a live user session; fall back to the public anon key so unsigned
  // map visitors can still use the explorer assistant.
  const { data: sessionData } = await client.auth.getSession()
  const accessToken = sessionData.session?.access_token?.trim()
  const anonKey =
    typeof import.meta.env.VITE_SUPABASE_ANON_KEY === 'string'
      ? import.meta.env.VITE_SUPABASE_ANON_KEY.trim()
      : ''
  const bearer = accessToken || anonKey
  const invokeHeaders: Record<string, string> = {}
  if (bearer) {
    invokeHeaders.Authorization = `Bearer ${bearer}`
  }
  if (anonKey) {
    invokeHeaders.apikey = anonKey
  }

  const { data, error } = await client.functions.invoke(ASSISTANT_FUNCTION_NAME, {
    body,
    headers: invokeHeaders,
  })

  if (error) {
    const fallback =
      error.message || 'Could not reach the explorer assistant.'
    const detailed = await readFunctionsErrorMessage(error)
    return {
      ok: false,
      error: detailed || fallback,
    }
  }

  if (data && typeof data === 'object' && 'error' in data) {
    const payload = data as { error?: unknown }
    if (typeof payload.error === 'string' && payload.error.trim()) {
      return { ok: false, error: payload.error }
    }
  }

  const validated = validateAssistantResponse(data, {
    recordIds: body.area.records.map((record) => record.id),
    requireResearchBrief: body.mode === 'research_brief',
    language: body.language,
  })
  if (!validated.ok) return validated
  return { ok: true, data: validated.data }
}
