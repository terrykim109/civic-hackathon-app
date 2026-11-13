import type { Map as MapLibreMap } from 'maplibre-gl'
import { CASE_STUDY_LABEL } from '../../data/mapLocation'

interface PlaceFeatureLike {
  geometry?: {
    type: string
    coordinates: number[] | number[][] | number[][][]
  } | null
}

/** Preference order for OpenMapTiles `place.class` values (local → broad). */
const PLACE_CLASS_RANK: Record<string, number> = {
  neighbourhood: 0,
  quarter: 1,
  suburb: 2,
  village: 3,
  town: 4,
  city: 5,
}

const PLACE_CLASSES = Object.keys(PLACE_CLASS_RANK)

export interface PlaceCandidate {
  name: string
  className: string
  distanceSq: number
}

function readName(
  properties: Record<string, unknown> | null | undefined,
): string | null {
  if (!properties) return null
  const nameEn = properties['name:en']
  const name = properties.name
  if (typeof nameEn === 'string' && nameEn.trim()) return nameEn.trim()
  if (typeof name === 'string' && name.trim()) return name.trim()
  return null
}

function pointDistanceSq(
  lng: number,
  lat: number,
  feature: PlaceFeatureLike,
): number {
  const geometry = feature.geometry
  if (!geometry) return Number.POSITIVE_INFINITY

  if (geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
    const [x, y] = geometry.coordinates as number[]
    if (typeof x !== 'number' || typeof y !== 'number') {
      return Number.POSITIVE_INFINITY
    }
    const dx = x - lng
    const dy = y - lat
    return dx * dx + dy * dy
  }

  // Non-point place geometries: use a rough ring/centre average when possible.
  const coords =
    geometry.type === 'Polygon'
      ? (geometry.coordinates as number[][][])[0]
      : geometry.type === 'MultiPoint'
        ? (geometry.coordinates as number[][])
        : null
  if (!coords || coords.length === 0) return Number.POSITIVE_INFINITY
  let sx = 0
  let sy = 0
  for (const c of coords) {
    sx += c[0]
    sy += c[1]
  }
  const dx = sx / coords.length - lng
  const dy = sy / coords.length - lat
  return dx * dx + dy * dy
}

/** Pure helper — pick the best local label from ranked candidates. */
export function pickPlaceLabel(
  candidates: PlaceCandidate[],
  fallback = CASE_STUDY_LABEL,
): string {
  if (candidates.length === 0) return fallback

  const sorted = [...candidates].sort((a, b) => {
    const rankDelta =
      (PLACE_CLASS_RANK[a.className] ?? 99) -
      (PLACE_CLASS_RANK[b.className] ?? 99)
    if (rankDelta !== 0) return rankDelta
    return a.distanceSq - b.distanceSq
  })

  const primary = sorted[0]
  const city = sorted.find((c) => c.className === 'city' || c.className === 'town')

  if (
    city &&
    primary.className !== 'city' &&
    primary.className !== 'town' &&
    city.name !== primary.name
  ) {
    return `${primary.name} · ${city.name}`
  }

  return primary.name
}

/**
 * Resolve a human-readable place label for the current map centre from
 * OpenMapTiles `place` features already loaded in the style (no geocoding API).
 */
export function resolvePlaceLabelFromMap(map: MapLibreMap): string {
  if (!map.getSource('openmaptiles') || !map.isStyleLoaded()) {
    return CASE_STUDY_LABEL
  }

  const center = map.getCenter()
  const features = map.querySourceFeatures('openmaptiles', {
    sourceLayer: 'place',
    filter: ['in', 'class', ...PLACE_CLASSES],
  })

  const candidates: PlaceCandidate[] = []
  const seen = new Set<string>()

  for (const feature of features) {
    const className = feature.properties?.class
    if (typeof className !== 'string') continue
    const name = readName(
      feature.properties as Record<string, unknown> | null | undefined,
    )

    if (!name) continue
    const key = `${className}:${name}`
    if (seen.has(key)) continue
    seen.add(key)
    candidates.push({
      name,
      className,
      distanceSq: pointDistanceSq(center.lng, center.lat, feature),
    })
  }

  // Prefer features reasonably near the viewport centre (degrees² ≈ neighbourhood scale).
  const near = candidates.filter((c) => c.distanceSq <= 0.02 * 0.02)
  return pickPlaceLabel(near.length > 0 ? near : candidates)
}
