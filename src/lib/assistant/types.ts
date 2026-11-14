import type { LngLat } from '../../types/map'
import type { AssistantDetailLevel } from './languages'

export interface AssistantSourceLink {
  label: string
  href: string
}

/** Official evidence URL associated with a municipal record (for server-side retrieval). */
export interface AssistantEvidenceRef {
  label: string
  href: string
  kind: 'source' | 'evidence' | 'related'
  recordId: string
}

/** Compact municipal record summary sent to the LLM (no invented fields). */
export interface AssistantRecordSummary {
  id: string
  title: string
  category: string
  municipalStatus: string
  decisionStatus: string | null
  participation: string
  summary: string | null
  /** Straight-line distance in metres when computed from a search origin. */
  distanceMeters: number | null
  sources: AssistantSourceLink[]
  /** Deduped official URLs available for server-side evidence retrieval. */
  evidenceRefs: AssistantEvidenceRef[]
}

export interface AssistantAreaContext {
  label: string
  coordinates: LngLat | null
  wardId: string | null
  wardName: string | null
  records: AssistantRecordSummary[]
  proximityNote: string
}

export interface AssistantChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export type AssistantTurnMode = 'converse' | 'research_brief'

export interface AssistantTurnRequest {
  area: AssistantAreaContext
  history: AssistantChatMessage[]
  /** Latest resident reply (option click or free text). Empty for the opening turn. */
  userMessage: string
  clientKey: string
  /** Default converse; research_brief generates a structured evidence-based summary. */
  mode?: AssistantTurnMode
  /** Preferred response language (supported ISO code). */
  language?: string
  /** Concise answers by default; detailed on request. */
  detailLevel?: AssistantDetailLevel
}

export interface AssistantCitation {
  label: string
  href: string
  passage: string | null
  recordId: string | null
  /** True when passage text is an official excerpt (not a translation). */
  isOriginalPassage?: boolean
}

export type AssistantEvidenceStatus =
  | 'retrieved'
  | 'partial'
  | 'unavailable'
  | 'skipped'

/** How a research-brief finding should be read by residents. */
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
  evidenceStatus: AssistantEvidenceStatus
  summaryNote: string | null
  sections: ResearchBriefSection[]
}

export interface AssistantGlossaryTerm {
  term: string
  plainLanguage: string
}

export interface AssistantTurnResponse {
  message: string
  nextQuestion: string | null
  /** Suggested follow-ups only — residents may always type freely. */
  options: string[]
  researchFocus: string | null
  sources: AssistantSourceLink[]
  citations: AssistantCitation[]
  evidenceStatus: AssistantEvidenceStatus
  conversationComplete: boolean
  researchBrief: ResearchBrief | null
  language: string
  glossary: AssistantGlossaryTerm[]
  /** Optional longer explanation when detailLevel is detailed or model provides one. */
  detailedExplanation: string | null
  /**
   * When a comparison was requested but evidence is insufficient,
   * explain why comparison was limited or refused.
   */
  comparisonNote: string | null
}

export const ASSISTANT_MAX_HISTORY_TURNS = 16
export const ASSISTANT_MAX_USER_CHARS = 1200
export const ASSISTANT_MAX_RECORDS = 12
export const ASSISTANT_MAX_EVIDENCE_REFS = 8
export const ASSISTANT_FUNCTION_NAME = 'municipal-research-assistant'

export const RESEARCH_BRIEF_SECTION_TITLES: Record<
  ResearchBriefSectionId,
  string
> = {
  overview: 'Research overview',
  relevantProposals: 'Relevant proposals',
  documentedFacts: 'Documented facts',
  potentialImpacts: 'Potential impacts',
  stakeholderConsiderations: 'Stakeholder considerations',
  uncertainties: 'Uncertainties',
  questionsWorthInvestigating: 'Questions worth investigating',
}

export const RESEARCH_BRIEF_SECTION_ORDER: ResearchBriefSectionId[] = [
  'overview',
  'relevantProposals',
  'documentedFacts',
  'potentialImpacts',
  'stakeholderConsiderations',
  'uncertainties',
  'questionsWorthInvestigating',
]

export const PROXIMITY_DISCLAIMER =
  'Distances are straight-line only. Nearby proposals are not proof that this location or its residents are affected.'
