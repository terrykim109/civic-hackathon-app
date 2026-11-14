/**
 * Lightweight HTML → plain text extraction for official municipal pages.
 * Not a full browser; strips scripts/styles and collapses whitespace.
 */

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
  ndash: '–',
  mdash: '—',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
}

function decodeEntity(entity: string): string {
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
}

export function extractTitleFromHtml(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!match?.[1]) return null
  const title = decodeHtmlEntities(match[1].replace(TAG_RE, ' '))
    .replace(/\s+/g, ' ')
    .trim()
  return title || null
}

export function decodeHtmlEntities(text: string): string {
  return text.replace(ENTITY_RE, (entity) => decodeEntity(entity))
}

export function extractTextFromHtml(html: string, maxChars = 80_000): string {
  const withoutBlocks = html.replace(SCRIPT_STYLE_RE, ' ')
  const withBreaks = withoutBlocks
    .replace(/<\/(p|div|tr|li|h[1-6]|br|section|article|header|footer)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
  const stripped = withBreaks.replace(TAG_RE, ' ')
  const decoded = decodeHtmlEntities(stripped)
  const collapsed = decoded
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
  if (collapsed.length <= maxChars) return collapsed
  return collapsed.slice(0, maxChars)
}
