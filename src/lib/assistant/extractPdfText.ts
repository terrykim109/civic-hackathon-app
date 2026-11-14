/**
 * Best-effort extraction for simple / text-based PDFs.
 * Scanned or heavily compressed PDFs return null (unsupported for this version).
 */
export function extractTextFromPdfBytes(
  bytes: Uint8Array,
  maxChars = 80_000,
): string | null {
  const decoder = new TextDecoder('latin1')
  const raw = decoder.decode(bytes)
  const chunks: string[] = []
  const streamRe = /stream\r?\n([\s\S]*?)endstream/g
  let match: RegExpExecArray | null
  while ((match = streamRe.exec(raw)) !== null) {
    const body = match[1] ?? ''
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
  if (chunks.length === 0) {
    const ascii = raw.match(/[A-Za-z0-9][A-Za-z0-9 ,.;:'"/-]{20,}/g)
    if (ascii) chunks.push(...ascii.slice(0, 200))
  }
  const text = chunks.join(' ').replace(/\s+/g, ' ').trim()
  if (text.length < 80) return null
  return text.slice(0, maxChars)
}
