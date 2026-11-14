// Supabase Edge Function: CivicLens municipal research assistant via OpenRouter.
// Secrets: OPENROUTER_API_KEY, optional OPENROUTER_MODEL
// Evidence: official municipal URLs only (see evidence.ts) — no unrestricted crawling.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  fallbackResearchBrief,
  validateResearchBrief,
  type ResearchBrief,
} from './brief.ts'
import { retrieveEvidencePack, type EvidencePack } from './evidence.ts'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const MAX_HISTORY = 16
const MAX_USER_CHARS = 1200
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 12
const SUPPORTED_LANGUAGES = new Set([
  'en',
  'fr',
  'zh',
  'es',
  'pt',
  'ta',
  'pa',
  'ar',
])

type RateBucket = { windowStarted: number; count: number }
const rateBuckets = new Map<string, RateBucket>()

interface AssistantSourceLink {
  label: string
  href: string
}

interface AssistantEvidenceRef {
  label: string
  href: string
  kind: string
  recordId: string
}

interface AssistantRecordSummary {
  id: string
  title: string
  category: string
  municipalStatus: string
  decisionStatus: string | null
  participation: string
  summary: string | null
  distanceMeters: number | null
  sources: AssistantSourceLink[]
  evidenceRefs?: AssistantEvidenceRef[]
}

interface AssistantAreaContext {
  label: string
  coordinates: [number, number] | null
  wardId: string | null
  wardName: string | null
  records: AssistantRecordSummary[]
  proximityNote: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

type TurnMode = 'converse' | 'research_brief'

interface TurnRequest {
  area: AssistantAreaContext
  history: ChatMessage[]
  userMessage: string
  clientKey: string
  mode: TurnMode
  language: string
  detailLevel: 'concise' | 'detailed'
}

interface AssistantCitation {
  label: string
  href: string
  passage: string | null
  recordId: string | null
  isOriginalPassage?: boolean
}

interface AssistantGlossaryTerm {
  term: string
  plainLanguage: string
}

interface TurnResponse {
  message: string
  nextQuestion: string | null
  options: string[]
  researchFocus: string | null
  sources: AssistantSourceLink[]
  citations: AssistantCitation[]
  evidenceStatus: EvidencePack['status']
  conversationComplete: boolean
  researchBrief: ResearchBrief | null
  language: string
  glossary: AssistantGlossaryTerm[]
  detailedExplanation: string | null
  comparisonNote: string | null
}

function normalizeLanguage(raw: unknown): string {
  if (typeof raw !== 'string') return 'en'
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) return 'en'
  const primary = trimmed.split(/[-_]/)[0] ?? trimmed
  if (SUPPORTED_LANGUAGES.has(primary)) return primary
  return 'en'
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function takeRateLimit(key: string): boolean {
  const now = Date.now()
  const bucket = rateBuckets.get(key)
  if (!bucket || now - bucket.windowStarted > RATE_WINDOW_MS) {
    rateBuckets.set(key, { windowStarted: now, count: 1 })
    return true
  }
  if (bucket.count >= RATE_MAX) return false
  bucket.count += 1
  return true
}

function normalizeEvidenceRefs(value: unknown, recordId: string): AssistantEvidenceRef[] {
  if (!Array.isArray(value)) return []
  const refs: AssistantEvidenceRef[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const href = asString(row.href)
    if (!href) continue
    refs.push({
      label: asString(row.label) ?? 'Official source',
      href,
      kind: asString(row.kind) ?? 'source',
      recordId: asString(row.recordId) ?? recordId,
    })
  }
  return refs.slice(0, 8)
}

function normalizeRecords(value: unknown): AssistantRecordSummary[] {
  if (!Array.isArray(value)) return []
  const records: AssistantRecordSummary[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const id = asString(row.id) ?? `record-${records.length}`
    const sourcesRaw = Array.isArray(row.sources) ? row.sources : []
    const sources: AssistantSourceLink[] = []
    for (const source of sourcesRaw) {
      if (!source || typeof source !== 'object') continue
      const src = source as Record<string, unknown>
      const href = asString(src.href)
      if (!href) continue
      sources.push({
        label: asString(src.label) ?? 'Official source',
        href,
      })
    }
    records.push({
      id,
      title: asString(row.title) ?? id,
      category: asString(row.category) ?? 'unknown',
      municipalStatus: asString(row.municipalStatus) ?? 'unknown',
      decisionStatus: asString(row.decisionStatus),
      participation: asString(row.participation) ?? 'unknown',
      summary: asString(row.summary),
      distanceMeters:
        typeof row.distanceMeters === 'number' && Number.isFinite(row.distanceMeters)
          ? row.distanceMeters
          : null,
      sources: sources.slice(0, 4),
      evidenceRefs: normalizeEvidenceRefs(row.evidenceRefs, id),
    })
    if (records.length >= 12) break
  }
  return records
}

function validateIncoming(body: unknown): TurnRequest | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body is required.' }
  }
  const row = body as Record<string, unknown>
  const areaRaw = row.area
  if (!areaRaw || typeof areaRaw !== 'object') {
    return { error: 'Area context is required.' }
  }
  const areaObj = areaRaw as Record<string, unknown>
  const label = asString(areaObj.label) ?? 'Selected area'

  const historyIn = Array.isArray(row.history) ? row.history : []
  const history: ChatMessage[] = []
  for (const item of historyIn) {
    if (!item || typeof item !== 'object') continue
    const msg = item as Record<string, unknown>
    const role = msg.role === 'assistant' ? 'assistant' : 'user'
    const content = asString(msg.content)
    if (!content) continue
    history.push({ role, content: content.slice(0, 4000) })
  }

  return {
    area: {
      label,
      coordinates: Array.isArray(areaObj.coordinates)
        ? (areaObj.coordinates as [number, number])
        : null,
      wardId: asString(areaObj.wardId),
      wardName: asString(areaObj.wardName),
      records: normalizeRecords(areaObj.records),
      proximityNote:
        asString(areaObj.proximityNote) ??
        'Distances are straight-line only. Nearby proposals are not proof of impact.',
    },
    history: history.slice(-MAX_HISTORY),
    userMessage: (asString(row.userMessage) ?? '').slice(0, MAX_USER_CHARS),
    clientKey: (asString(row.clientKey) ?? 'anonymous').slice(0, 80),
    mode: row.mode === 'research_brief' ? 'research_brief' : 'converse',
    language: normalizeLanguage(row.language),
    detailLevel: row.detailLevel === 'detailed' ? 'detailed' : 'concise',
  }
}

function citationsFromPack(pack: EvidencePack): AssistantCitation[] {
  const seen = new Set<string>()
  const citations: AssistantCitation[] = []
  for (const passage of pack.passages) {
    if (seen.has(passage.href)) continue
    seen.add(passage.href)
    citations.push({
      label: passage.title || 'Official source',
      href: passage.href,
      passage: passage.passage.slice(0, 700),
      recordId: passage.recordId,
    })
    if (citations.length >= 8) break
  }
  return citations
}

function collectRecordSourceHrefs(area: AssistantAreaContext): string[] {
  const hrefs: string[] = []
  const seen = new Set<string>()
  for (const record of area.records) {
    for (const ref of [...(record.evidenceRefs ?? []), ...record.sources]) {
      if (!ref.href || seen.has(ref.href)) continue
      if (!/^https:\/\//i.test(ref.href)) continue
      seen.add(ref.href)
      hrefs.push(ref.href)
    }
  }
  return hrefs
}

function parseGlossary(value: unknown): AssistantGlossaryTerm[] {
  if (!Array.isArray(value)) return []
  const terms: AssistantGlossaryTerm[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const term = asString(row.term)
    const plain = asString(row.plainLanguage) ?? asString(row.definition)
    if (!term || !plain) continue
    terms.push({ term: term.slice(0, 80), plainLanguage: plain.slice(0, 280) })
    if (terms.length >= 8) break
  }
  return terms
}

function validateModelJson(
  value: unknown,
  pack: EvidencePack,
  area: AssistantAreaContext,
  mode: TurnMode,
  language: string,
): TurnResponse | { error: string } {
  if (!value || typeof value !== 'object') {
    return { error: 'Model returned an empty response.' }
  }
  const row = value as Record<string, unknown>
  const message = asString(row.message)
  if (!message) return { error: 'Model response missing message.' }

  // Keep conversation open for free-text follow-ups (including after briefs).
  const conversationComplete =
    mode === 'research_brief' ? false : row.conversationComplete === true
  const nextQuestion = conversationComplete
    ? null
    : asString(row.nextQuestion)

  const options: string[] = []
  if (Array.isArray(row.options)) {
    for (const item of row.options) {
      const text = asString(item)
      if (!text) continue
      options.push(text.slice(0, 160))
      if (options.length >= 6) break
    }
  }

  const allowed = new Set([
    ...pack.allowedHrefs,
    ...collectRecordSourceHrefs(area),
  ])
  for (const passage of pack.passages) allowed.add(passage.href)

  const grounded = citationsFromPack(pack)
  const citations: AssistantCitation[] = []
  if (Array.isArray(row.citations)) {
    for (const item of row.citations) {
      if (!item || typeof item !== 'object') continue
      const src = item as Record<string, unknown>
      const href = asString(src.href)
      if (!href || !allowed.has(href)) continue
      const groundedMatch = grounded.find((c) => c.href === href)
      citations.push({
        label: asString(src.label) ?? groundedMatch?.label ?? 'Source',
        href,
        passage:
          asString(src.passage)?.slice(0, 700) ??
          groundedMatch?.passage ??
          null,
        recordId: asString(src.recordId) ?? groundedMatch?.recordId ?? null,
        isOriginalPassage: src.isOriginalPassage !== false,
      })
      if (citations.length >= 8) break
    }
  }
  if (citations.length === 0) citations.push(...grounded)

  const sources: AssistantSourceLink[] = []
  if (Array.isArray(row.sources)) {
    for (const item of row.sources) {
      if (!item || typeof item !== 'object') continue
      const src = item as Record<string, unknown>
      const href = asString(src.href)
      if (!href || !allowed.has(href)) continue
      sources.push({
        label: asString(src.label) ?? 'Source',
        href,
      })
    }
  }
  if (sources.length === 0) {
    for (const c of citations) {
      sources.push({ label: c.label, href: c.href })
      if (sources.length >= 8) break
    }
  }

  const recordIds = new Set(area.records.map((record) => record.id))
  let researchBrief =
    mode === 'research_brief' || row.researchBrief
      ? validateResearchBrief(row.researchBrief, {
          allowedHrefs: allowed,
          groundedCitations: grounded.length > 0 ? grounded : citations,
          evidenceStatus: pack.status,
          recordIds,
        })
      : null

  if (mode === 'research_brief' && !researchBrief) {
    researchBrief = fallbackResearchBrief({
      areaLabel: area.label,
      evidenceStatus: pack.status,
      note:
        pack.status === 'unavailable' || pack.status === 'skipped'
          ? 'Available municipal records and official documents were insufficient to assemble a full research brief. Ask a follow-up about a specific proposal, or check the linked official sources directly.'
          : 'The model returned an incomplete research brief. Available evidence was preserved in citations where possible; ask a follow-up to refine a specific section.',
    })
  }

  return {
    message: message.slice(0, 4000),
    nextQuestion: nextQuestion ? nextQuestion.slice(0, 500) : null,
    options,
    researchFocus: asString(row.researchFocus)?.slice(0, 200) ?? null,
    sources: sources.slice(0, 8),
    citations: citations.slice(0, 8),
    evidenceStatus: pack.status,
    conversationComplete,
    researchBrief,
    language: normalizeLanguage(asString(row.language) ?? language),
    glossary: parseGlossary(row.glossary),
    detailedExplanation: asString(row.detailedExplanation)?.slice(0, 4000) ?? null,
    comparisonNote: asString(row.comparisonNote)?.slice(0, 800) ?? null,
  }
}

function buildEvidenceQuery(req: TurnRequest): string {
  if (req.mode === 'research_brief') {
    const interests = req.history
      .filter((item) => item.role === 'user')
      .map((item) => item.content)
      .slice(-4)
      .join(' ')
    const titles = req.area.records
      .slice(0, 4)
      .map((r) => r.title)
      .join(' ')
    return `${req.area.label} ${interests} ${req.userMessage} ${titles}`.trim()
  }
  if (req.userMessage.trim()) return req.userMessage.trim()
  const titles = req.area.records
    .slice(0, 4)
    .map((r) => r.title)
    .join(' ')
  return `${req.area.label} ${titles}`.trim()
}

function evidencePayload(pack: EvidencePack) {
  return {
    status: pack.status,
    retrievalNotes: pack.documents.map((d) => ({
      href: d.href,
      title: d.title,
      organization: d.organization,
      ok: d.ok,
      reason: d.reason ?? null,
    })),
    passages: pack.passages.map((p) => ({
      href: p.href,
      title: p.title,
      organization: p.organization,
      recordId: p.recordId,
      passage: p.passage,
    })),
  }
}

function buildSystemPrompt(
  area: AssistantAreaContext,
  pack: EvidencePack,
  mode: TurnMode,
  language: string,
  detailLevel: 'concise' | 'detailed',
): string {
  const shared = [
    'You are the CivicSync explorer assistant for Toronto residents.',
    'Use ONLY the supplied municipal records JSON and retrievedEvidence JSON.',
    'Never invent proposals, decisions, deadlines, impacts, quotations, statistics, stakeholder experiences, legal interpretations, or citations.',
    'Ground factual claims in retrievedEvidence.passages or explicit municipal record fields.',
    'Distinguish documented facts from potential impacts, hypothetical scenarios, and unknowns.',
    'Never present inferred impacts as official municipal findings.',
    'Do not make unsupported claims about affordability, displacement, financial consequences, environmental effects, or legal outcomes.',
    'If evidence could not be retrieved or does not answer the question, say so clearly.',
    'Identify conflicting or outdated sources when the supplied material shows that.',
    'Never treat geographic proximity as proof that residents are affected.',
    'Residents may ask free-text questions at any time; options are suggestions only, never required.',
    'Support deeper research: specific proposals, stakeholder considerations, approval stages, outstanding decisions, alternatives/trade-offs, and comparisons ONLY when sufficient evidence exists for each compared record.',
    'If a comparison is requested but evidence is insufficient, refuse the comparison in comparisonNote and explain what is missing.',
    `Respond in language code "${language}". Accept questions in other languages but answer in the selected language.`,
    'Explain municipal terminology in plain language the first time it appears; include glossary entries for those terms.',
    'Prefer plain language over institutional jargon. Break complicated decisions into understandable stages.',
    detailLevel === 'detailed'
      ? 'Provide a fuller explanation in detailedExplanation while keeping message concise.'
      : 'Keep message concise by default; put optional extra detail in detailedExplanation only when useful.',
    'Do not translate official source passages in a way that changes meaning. Keep citation.passage as the original excerpt when possible and set isOriginalPassage true. Put translated explanations in message/detailedExplanation, not inside official quotations.',
    'Retain original official source links unchanged.',
    'Area context JSON:',
    JSON.stringify(area),
    'retrievedEvidence JSON:',
    JSON.stringify(evidencePayload(pack)),
  ]

  const responseKeys = [
    'Reply with a single JSON object only (no markdown) using keys:',
    'message, nextQuestion, options (suggested follow-ups only), researchFocus,',
    'sources ({label,href}[]), citations ({label,href,passage,recordId,isOriginalPassage}[]),',
    'evidenceStatus, conversationComplete, researchBrief,',
    'language, glossary ({term,plainLanguage}[]), detailedExplanation, comparisonNote.',
  ]

  if (mode === 'research_brief') {
    return [
      ...shared,
      'Generate a structured research brief for the resident based on the conversation history and evidence.',
      'Only include sections that are supported by available evidence or clear unknowns.',
      ...responseKeys,
      'researchBrief ({ title, focus, summaryNote, sections: [{ id, findings: [{ id, text, kind, citations }] }] }).',
      'researchBrief.sections ids must be from:',
      'overview, relevantProposals, documentedFacts, potentialImpacts, stakeholderConsiderations, uncertainties, questionsWorthInvestigating.',
      'finding.kind must be one of: documented_fact, potential_impact, hypothetical, uncertainty.',
      'Documented facts must cite allowed official hrefs from retrievedEvidence or record sources.',
      'Potential impacts and stakeholder notes must be labeled as possible/relevant considerations, not findings.',
      'Omit empty sections. Keep conversationComplete false so the resident can ask about the brief.',
      `Set language to "${language}".`,
    ].join('\n')
  }

  return [
    ...shared,
    ...responseKeys,
    'researchBrief should be null for normal turns unless the resident asked for a brief.',
    'Keep conversationComplete false unless the resident clearly wants to end.',
    'Adapt to the resident question; do not repeatedly return a generic area summary.',
    `Set language to "${language}".`,
  ].join('\n')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const authHeader = req.headers.get('Authorization') ?? ''
    const apiKeyHeader = req.headers.get('apikey') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()

    if (!supabaseUrl || !supabaseAnon) {
      return jsonResponse({ error: 'Unauthorized.' }, 401)
    }

    // Public map users may call with the anon key; signed-in admins may send a
    // user JWT. Accept either a matching anon credential or a verifiable user.
    const hasAnonCredential =
      token === supabaseAnon || apiKeyHeader === supabaseAnon
    if (!hasAnonCredential) {
      if (!token) {
        return jsonResponse({ error: 'Unauthorized.' }, 401)
      }
      const supabase = createClient(supabaseUrl, supabaseAnon, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      })
      const { error: userError } = await supabase.auth.getUser(token)
      if (userError) {
        // Expired/stale browser sessions should not block the public assistant
        // when the request still carries a valid project apikey.
        if (apiKeyHeader !== supabaseAnon) {
          return jsonResponse({ error: 'Unauthorized.' }, 401)
        }
      }
    }

    const apiKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!apiKey) {
      return jsonResponse(
        {
          error:
            'Explorer assistant is not configured (missing OPENROUTER_API_KEY on the Edge Function).',
        },
        503,
      )
    }

    const model =
      Deno.env.get('OPENROUTER_MODEL')?.trim() ||
      'openai/gpt-4.1-mini'

    const parsed = validateIncoming(await req.json())
    if ('error' in parsed) {
      return jsonResponse({ error: parsed.error }, 400)
    }

    const rateKey = `${parsed.clientKey}|${req.headers.get('x-forwarded-for') ?? 'unknown'}`
    if (!takeRateLimit(rateKey)) {
      return jsonResponse(
        { error: 'Too many assistant requests. Please wait a minute and try again.' },
        429,
      )
    }

    let evidencePack: EvidencePack
    try {
      evidencePack = await retrieveEvidencePack({
        records: parsed.area.records,
        query: buildEvidenceQuery(parsed),
      })
    } catch (error) {
      console.error('evidence retrieval failure', error)
      evidencePack = {
        status: 'unavailable',
        passages: [],
        documents: [],
        allowedHrefs: [],
      }
    }

    const messages: Array<{ role: string; content: string }> = [
      {
        role: 'system',
        content: buildSystemPrompt(
          parsed.area,
          evidencePack,
          parsed.mode,
          parsed.language,
          parsed.detailLevel,
        ),
      },
      ...parsed.history.map((item) => ({
        role: item.role,
        content: item.content,
      })),
    ]

    if (parsed.mode === 'research_brief') {
      messages.push({
        role: 'user',
        content:
          parsed.userMessage.trim() ||
          'Generate the structured evidence-based municipal research brief for this conversation. Include only sections supported by the supplied records and retrieved evidence. Invite free-text follow-up questions about the brief.',
      })
    } else if (parsed.userMessage) {
      messages.push({ role: 'user', content: parsed.userMessage })
    } else if (parsed.history.length === 0) {
      messages.push({
        role: 'user',
        content:
          'Start the guided research conversation for this area. Introduce the area briefly using only supplied records and retrieved evidence, ask what I want to investigate in free text, and suggest optional follow-up prompts (not required).',
      })
    }

    const temperature = parsed.mode === 'research_brief' ? 0.2 : 0.3
    const fallbackModel = 'openai/gpt-4o-mini'
    const openRouterResult = await callOpenRouter({
      apiKey,
      supabaseUrl,
      model,
      fallbackModel,
      temperature,
      messages,
    })

    if (!openRouterResult.ok) {
      console.error(
        'OpenRouter error',
        openRouterResult.status,
        openRouterResult.detail,
      )
      return jsonResponse(
        {
          error:
            openRouterResult.status === 401 || openRouterResult.status === 403
              ? 'Explorer assistant could not authenticate with the language model. Check OPENROUTER_API_KEY on the Edge Function.'
              : 'The explorer assistant model is temporarily unavailable. Please try again shortly.',
        },
        502,
      )
    }

    const content = openRouterResult.content
    if (typeof content !== 'string' || !content.trim()) {
      return jsonResponse({ error: 'Model returned no content.' }, 502)
    }

    let parsedJson: unknown
    try {
      parsedJson = extractJsonObject(content)
    } catch {
      return jsonResponse({ error: 'Model returned invalid JSON.' }, 502)
    }

    const validated = validateModelJson(
      parsedJson,
      evidencePack,
      parsed.area,
      parsed.mode,
      parsed.language,
    )
    if ('error' in validated) {
      return jsonResponse({ error: validated.error }, 502)
    }

    return jsonResponse(validated)
  } catch (error) {
    console.error('assistant function failure', error)
    return jsonResponse(
      { error: 'Unexpected explorer assistant failure.' },
      500,
    )
  }
})

function extractJsonObject(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1))
    }
    throw new Error('no json object')
  }
}

async function callOpenRouter(input: {
  apiKey: string
  supabaseUrl: string
  model: string
  fallbackModel: string
  temperature: number
  messages: Array<{ role: string; content: string }>
}): Promise<
  | { ok: true; content: string }
  | { ok: false; status: number; detail: string }
> {
  const headers = {
    Authorization: `Bearer ${input.apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': input.supabaseUrl,
    'X-Title': 'CivicSync Explorer Assistant',
  }

  const attempt = async (
    modelId: string,
    withJsonFormat: boolean,
  ): Promise<Response> => {
    const body: Record<string, unknown> = {
      model: modelId,
      temperature: input.temperature,
      messages: input.messages,
    }
    if (withJsonFormat) {
      body.response_format = { type: 'json_object' }
    }
    return await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
  }

  const models = [input.model]
  if (input.fallbackModel && input.fallbackModel !== input.model) {
    models.push(input.fallbackModel)
  }

  let lastStatus = 502
  let lastDetail = ''

  for (const modelId of models) {
    for (const withJson of [true, false]) {
      const response = await attempt(modelId, withJson)
      if (response.ok) {
        const completion = await response.json()
        const content = completion?.choices?.[0]?.message?.content
        if (typeof content === 'string' && content.trim()) {
          return { ok: true, content }
        }
        lastStatus = 502
        lastDetail = 'empty content'
        continue
      }
      lastStatus = response.status
      lastDetail = (await response.text()).slice(0, 500)
      // Auth failures will not improve with retries.
      if (response.status === 401 || response.status === 403) {
        return { ok: false, status: response.status, detail: lastDetail }
      }
    }
  }

  return { ok: false, status: lastStatus, detail: lastDetail }
}
