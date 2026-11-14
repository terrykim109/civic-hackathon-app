/** Nearby Proposals distance slider bounds (metres). */
export const NEARBY_RADIUS_MIN_M = 500
export const NEARBY_RADIUS_MAX_M = 5_000
export const NEARBY_RADIUS_DEFAULT_M = 3_000
export const NEARBY_RADIUS_STEP_M = 500

/**
 * Clamp and snap a radius to the Nearby Proposals slider contract.
 * Values outside the range snap to the nearest bound; mid-range values
 * snap to the nearest 500 m increment.
 */
export function normalizeNearbyRadiusMeters(value: number): number {
  if (!Number.isFinite(value)) return NEARBY_RADIUS_DEFAULT_M
  const clamped = Math.min(
    NEARBY_RADIUS_MAX_M,
    Math.max(NEARBY_RADIUS_MIN_M, value),
  )
  const steps = Math.round(
    (clamped - NEARBY_RADIUS_MIN_M) / NEARBY_RADIUS_STEP_M,
  )
  return NEARBY_RADIUS_MIN_M + steps * NEARBY_RADIUS_STEP_M
}

/** Format a metre distance for UI: metres below 1 km, kilometres otherwise. */
export function formatNearbyDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '—'
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  const km = meters / 1000
  const rounded = Math.round(km * 10) / 10
  return Number.isInteger(rounded) ? `${rounded} km` : `${rounded.toFixed(1)} km`
}

/** Format the selected radius control label. */
export function formatNearbyRadiusLabel(meters: number): string {
  return formatNearbyDistance(normalizeNearbyRadiusMeters(meters))
}
