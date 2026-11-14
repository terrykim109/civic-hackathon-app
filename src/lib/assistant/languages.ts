export interface AssistantLanguageOption {
  code: string
  label: string
  nativeLabel: string
}

/** Supported response languages for the municipal research assistant. */
export const ASSISTANT_SUPPORTED_LANGUAGES: readonly AssistantLanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'zh', label: 'Chinese', nativeLabel: '中文' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
] as const

export const ASSISTANT_DEFAULT_LANGUAGE = 'en'

const SUPPORTED_CODES = new Set(
  ASSISTANT_SUPPORTED_LANGUAGES.map((item) => item.code),
)

/**
 * Normalize a language preference to a supported code.
 * Falls back to English for unknown or empty values.
 */
export function normalizeAssistantLanguage(raw: unknown): string {
  if (typeof raw !== 'string') return ASSISTANT_DEFAULT_LANGUAGE
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) return ASSISTANT_DEFAULT_LANGUAGE

  // Accept BCP-47 style tags like fr-CA → fr, zh-Hans → zh.
  const primary = trimmed.split(/[-_]/)[0] ?? trimmed
  if (SUPPORTED_CODES.has(primary)) return primary
  if (SUPPORTED_CODES.has(trimmed)) return trimmed
  return ASSISTANT_DEFAULT_LANGUAGE
}

export function assistantLanguageLabel(code: string): string {
  const normalized = normalizeAssistantLanguage(code)
  const match = ASSISTANT_SUPPORTED_LANGUAGES.find(
    (item) => item.code === normalized,
  )
  return match?.nativeLabel ?? 'English'
}

export type AssistantDetailLevel = 'concise' | 'detailed'

export function normalizeDetailLevel(raw: unknown): AssistantDetailLevel {
  return raw === 'detailed' ? 'detailed' : 'concise'
}
