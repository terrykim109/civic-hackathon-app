import type { RankedPassage } from './rankPassages'
import type { AssistantCitation, AssistantEvidenceStatus } from './types'

export function citationsFromPassages(
  passages: readonly RankedPassage[],
): AssistantCitation[] {
  const seen = new Set<string>()
  const citations: AssistantCitation[] = []
  for (const item of passages) {
    if (seen.has(item.href)) {
      // Keep the highest-scoring passage per URL (passages are pre-sorted).
      continue
    }
    seen.add(item.href)
    citations.push({
      label: item.title || 'Official source',
      href: item.href,
      passage: item.passage,
      recordId: item.recordId,
    })
    if (citations.length >= 8) break
  }
  return citations
}

export function evidenceStatusFromRetrieval(input: {
  attempted: number
  retrieved: number
  unsupported: number
  failed: number
}): AssistantEvidenceStatus {
  if (input.attempted === 0) return 'skipped'
  if (input.retrieved === 0) return 'unavailable'
  if (input.failed > 0 || input.unsupported > 0) return 'partial'
  return 'retrieved'
}

export function buildEvidenceQuery(input: {
  userMessage: string
  areaLabel: string
  recordTitles: readonly string[]
}): string {
  const user = input.userMessage.trim()
  if (user) return user
  const titles = input.recordTitles.slice(0, 4).join(' ')
  return `${input.areaLabel} ${titles}`.trim()
}
