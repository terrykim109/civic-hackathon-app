import { getRecordsForWard } from '../../data/wards/resolveWardRecords'
import { findNearbyProposals } from '../nearby/findNearbyProposals'
import { NEARBY_RADIUS_DEFAULT_M } from '../nearby/nearbyRadius'
import { isValidLngLat } from '../geo/haversine'
import type { LngLat } from '../../types/map'
import type { MunicipalRecord } from '../../types/municipalRecord'
import type { WardSelection } from '../../types/ward'
import {
  ASSISTANT_MAX_EVIDENCE_REFS,
  ASSISTANT_MAX_RECORDS,
  PROXIMITY_DISCLAIMER,
  type AssistantAreaContext,
  type AssistantEvidenceRef,
  type AssistantRecordSummary,
  type AssistantSourceLink,
} from './types'

const SUMMARY_MAX = 280

function truncate(text: string, max: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trimEnd()}…`
}

function pushRef(
  refs: AssistantEvidenceRef[],
  seen: Set<string>,
  ref: AssistantEvidenceRef,
) {
  const href = ref.href.trim()
  if (!href || seen.has(href)) return
  // Skip bundled/local Vite assets — not fetchable by the Edge Function.
  if (href.startsWith('/') || href.startsWith('blob:') || href.startsWith('data:')) {
    return
  }
  seen.add(href)
  refs.push({ ...ref, href })
}

/** Collect official URLs from sources, evidence, and related processes. */
export function collectEvidenceRefs(
  record: MunicipalRecord,
): AssistantEvidenceRef[] {
  const refs: AssistantEvidenceRef[] = []
  const seen = new Set<string>()

  for (const source of record.sources) {
    pushRef(refs, seen, {
      label: source.label?.trim() || 'Official source',
      href: source.href,
      kind: 'source',
      recordId: record.id,
    })
  }

  if (record.officialSourceUrl?.trim()) {
    pushRef(refs, seen, {
      label: 'Official source',
      href: record.officialSourceUrl,
      kind: 'source',
      recordId: record.id,
    })
  }

  for (const item of record.evidence) {
    pushRef(refs, seen, {
      label: item.locator?.trim() || item.evidenceId || 'Evidence',
      href: item.sourceUrl,
      kind: 'evidence',
      recordId: record.id,
    })
  }

  for (const related of record.relatedProcesses) {
    for (const source of related.sources) {
      pushRef(refs, seen, {
        label: `${related.label}: ${source.label?.trim() || 'source'}`,
        href: source.href,
        kind: 'related',
        recordId: record.id,
      })
    }
  }

  return refs.slice(0, ASSISTANT_MAX_EVIDENCE_REFS)
}

function sourceLinks(refs: readonly AssistantEvidenceRef[]): AssistantSourceLink[] {
  return refs.slice(0, 4).map((ref) => ({
    label: ref.label,
    href: ref.href,
  }))
}

export function summarizeMunicipalRecord(
  record: MunicipalRecord,
  distanceMeters: number | null = null,
): AssistantRecordSummary {
  const evidenceRefs = collectEvidenceRefs(record)
  return {
    id: record.id,
    title: record.title,
    category: record.categoryRaw,
    municipalStatus: record.projectStatus,
    decisionStatus:
      record.decisionStatus === 'unknown' ? null : record.decisionStatus,
    participation: record.participationAvailability,
    summary: record.description?.trim()
      ? truncate(record.description, SUMMARY_MAX)
      : null,
    distanceMeters,
    sources: sourceLinks(evidenceRefs),
    evidenceRefs,
  }
}

export interface BuildResearchContextInput {
  label: string
  coordinates?: LngLat | null
  ward?: Pick<WardSelection, 'wardId' | 'name' | 'decisionIds'> | null
  records: readonly MunicipalRecord[]
  /** Nearby radius in metres; defaults to the map Nearby default (3 km). */
  nearbyRadiusMeters?: number
}

/**
 * Build LLM context from existing ward associations + nearby Haversine results.
 * Does not invent records or claim proximity equals impact.
 */
export function buildResearchContext(
  input: BuildResearchContextInput,
): AssistantAreaContext {
  const byId = new Map<string, AssistantRecordSummary>()

  if (input.ward) {
    const { matched } = getRecordsForWard(input.ward, input.records)
    for (const record of matched) {
      byId.set(record.id, summarizeMunicipalRecord(record, null))
    }
  }

  const origin = input.coordinates
  if (isValidLngLat(origin)) {
    const nearby = findNearbyProposals(
      origin,
      input.records,
      input.nearbyRadiusMeters ?? NEARBY_RADIUS_DEFAULT_M,
    )
    for (const item of nearby) {
      const existing = byId.get(item.record.id)
      if (existing) {
        byId.set(item.record.id, {
          ...existing,
          distanceMeters: item.distanceMeters,
        })
      } else {
        byId.set(
          item.record.id,
          summarizeMunicipalRecord(item.record, item.distanceMeters),
        )
      }
    }
  }

  const summaries = [...byId.values()]
    .sort((a, b) => {
      const da = a.distanceMeters
      const db = b.distanceMeters
      if (da == null && db == null) return a.title.localeCompare(b.title)
      if (da == null) return 1
      if (db == null) return -1
      return da - db
    })
    .slice(0, ASSISTANT_MAX_RECORDS)

  return {
    label: input.label.trim() || 'Selected area',
    coordinates: isValidLngLat(origin) ? origin : null,
    wardId: input.ward?.wardId ?? null,
    wardName: input.ward?.name ?? null,
    records: summaries,
    proximityNote: PROXIMITY_DISCLAIMER,
  }
}

/** Flatten unique evidence URLs from an area context (priority: earlier records). */
export function listAreaEvidenceUrls(area: AssistantAreaContext): string[] {
  const seen = new Set<string>()
  const urls: string[] = []
  for (const record of area.records) {
    for (const ref of record.evidenceRefs) {
      if (seen.has(ref.href)) continue
      seen.add(ref.href)
      urls.push(ref.href)
    }
  }
  return urls
}
