import {
  RESEARCH_BRIEF_SECTION_ORDER,
  RESEARCH_BRIEF_SECTION_TITLES,
  type AssistantCitation,
  type AssistantEvidenceStatus,
  type ResearchBrief,
  type ResearchBriefFinding,
  type ResearchBriefSection,
  type ResearchBriefSectionId,
  type ResearchClaimKind,
} from './types'

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

function parseClaimKind(value: unknown): ResearchClaimKind | null {
  if (
    value === 'documented_fact' ||
    value === 'potential_impact' ||
    value === 'hypothetical' ||
    value === 'uncertainty'
  ) {
    return value
  }
  return null
}

function parseSectionId(value: unknown): ResearchBriefSectionId | null {
  if (
    value === 'overview' ||
    value === 'relevantProposals' ||
    value === 'documentedFacts' ||
    value === 'potentialImpacts' ||
    value === 'stakeholderConsiderations' ||
    value === 'uncertainties' ||
    value === 'questionsWorthInvestigating'
  ) {
    return value
  }
  return null
}

function parseCitations(
  value: unknown,
  allowedHrefs?: ReadonlySet<string>,
  groundedByHref?: ReadonlyMap<string, AssistantCitation>,
): AssistantCitation[] {
  if (!Array.isArray(value)) return []
  const citations: AssistantCitation[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const href = asString(row.href)
    if (!href || !/^https?:\/\//i.test(href)) continue
    if (allowedHrefs && !allowedHrefs.has(href)) continue
    const grounded = groundedByHref?.get(href)
    citations.push({
      label: asString(row.label) ?? grounded?.label ?? 'Source',
      href,
      passage:
        asOptionalString(row.passage)?.slice(0, 700) ?? grounded?.passage ?? null,
      recordId: asOptionalString(row.recordId) ?? grounded?.recordId ?? null,
    })
    if (citations.length >= 4) break
  }
  return citations
}

function defaultKindForSection(sectionId: ResearchBriefSectionId): ResearchClaimKind {
  switch (sectionId) {
    case 'documentedFacts':
    case 'relevantProposals':
    case 'overview':
      return 'documented_fact'
    case 'potentialImpacts':
    case 'stakeholderConsiderations':
      return 'potential_impact'
    case 'questionsWorthInvestigating':
      return 'uncertainty'
    case 'uncertainties':
      return 'uncertainty'
  }
}

/**
 * Validate / normalize a structured research brief.
 * Drops empty sections, invented citations, and unsupported documented facts.
 */
export function validateResearchBrief(
  value: unknown,
  options?: {
    allowedCitationHrefs?: ReadonlySet<string> | readonly string[]
    groundedCitations?: readonly AssistantCitation[]
    evidenceStatus?: AssistantEvidenceStatus
    recordIds?: ReadonlySet<string> | readonly string[]
  },
): ResearchBrief | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>

  const allowed =
    options?.allowedCitationHrefs == null
      ? undefined
      : options.allowedCitationHrefs instanceof Set
        ? options.allowedCitationHrefs
        : new Set(options.allowedCitationHrefs)

  const recordIds =
    options?.recordIds == null
      ? undefined
      : options.recordIds instanceof Set
        ? options.recordIds
        : new Set(options.recordIds)

  const groundedByHref = new Map<string, AssistantCitation>()
  for (const citation of options?.groundedCitations ?? []) {
    if (!groundedByHref.has(citation.href)) {
      groundedByHref.set(citation.href, citation)
    }
  }

  const sectionsIn = Array.isArray(row.sections) ? row.sections : []
  const byId = new Map<ResearchBriefSectionId, ResearchBriefFinding[]>()

  for (const item of sectionsIn) {
    if (!item || typeof item !== 'object') continue
    const sectionRow = item as Record<string, unknown>
    const sectionId = parseSectionId(sectionRow.id)
    if (!sectionId) continue

    const findingsRaw = Array.isArray(sectionRow.findings)
      ? sectionRow.findings
      : Array.isArray(sectionRow.items)
        ? sectionRow.items
        : []

    const findings: ResearchBriefFinding[] = []
    for (const [index, findingRaw] of findingsRaw.entries()) {
      if (!findingRaw || typeof findingRaw !== 'object') continue
      const finding = findingRaw as Record<string, unknown>
      const text = asString(finding.text) ?? asString(finding.claim)
      if (!text) continue

      let kind =
        parseClaimKind(finding.kind) ?? defaultKindForSection(sectionId)
      const citations = parseCitations(
        finding.citations ?? finding.sources,
        allowed,
        groundedByHref,
      )

      // Documented facts need a grounded source or known municipal record id.
      if (kind === 'documented_fact') {
        const recordId = asOptionalString(finding.recordId) ?? citations[0]?.recordId
        const hasRecord = recordId != null && (!recordIds || recordIds.has(recordId))
        if (citations.length === 0 && !hasRecord) {
          kind = 'uncertainty'
        }
      }

      // Never keep unsupported affordability/displacement-style claims as facts.
      if (
        kind === 'documented_fact' &&
        /\b(affordab|displac|financial impact|legal outcome|will cause|guaranteed)\b/i.test(
          text,
        ) &&
        citations.length === 0
      ) {
        kind = 'hypothetical'
      }

      findings.push({
        id:
          asString(finding.id) ??
          `${sectionId}-${index + 1}`,
        text: text.slice(0, 800),
        kind,
        citations,
      })
      if (findings.length >= 8) break
    }

    if (findings.length > 0) {
      byId.set(sectionId, findings)
    }
  }

  const sections: ResearchBriefSection[] = []
  for (const sectionId of RESEARCH_BRIEF_SECTION_ORDER) {
    const findings = byId.get(sectionId)
    if (!findings?.length) continue
    sections.push({
      id: sectionId,
      title: RESEARCH_BRIEF_SECTION_TITLES[sectionId],
      findings,
    })
  }

  if (sections.length === 0) return null

  return {
    title: asString(row.title) ?? 'Municipal research brief',
    focus: asOptionalString(row.focus)?.slice(0, 200) ?? null,
    evidenceStatus: options?.evidenceStatus ?? parseEvidenceStatus(row.evidenceStatus),
    summaryNote: asOptionalString(row.summaryNote)?.slice(0, 500) ?? null,
    sections,
  }
}

/** Build a minimal uncertainty brief when the model fails but evidence/records exist. */
export function fallbackResearchBrief(input: {
  areaLabel: string
  evidenceStatus: AssistantEvidenceStatus
  note: string
}): ResearchBrief {
  return {
    title: `Research brief: ${input.areaLabel}`,
    focus: null,
    evidenceStatus: input.evidenceStatus,
    summaryNote: input.note,
    sections: [
      {
        id: 'uncertainties',
        title: RESEARCH_BRIEF_SECTION_TITLES.uncertainties,
        findings: [
          {
            id: 'uncertainty-1',
            text: input.note,
            kind: 'uncertainty',
            citations: [],
          },
        ],
      },
    ],
  }
}
