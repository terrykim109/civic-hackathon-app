// Official municipal evidence retrieval for the research assistant Edge Function.
// Lightweight keyword ranking only — no vector DB / unrestricted crawling.

export const APPROVED_SOURCE_HOST_SUFFIXES = [
  'toronto.ca',
  'ontario.ca',
  'gov.on.ca',
  'canada.ca',
  'gc.ca',
] as const

export const MAX_FETCH_DOCUMENTS = 4
export const MAX_DOCUMENT_BYTES = 1_500_000
export const FETCH_TIMEOUT_MS = 8_000
export const CACHE_TTL_MS = 30 * 60_000
export const MAX_CACHE_ENTRIES = 40
export const MAX_PASSAGES = 6

export interface EvidenceRefIn {
  label?: string
  href?: string
  kind?: string
  recordId?: string
}

export interface RetrievedDocument {
  href: string
  title: string
  organization: string
  text: string
  contentType: string
  recordId: string | null
  fromCache: boolean
}

export interface RankedPassage {
  href: string
  title: string
  organization: string
  passage: string
  score: number
  recordId: string | null
}

export interface EvidencePack {
  status: 'retrieved' | 'partial' | 'unavailable' | 'skipped'
  passages: RankedPassage[]
  documents: Array<{
    href: string
    title: string
    organization: string
    contentType: string
    ok: boolean
    reason?: string
  }>
  allowedHrefs: string[]
}

type CacheEntry = {
  expiresAt: number
  doc: Omit<RetrievedDocument, 'fromCache'>
}

const documentCache = new Map<string, CacheEntry>()

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function hostMatchesApprovedSuffix(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, '')
  return APPROVED_SOURCE_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  )
}

function isPrivateOrLocalIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true
  }
  const [a, b] = parts as [number, number, number, number]
  if (a === 10 || a === 127 || a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  return false
}

export function validateAllowedSourceUrl(
  raw: string,
): { ok: true; href: string } | { ok: false; reason: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false, reason: 'URL is empty.' }
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return { ok: false, reason: 'URL is malformed.' }
  }
  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: 'Only https URLs are allowed.' }
  }
  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'URLs with credentials are not allowed.' }
  }
  const hostname = parsed.hostname.trim().toLowerCase().replace(/\.$/, '')
  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.includes(':')
  ) {
    return { ok: false, reason: 'Host is blocked.' }
  }
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
    if (isPrivateOrLocalIpv4(hostname)) {
      return { ok: false, reason: 'Private or local IP addresses are not allowed.' }
    }
    return { ok: false, reason: 'Raw IP hosts are not allowed.' }
  }
  if (!hostMatchesApprovedSuffix(hostname)) {
    return { ok: false, reason: 'Host is not on the approved municipal source list.' }
  }
  parsed.hash = ''
  return { ok: true, href: parsed.toString() }
}

const SCRIPT_STYLE_RE =
  /<(script|style|noscript|svg|iframe)[^>]*>[\s\S]*?<\/\1>/gi
const TAG_RE = /<[^>]+>/g
const ENTITY_RE = /&(#x?[0-9a-f]+|[a-z]+);/gi
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

function decodeEntities(text: string): string {
  return text.replace(ENTITY_RE, (entity) => {
    const body = entity.slice(1, -1)
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const code = Number.parseInt(body.slice(2), 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : ' '
    }
    if (body.startsWith('#')) {
      const code = Number.parseInt(body.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : ' '
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? ' '
  })
}

export function extractTitleFromHtml(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!match?.[1]) return null
  const title = decodeEntities(match[1].replace(TAG_RE, ' '))
    .replace(/\s+/g, ' ')
    .trim()
  return title || null
}

export function extractTextFromHtml(html: string, maxChars = 80_000): string {
  const withoutBlocks = html.replace(SCRIPT_STYLE_RE, ' ')
  const withBreaks = withoutBlocks
    .replace(/<\/(p|div|tr|li|h[1-6]|br|section|article|header|footer)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
  const stripped = withBreaks.replace(TAG_RE, ' ')
  const decoded = decodeEntities(stripped)
  const collapsed = decoded
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
  return collapsed.length <= maxChars ? collapsed : collapsed.slice(0, maxChars)
}

/** Best-effort text extraction for simple / text-based PDFs. */
export function extractTextFromPdfBytes(bytes: Uint8Array, maxChars = 80_000): string | null {
  const decoder = new TextDecoder('latin1')
  const raw = decoder.decode(bytes)
  const chunks: string[] = []
  const streamRe = /stream\r?\n([\s\S]*?)endstream/g
  let match: RegExpExecArray | null
  while ((match = streamRe.exec(raw)) !== null) {
    const body = match[1] ?? ''
    // Prefer literal strings inside PDF text operators: (text) Tj / TJ
    const litRe = /\((?:\\.|[^\\)]){3,}\)(?:\s*Tj|\s*TJ)/g
    let lit: RegExpExecArray | null
    while ((lit = litRe.exec(body)) !== null) {
      const inner = lit[0].slice(1, lit[0].lastIndexOf(')'))
      const cleaned = inner
        .replace(/\\n/g, ' ')
        .replace(/\\r/g, ' ')
        .replace(/\\t/g, ' ')
        .replace(/\\([()\\])/g, '$1')
        .replace(/\\[0-7]{1,3}/g, ' ')
      if (/[A-Za-z]{3}/.test(cleaned)) chunks.push(cleaned)
    }
  }
  // Fallback: visible ASCII runs outside binary noise.
  if (chunks.length === 0) {
    const ascii = raw.match(/[A-Za-z0-9][A-Za-z0-9 ,.;:'"/-]{20,}/g)
    if (ascii) chunks.push(...ascii.slice(0, 200))
  }
  const text = chunks.join(' ').replace(/\s+/g, ' ').trim()
  if (text.length < 80) return null
  return text.slice(0, maxChars)
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'in', 'on', 'at', 'to', 'for', 'of',
  'as', 'is', 'are', 'was', 'were', 'be', 'by', 'with', 'from', 'this', 'that',
  'it', 'its', 'into', 'about', 'what', 'when', 'where', 'which', 'who', 'how',
  'can', 'will', 'do', 'does', 'did', 'i', 'we', 'you', 'they', 'me', 'my', 'our',
  'your', 'their', 'please', 'tell', 'want', 'know', 'look', 'looking',
])

function tokenizeQuery(query: string): string[] {
  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t))
  return [...new Set(tokens)]
}

function splitIntoPassages(text: string): string[] {
  const blocks = text
    .split(/\n{2,}|(?<=\.)\s+(?=[A-Z0-9])/)
    .map((block) => block.replace(/\s+/g, ' ').trim())
    .filter((block) => block.length >= 40)
  const passages: string[] = []
  let buffer = ''
  for (const block of blocks) {
    if (!buffer) buffer = block
    else if (buffer.length + 1 + block.length <= 700) buffer = `${buffer} ${block}`
    else {
      passages.push(buffer.slice(0, 700))
      buffer = block
      if (passages.length >= 24) return passages
    }
  }
  if (buffer && passages.length < 24) passages.push(buffer.slice(0, 700))
  return passages
}

export function rankPassages(
  documents: readonly RetrievedDocument[],
  query: string,
  maxResults = MAX_PASSAGES,
): RankedPassage[] {
  const tokens = tokenizeQuery(query)
  const ranked: RankedPassage[] = []
  for (const doc of documents) {
    for (const passage of splitIntoPassages(doc.text)) {
      const hay = passage.toLowerCase()
      const titleHay = doc.title.toLowerCase()
      let score = 0
      if (tokens.length === 0) {
        score = Math.min(passage.length / 400, 1)
      } else {
        for (const token of tokens) {
          if (!hay.includes(token)) continue
          score += Math.min(hay.split(token).length - 1, 4)
          if (titleHay.includes(token)) score += 1.5
        }
        score = score / Math.sqrt(Math.max(tokens.length, 1))
      }
      if (score <= 0) continue
      ranked.push({
        href: doc.href,
        title: doc.title,
        organization: doc.organization,
        passage,
        score,
        recordId: doc.recordId,
      })
    }
  }
  ranked.sort((a, b) => b.score - a.score || a.href.localeCompare(b.href))
  const seen = new Set<string>()
  const unique: RankedPassage[] = []
  for (const item of ranked) {
    const key = `${item.href}|${item.passage.slice(0, 80)}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(item)
    if (unique.length >= maxResults) break
  }
  return unique
}

function organizationFromHost(href: string): string {
  try {
    const host = new URL(href).hostname.toLowerCase()
    if (host.endsWith('toronto.ca')) return 'City of Toronto'
    if (host.endsWith('ontario.ca') || host.endsWith('gov.on.ca')) {
      return 'Province of Ontario'
    }
    if (host.endsWith('canada.ca') || host.endsWith('gc.ca')) {
      return 'Government of Canada'
    }
  } catch {
    /* ignore */
  }
  return 'Municipal source'
}

function cacheGet(href: string): RetrievedDocument | null {
  const entry = documentCache.get(href)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    documentCache.delete(href)
    return null
  }
  return { ...entry.doc, fromCache: true }
}

function cacheSet(doc: Omit<RetrievedDocument, 'fromCache'>) {
  if (documentCache.size >= MAX_CACHE_ENTRIES) {
    const first = documentCache.keys().next().value
    if (first) documentCache.delete(first)
  }
  documentCache.set(doc.href, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    doc,
  })
}

async function readLimitedBytes(
  response: Response,
  maxBytes: number,
): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; reason: string }> {
  const lenHeader = response.headers.get('content-length')
  if (lenHeader) {
    const declared = Number(lenHeader)
    if (Number.isFinite(declared) && declared > maxBytes) {
      return { ok: false, reason: 'Document exceeds size limit.' }
    }
  }
  if (!response.body) {
    const buf = new Uint8Array(await response.arrayBuffer())
    if (buf.byteLength > maxBytes) {
      return { ok: false, reason: 'Document exceeds size limit.' }
    }
    return { ok: true, bytes: buf }
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    total += value.byteLength
    if (total > maxBytes) {
      try {
        await reader.cancel()
      } catch {
        /* ignore */
      }
      return { ok: false, reason: 'Document exceeds size limit.' }
    }
    chunks.push(value)
  }
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { ok: true, bytes: merged }
}

export async function fetchOfficialDocument(
  href: string,
  recordId: string | null,
  label: string,
): Promise<
  | { ok: true; doc: RetrievedDocument }
  | { ok: false; href: string; reason: string }
> {
  const allowed = validateAllowedSourceUrl(href)
  if (!allowed.ok) return { ok: false, href, reason: allowed.reason }

  const cached = cacheGet(allowed.href)
  if (cached) {
    return {
      ok: true,
      doc: { ...cached, recordId: cached.recordId ?? recordId },
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(allowed.href, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/pdf,text/plain;q=0.9,*/*;q=0.1',
        'User-Agent': 'CivicLensResearchAssistant/1.0',
      },
    })

    // Follow a single same-host https redirect manually (SSRF-safe).
    let finalResponse = response
    let finalHref = allowed.href
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location')
      if (!location) {
        return { ok: false, href: allowed.href, reason: 'Redirect missing location.' }
      }
      const next = new URL(location, allowed.href)
      const nextAllowed = validateAllowedSourceUrl(next.toString())
      if (!nextAllowed.ok) {
        return { ok: false, href: allowed.href, reason: 'Redirect target not allowed.' }
      }
      finalHref = nextAllowed.href
      finalResponse = await fetch(nextAllowed.href, {
        method: 'GET',
        redirect: 'error',
        signal: controller.signal,
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/pdf,text/plain;q=0.9,*/*;q=0.1',
          'User-Agent': 'CivicLensResearchAssistant/1.0',
        },
      })
    }

    if (!finalResponse.ok) {
      return {
        ok: false,
        href: finalHref,
        reason: `Upstream HTTP ${finalResponse.status}.`,
      }
    }

    const contentType = (finalResponse.headers.get('content-type') ?? '')
      .split(';')[0]
      ?.trim()
      .toLowerCase() ?? ''

    const limited = await readLimitedBytes(finalResponse, MAX_DOCUMENT_BYTES)
    if (!limited.ok) return { ok: false, href: finalHref, reason: limited.reason }

    let text: string | null = null
    let title = label || 'Official source'

    if (
      contentType.includes('html') ||
      contentType === 'text/plain' ||
      contentType === ''
    ) {
      const html = new TextDecoder('utf-8').decode(limited.bytes)
      if (contentType.includes('html') || /<html[\s>]/i.test(html)) {
        text = extractTextFromHtml(html)
        title = extractTitleFromHtml(html) ?? title
      } else {
        text = html.replace(/\s+/g, ' ').trim()
      }
    } else if (
      contentType.includes('pdf') ||
      finalHref.toLowerCase().endsWith('.pdf')
    ) {
      text = extractTextFromPdfBytes(limited.bytes)
      if (!text) {
        return {
          ok: false,
          href: finalHref,
          reason: 'PDF text could not be extracted (unsupported or scanned).',
        }
      }
      if (!title.toLowerCase().includes('pdf')) {
        title = `${title} (PDF)`
      }
    } else {
      return {
        ok: false,
        href: finalHref,
        reason: `Unsupported content type: ${contentType || 'unknown'}.`,
      }
    }

    if (!text || text.length < 40) {
      return { ok: false, href: finalHref, reason: 'No usable text extracted.' }
    }

    const doc: RetrievedDocument = {
      href: finalHref,
      title,
      organization: organizationFromHost(finalHref),
      text,
      contentType: contentType || 'unknown',
      recordId,
      fromCache: false,
    }
    cacheSet(doc)
    return { ok: true, doc }
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'Request timed out.'
        : 'Document fetch failed.'
    return { ok: false, href: allowed.href, reason: message }
  } finally {
    clearTimeout(timer)
  }
}

export function collectCandidateRefs(
  records: Array<{ id?: string; evidenceRefs?: EvidenceRefIn[]; sources?: EvidenceRefIn[] }>,
): Array<{ href: string; label: string; recordId: string | null }> {
  const seen = new Set<string>()
  const out: Array<{ href: string; label: string; recordId: string | null }> = []
  for (const record of records) {
    const refs = [
      ...(Array.isArray(record.evidenceRefs) ? record.evidenceRefs : []),
      ...(Array.isArray(record.sources) ? record.sources : []),
    ]
    for (const ref of refs) {
      const href = asString(ref.href)
      if (!href || seen.has(href)) continue
      const allowed = validateAllowedSourceUrl(href)
      if (!allowed.ok) continue
      seen.add(allowed.href)
      out.push({
        href: allowed.href,
        label: asString(ref.label) ?? 'Official source',
        recordId: asString(ref.recordId) ?? asString(record.id),
      })
      if (out.length >= MAX_FETCH_DOCUMENTS * 2) return out
    }
  }
  return out
}

export async function retrieveEvidencePack(input: {
  records: Array<{ id?: string; evidenceRefs?: EvidenceRefIn[]; sources?: EvidenceRefIn[] }>
  query: string
}): Promise<EvidencePack> {
  const candidates = collectCandidateRefs(input.records).slice(0, MAX_FETCH_DOCUMENTS)
  if (candidates.length === 0) {
    return {
      status: 'skipped',
      passages: [],
      documents: [],
      allowedHrefs: [],
    }
  }

  const documents: RetrievedDocument[] = []
  const report: EvidencePack['documents'] = []
  let failed = 0

  for (const candidate of candidates) {
    const result = await fetchOfficialDocument(
      candidate.href,
      candidate.recordId,
      candidate.label,
    )
    if (!result.ok) {
      failed += 1
      report.push({
        href: result.href,
        title: candidate.label,
        organization: organizationFromHost(result.href),
        contentType: 'unknown',
        ok: false,
        reason: result.reason,
      })
      continue
    }
    documents.push(result.doc)
    report.push({
      href: result.doc.href,
      title: result.doc.title,
      organization: result.doc.organization,
      contentType: result.doc.contentType,
      ok: true,
    })
  }

  const passages = rankPassages(documents, input.query)
  const allowedHrefs = [
    ...new Set([
      ...candidates.map((c) => c.href),
      ...documents.map((d) => d.href),
    ]),
  ]

  let status: EvidencePack['status']
  if (documents.length === 0) status = 'unavailable'
  else if (failed > 0) status = 'partial'
  else status = 'retrieved'

  return { status, passages, documents: report, allowedHrefs }
}
