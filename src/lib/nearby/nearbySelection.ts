import { isValidLngLat } from '../geo/haversine'
import type { LngLat } from '../../types/map'
import type { MunicipalRecord } from '../../types/municipalRecord'

/**
 * Camera / selection target for a nearby list click.
 * Reuses the record's representative coordinates; returns null if unusable.
 */
export function nearbySelectionCenter(
  record: MunicipalRecord,
): LngLat | null {
  const coordinates = record.location?.coordinates
  return isValidLngLat(coordinates) ? coordinates : null
}
