import type { LngLat } from '../../types/map'

/** Mean Earth radius in metres (WGS84 spherical approximation). */
export const EARTH_RADIUS_M = 6_371_000

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * True when a GeoJSON-ordered `[longitude, latitude]` pair is usable.
 * Invalid, missing, or non-finite values are rejected.
 */
export function isValidLngLat(
  coordinates: LngLat | null | undefined,
): coordinates is LngLat {
  if (!coordinates || coordinates.length < 2) return false
  const [lng, lat] = coordinates
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return false
  if (lng < -180 || lng > 180) return false
  if (lat < -90 || lat > 90) return false
  return true
}

/**
 * Straight-line (great-circle) distance in metres between two WGS84 points.
 * Coordinates must be GeoJSON order: `[longitude, latitude]`.
 */
export function haversineDistanceMeters(a: LngLat, b: LngLat): number {
  if (!isValidLngLat(a) || !isValidLngLat(b)) {
    return Number.NaN
  }

  const [lng1, lat1] = a
  const [lng2, lat2] = b
  const φ1 = toRadians(lat1)
  const φ2 = toRadians(lat2)
  const Δφ = toRadians(lat2 - lat1)
  const Δλ = toRadians(lng2 - lng1)

  const sinΔφ = Math.sin(Δφ / 2)
  const sinΔλ = Math.sin(Δλ / 2)
  const h =
    sinΔφ * sinΔφ + Math.cos(φ1) * Math.cos(φ2) * sinΔλ * sinΔλ
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return EARTH_RADIUS_M * c
}
