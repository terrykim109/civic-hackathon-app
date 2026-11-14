import type { MunicipalRecord } from '../../types/municipalRecord'
import type { CivicSupabaseClient } from '../supabase/client'
import { adaptPublishedMunicipalRow } from './adaptPublishedRecord'

export type FetchPublishedResult =
  | {
      ok: true
      records: MunicipalRecord[]
      skippedCount: number
      skippedReasons: string[]
    }
  | {
      ok: false
      error: string
      records: MunicipalRecord[]
      skippedCount: number
      skippedReasons: string[]
    }

/**
 * Fetch publicly visible municipal proposals.
 * Uses the anon client only and requests publication_status = published explicitly
 * (RLS is still the authorization boundary).
 */
export async function fetchPublishedMunicipalRecords(
  client: CivicSupabaseClient,
): Promise<FetchPublishedResult> {
  const { data, error } = await client
    .from('municipal_records')
    .select('*')
    .eq('publication_status', 'published')
    .order('updated_at', { ascending: false })

  if (error) {
    return {
      ok: false,
      error: error.message || 'Could not load published municipal proposals.',
      records: [],
      skippedCount: 0,
      skippedReasons: [],
    }
  }

  const rows = Array.isArray(data) ? data : []
  const records: MunicipalRecord[] = []
  const skippedReasons: string[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const adapted = adaptPublishedMunicipalRow(row)
    if (!adapted.record) {
      if (adapted.skippedReason) skippedReasons.push(adapted.skippedReason)
      continue
    }
    if (seen.has(adapted.record.id)) {
      skippedReasons.push(
        `Skipped duplicate published id ${adapted.record.id}.`,
      )
      continue
    }
    seen.add(adapted.record.id)
    records.push(adapted.record)
  }

  return {
    ok: true,
    records,
    skippedCount: skippedReasons.length,
    skippedReasons,
  }
}

/**
 * Merge static map records with published Supabase proposals.
 * Static records win on id collision so bundled data stays authoritative.
 */
export function mergeStaticAndPublishedRecords(
  staticRecords: readonly MunicipalRecord[],
  publishedRecords: readonly MunicipalRecord[],
): MunicipalRecord[] {
  const byId = new Map<string, MunicipalRecord>()
  for (const record of staticRecords) {
    byId.set(record.id, record)
  }
  for (const record of publishedRecords) {
    if (!byId.has(record.id)) {
      byId.set(record.id, record)
    }
  }
  return [...byId.values()]
}
