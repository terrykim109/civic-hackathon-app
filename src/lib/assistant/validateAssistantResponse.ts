import {
  ASSISTANT_DEFAULT_LANGUAGE,
  normalizeAssistantLanguage,
} from './languages'
import type {
  AssistantCitation,
  AssistantEvidenceStatus,
  AssistantGlossaryTerm,
  AssistantSourceLink,
  AssistantTurnResponse,
  ResearchBrief,
} from './types'
import { validateResearchBrief } from './validateResearchBrief'

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function asOptionalString(value: unknown): string | null {
  if (value == null) return null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function parseSources(value: unknown): AssistantSourceLink[] {
  if (!Array.isArray(value)) return []
  const links: AssistantSourceLink[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const href = asString(row.href)
    if (!href || !/^https?:\/\//i.test(href)) continue
    links.push({
      label: asString(row.label) ?? 'Source',
      href,
    })
  }
  return links.slice(0, 8)
}

function parseCitations(
  value: unknown,
  allowedHrefs?: ReadonlySet<string>,
): AssistantCitation[] {
  if (!Array.isArray(value)) return []
  const citations: AssistantCitation[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const href = asString(row.href)
    if (!href || !/^https?:\/\//i.test(href)) continue
    if (allowedHrefs && !allowedHrefs.has(href)) continue
    citations.push({
      label: asString(row.label) ?? 'Source',
      href,
      passage: asOptionalString(row.passage)?.slice(0, 700) ?? null,
      recordId: asOptionalString(row.recordId),
      isOriginalPassage: row.isOriginalPassage !== false,
    })
    if (citations.length >= 8) break
  }
  return citations
}

function parseOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const options: string[] = []
  for (const item of value) {
    const text = asString(item)
    if (!text) continue
    options.push(text.slice(0, 160))
    if (options.length >= 6) break
  }
  return options
}

function parseGlossary(value: unknown): AssistantGlossaryTerm[] {
  if (!Array.isArray(value)) return []
  const terms: AssistantGlossaryTerm[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const term = asString(row.term)
    const plainLanguage = asString(row.plainLanguage) ?? asString(row.definition)
    if (!term || !plainLanguage) continue
    terms.push({
      term: term.slice(0, 80),
      plainLanguage: plainLanguage.slice(0, 280),
    })
    if (terms.length >= 8) break
  }
  return terms
}

function parseEvidenceStatus(value: unknown): AssistantEvidenceStatus {
  if (
    value === 'retrieved' ||
    value === 'partial' ||
    value === 'unavailable' ||
    value === 'skipped'
  ) {
    return value
  }
  return 'skipped'
}

export type AssistantValidationResult =
  | { ok: true; data: AssistantTurnResponse }
  | { ok: false; error: string }

export interface ValidateAssistantResponseOptions {
  /** When set, citations whose href is not in this set are dropped (anti-invention). */
  allowedCitationHrefs?: ReadonlySet<string> | readonly string[]
  /** Server-known evidence status; preferred over model-supplied value. */
  evidenceStatus?: AssistantEvidenceStatus
  /** Server-ranked citations to merge when the model omits passages. */
  groundedCitations?: readonly AssistantCitation[]
  /** Known municipal record ids for brief grounding. */
  recordIds?: ReadonlySet<string> | readonly string[]
  /** When true, a missing/invalid brief is an error (research_brief mode). */
  requireResearchBrief?: boolean
  /** Preferred language echo from the request. */
  language?: string
}

/**
 * Validate / normalize model JSON before it reaches the browser.
 */
export function validateAssistantResponse(
  value: unknown,
  options?: ValidateAssistantResponseOptions,
): AssistantValidationResult {
  if (!value || typeof value !== 'object') {
    return { ok: false, error: 'Assistant response was empty or invalid.' }
  }

  const row = value as Record<string, unknown>
  const message = asString(row.message)
  if (!message) {
    return { ok: false, error: 'Assistant response was missing a message.' }
  }

  const conversationComplete = row.conversationComplete === true
  const nextQuestion = conversationComplete
    ? null
    : asOptionalString(row.nextQuestion)

  const allowed =
    options?.allowedCitationHrefs == null
      ? undefined
      : options.allowedCitationHrefs instanceof Set
        ? options.allowedCitationHrefs
        : new Set(options.allowedCitationHrefs)

  let citations = parseCitations(row.citations, allowed)
  const sources = parseSources(row.sources).filter((source) =>
    allowed ? allowed.has(source.href) : true,
  )

  if (citations.length === 0 && options?.groundedCitations?.length) {
    citations = options.groundedCitations
      .filter((c) => (allowed ? allowed.has(c.href) : true))
      .slice(0, 8)
  }

  const evidenceStatus =
    options?.evidenceStatus ?? parseEvidenceStatus(row.evidenceStatus)

  const researchBrief: ResearchBrief | null = validateResearchBrief(
    row.researchBrief,
    {
      allowedCitationHrefs: allowed,
      groundedCitations: options?.groundedCitations ?? citations,
      evidenceStatus,
      recordIds: options?.recordIds,
    },
  )

  if (options?.requireResearchBrief && !researchBrief) {
    return {
      ok: false,
      error: 'Research brief was missing or could not be validated.',
    }
  }

  const briefSources: AssistantSourceLink[] = []
  if (researchBrief) {
    for (const section of researchBrief.sections) {
      for (const finding of section.findings) {
        for (const citation of finding.citations) {
          if (briefSources.some((s) => s.href === citation.href)) continue
          briefSources.push({ label: citation.label, href: citation.href })
        }
      }
    }
  }

  const mergedSources =
    sources.length > 0
      ? sources
      : citations.length > 0
        ? citations.map((c) => ({ label: c.label, href: c.href })).slice(0, 8)
        : briefSources.slice(0, 8)

  return {
    ok: true,
    data: {
      message: message.slice(0, 4000),
      nextQuestion: nextQuestion ? nextQuestion.slice(0, 500) : null,
      options: parseOptions(row.options),
      researchFocus: asOptionalString(row.researchFocus)?.slice(0, 200) ?? null,
      sources: mergedSources,
      citations,
      evidenceStatus,
      conversationComplete,
      researchBrief,
      language: normalizeAssistantLanguage(
        asOptionalString(row.language) ?? options?.language ?? ASSISTANT_DEFAULT_LANGUAGE,
      ),
      glossary: parseGlossary(row.glossary),
      detailedExplanation:
        asOptionalString(row.detailedExplanation)?.slice(0, 4000) ?? null,
      comparisonNote: asOptionalString(row.comparisonNote)?.slice(0, 800) ?? null,
    },
  }
}

export function trimAssistantHistory<T extends { content: string }>(
  history: readonly T[],
  maxTurns: number,
): T[] {
  if (history.length <= maxTurns) return [...history]
  return history.slice(history.length - maxTurns)
}

/** Collect hrefs already associated with the selected area (for client-side grounding). */
export function collectAreaCitationHrefs(
  area: {
    records: Array<{
      sources?: Array<{ href?: string }>
      evidenceRefs?: Array<{ href?: string }>
    }>
  },
): string[] {
  const seen = new Set<string>()
  const hrefs: string[] = []
  for (const record of area.records) {
    for (const ref of [
      ...(record.evidenceRefs ?? []),
      ...(record.sources ?? []),
    ]) {
      const href = ref.href?.trim()
      if (!href || !/^https?:\/\//i.test(href) || seen.has(href)) continue
      seen.add(href)
      hrefs.push(href)
    }
  }
  return hrefs
}
