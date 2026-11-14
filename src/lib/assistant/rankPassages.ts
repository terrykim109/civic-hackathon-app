/**
 * Lightweight keyword passage ranking — no embeddings / vector DB.
 */

export interface RankableDocument {
  href: string
  title: string
  organization: string
  text: string
  recordId?: string | null
}

export interface RankedPassage {
  href: string
  title: string
  organization: string
  passage: string
  score: number
  recordId: string | null
}

const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'if',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'as',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'by',
  'with',
  'from',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its',
  'into',
  'about',
  'what',
  'when',
  'where',
  'which',
  'who',
  'how',
  'can',
  'could',
  'should',
  'would',
  'will',
  'do',
  'does',
  'did',
  'i',
  'we',
  'you',
  'they',
  'me',
  'my',
  'our',
  'your',
  'their',
  'please',
  'tell',
  'want',
  'know',
  'look',
  'looking',
])

export function tokenizeQuery(query: string): string[] {
  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t))
  return [...new Set(tokens)]
}

export function splitIntoPassages(
  text: string,
  options?: { maxPassageChars?: number; maxPassagesPerDoc?: number },
): string[] {
  const maxPassageChars = options?.maxPassageChars ?? 700
  const maxPassagesPerDoc = options?.maxPassagesPerDoc ?? 24
  const blocks = text
    .split(/\n{2,}|(?<=\.)\s+(?=[A-Z0-9])/)
    .map((block) => block.replace(/\s+/g, ' ').trim())
    .filter((block) => block.length >= 40)

  const passages: string[] = []
  let buffer = ''
  for (const block of blocks) {
    if (!buffer) {
      buffer = block
    } else if (buffer.length + 1 + block.length <= maxPassageChars) {
      buffer = `${buffer} ${block}`
    } else {
      passages.push(buffer.slice(0, maxPassageChars))
      buffer = block
      if (passages.length >= maxPassagesPerDoc) return passages
    }
  }
  if (buffer && passages.length < maxPassagesPerDoc) {
    passages.push(buffer.slice(0, maxPassageChars))
  }
  return passages
}

function scorePassage(passage: string, tokens: string[], title: string): number {
  if (tokens.length === 0) return 0
  const hay = passage.toLowerCase()
  const titleHay = title.toLowerCase()
  let score = 0
  for (const token of tokens) {
    if (!hay.includes(token)) continue
    const occurrences = hay.split(token).length - 1
    score += Math.min(occurrences, 4)
    if (titleHay.includes(token)) score += 1.5
  }
  // Prefer denser matches for short questions.
  score = score / Math.sqrt(Math.max(tokens.length, 1))
  return score
}

export function rankPassages(
  documents: readonly RankableDocument[],
  query: string,
  options?: { maxResults?: number; maxPassageChars?: number },
): RankedPassage[] {
  const maxResults = options?.maxResults ?? 6
  const tokens = tokenizeQuery(query)
  const ranked: RankedPassage[] = []

  for (const doc of documents) {
    const passages = splitIntoPassages(doc.text, {
      maxPassageChars: options?.maxPassageChars,
    })
    for (const passage of passages) {
      const score =
        tokens.length === 0
          ? Math.min(passage.length / 400, 1)
          : scorePassage(passage, tokens, doc.title)
      if (score <= 0) continue
      ranked.push({
        href: doc.href,
        title: doc.title,
        organization: doc.organization,
        passage,
        score,
        recordId: doc.recordId ?? null,
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
