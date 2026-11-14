// Structured research-brief validation for the Edge Function.

export type ResearchClaimKind =
  | 'documented_fact'
  | 'potential_impact'
  | 'hypothetical'
  | 'uncertainty'

export type ResearchBriefSectionId =
  | 'overview'
  | 'relevantProposals'
  | 'documentedFacts'
  | 'potentialImpacts'
  | 'stakeholderConsiderations'
  | 'uncertainties'
  | 'questionsWorthInvestigating'

export interface AssistantCitation {
  label: string
  href: string
  passage: string | null
  recordId: string | null
}

export interface ResearchBriefFinding {
  id: string
  text: string
  kind: ResearchClaimKind
  citations: AssistantCitation[]
}

export interface ResearchBriefSection {
  id: ResearchBriefSectionId
  title: string
  findings: ResearchBriefFinding[]
}

export interface ResearchBrief {
  title: string
  focus: string | null
  evidenceStatus: 'retrieved' | 'partial' | 'unavailable' | 'skipped'
  summaryNote: string | null
  sections: ResearchBriefSection[]
}

const SECTION_TITLES: Record<ResearchBriefSectionId, string> = {
  overview: 'Research overview',
  relevantProposals: 'Relevant proposals',
  documentedFacts: 'Documented facts',
  potentialImpacts: 'Potential impacts',
  stakeholderConsiderations: 'Stakeholder considerations',
  uncertainties: 'Uncertainties',
  questionsWorthInvestigating: 'Questions worth investigating',
}

const SECTION_ORDER: ResearchBriefSectionId[] = [
  'overview',
  'relevantProposals',
  'documentedFacts',
  'potentialImpacts',
  'stakeholderConsiderations',
  'uncertainties',
  'questionsWorthInvestigating',
]

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

function parseSectionId(value: unknown): ResearchBriefSectionId | null {
  return SECTION_ORDER.includes(value as ResearchBriefSectionId)
    ? (value as ResearchBriefSectionId)
    : null
}

function parseKind(value: unknown): ResearchClaimKind | null {
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

function defaultKind(sectionId: ResearchBriefSectionId): ResearchClaimKind {
  if (
    sectionId === 'potentialImpacts' ||
    sectionId === 'stakeholderConsiderations'
  ) {
    return 'potential_impact'
  }
  if (
    sectionId === 'uncertainties' ||
    sectionId === 'questionsWorthInvestigating'
  ) {
    return 'uncertainty'
  }
  return 'documented_fact'
}

function parseCitations(
  value: unknown,
  allowed: ReadonlySet<string>,
  grounded: ReadonlyMap<string, AssistantCitation>,
): AssistantCitation[] {
  if (!Array.isArray(value)) return []
  const out: AssistantCitation[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const href = asString(row.href)
    if (!href || !allowed.has(href)) continue
    const match = grounded.get(href)
    out.push({
      label: asString(row.label) ?? match?.label ?? 'Source',
      href,
      passage: asOptionalString(row.passage)?.slice(0, 700) ?? match?.passage ?? null,
      recordId: asOptionalString(row.recordId) ?? match?.recordId ?? null,
    })
    if (out.length >= 4) break
  }
  return out
}

export function validateResearchBrief(
  value: unknown,
  options: {
    allowedHrefs: ReadonlySet<string>
    groundedCitations: readonly AssistantCitation[]
    evidenceStatus: ResearchBrief['evidenceStatus']
    recordIds: ReadonlySet<string>
  },
): ResearchBrief | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const grounded = new Map<string, AssistantCitation>()
  for (const citation of options.groundedCitations) {
    if (!grounded.has(citation.href)) grounded.set(citation.href, citation)
  }

  const byId = new Map<ResearchBriefSectionId, ResearchBriefFinding[]>()
  const sectionsIn = Array.isArray(row.sections) ? row.sections : []

  for (const item of sectionsIn) {
    if (!item || typeof item !== 'object') continue
    const sectionRow = item as Record<string, unknown>
    const sectionId = parseSectionId(sectionRow.id)
    if (!sectionId) continue
    const findingsRaw = Array.isArray(sectionRow.findings)
      ? sectionRow.findings
      : []
    const findings: ResearchBriefFinding[] = []
    for (const [index, findingRaw] of findingsRaw.entries()) {
      if (!findingRaw || typeof findingRaw !== 'object') continue
      const finding = findingRaw as Record<string, unknown>
      const text = asString(finding.text)
      if (!text) continue
      let kind = parseKind(finding.kind) ?? defaultKind(sectionId)
      const citations = parseCitations(
        finding.citations,
        options.allowedHrefs,
        grounded,
      )
      if (kind === 'documented_fact') {
        const recordId =
          asOptionalString(finding.recordId) ?? citations[0]?.recordId
        const hasRecord =
          recordId != null && options.recordIds.has(recordId)
        if (citations.length === 0 && !hasRecord) {
          kind = 'uncertainty'
        }
      }
      findings.push({
        id: asString(finding.id) ?? `${sectionId}-${index + 1}`,
        text: text.slice(0, 800),
        kind,
        citations,
      })
      if (findings.length >= 8) break
    }
    if (findings.length > 0) byId.set(sectionId, findings)
  }

  const sections: ResearchBriefSection[] = []
  for (const sectionId of SECTION_ORDER) {
    const findings = byId.get(sectionId)
    if (!findings?.length) continue
    sections.push({
      id: sectionId,
      title: SECTION_TITLES[sectionId],
      findings,
    })
  }
  if (sections.length === 0) return null

  return {
    title: asString(row.title) ?? 'Municipal research brief',
    focus: asOptionalString(row.focus)?.slice(0, 200) ?? null,
    evidenceStatus: options.evidenceStatus,
    summaryNote: asOptionalString(row.summaryNote)?.slice(0, 500) ?? null,
    sections,
  }
}

export function fallbackResearchBrief(input: {
  areaLabel: string
  evidenceStatus: ResearchBrief['evidenceStatus']
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
        title: SECTION_TITLES.uncertainties,
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
