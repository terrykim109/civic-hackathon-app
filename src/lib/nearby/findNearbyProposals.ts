import { haversineDistanceMeters, isValidLngLat } from '../geo/haversine'
import type { LngLat } from '../../types/map'
import type { MunicipalRecord } from '../../types/municipalRecord'
import { normalizeNearbyRadiusMeters } from './nearbyRadius'

export interface NearbyProposalResult {
  record: MunicipalRecord
  /** Straight-line distance from the search origin, in metres. */
  distanceMeters: number
}

/**
 * Find municipal proposals within a straight-line radius of an origin.
 *
 * - Uses GeoJSON `[longitude, latitude]` ordering.
 * - Deduplicates by record id (first occurrence wins).
 * - Skips invalid / missing coordinates.
 * - Sorts nearest → farthest.
 * - Includes points exactly on the radius boundary.
 */
export function findNearbyProposals(
  origin: LngLat | null | undefined,
  records: readonly MunicipalRecord[],
  radiusMeters: number,
): NearbyProposalResult[] {
  if (!isValidLngLat(origin)) return []

  const radius = normalizeNearbyRadiusMeters(radiusMeters)
  const seen = new Set<string>()
  const matches: NearbyProposalResult[] = []

  for (const record of records) {
    if (!record?.id || seen.has(record.id)) continue
    seen.add(record.id)

    const coordinates = record.location?.coordinates
    if (!isValidLngLat(coordinates)) continue

    const distanceMeters = haversineDistanceMeters(origin, coordinates)
    if (!Number.isFinite(distanceMeters)) continue
    if (distanceMeters > radius) continue

    matches.push({ record, distanceMeters })
  }

  matches.sort((a, b) => {
    if (a.distanceMeters !== b.distanceMeters) {
      return a.distanceMeters - b.distanceMeters
    }
    return a.record.id.localeCompare(b.record.id)
  })

  return matches
}
