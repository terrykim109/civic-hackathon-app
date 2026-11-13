import wardOfficialMetaJson from '../wardOfficialMeta.json'
import type { WardProperties } from '../../types/ward'

export interface WardOfficialMeta {
  wardId: string
  areaShortCode: string
  name: string
  description: string
}

const BY_WARD_ID = new Map<string, WardOfficialMeta>()

for (const row of wardOfficialMetaJson as WardOfficialMeta[]) {
  if (row.wardId) BY_WARD_ID.set(row.wardId, row)
}

/**
 * Properties-only extract from `city-wards.geojson` (AREA_SHORT_CODE / AREA_NAME / AREA_DESC).
 * Used for enrichment — polygons are not loaded a second time.
 */
export function getWardOfficialMeta(wardId: string): WardOfficialMeta | null {
  return BY_WARD_ID.get(wardId) ?? null
}

/** Attach official Open Data ward description when the ward id matches. */
export function withWardOfficialMeta(
  ward: WardProperties,
): WardProperties & { officialDescription?: string } {
  const meta = getWardOfficialMeta(ward.wardId)
  if (!meta) return ward
  return {
    ...ward,
    officialDescription: meta.description,
  }
}
