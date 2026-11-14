import type { LngLat } from '../../types/map'
import type {
  GeocodeKind,
  GeocodePrecision,
  GeocodeResult,
  GeocodeSearchOutcome,
} from './types'
import { validateLocationQuery } from './validateQuery'

/**
 * Komoot Photon public geocoder (OSM-derived).
 * Suited to autocomplete with location bias; no API key.
 * https://github.com/komoot/photon
 */
export const PHOTON_SEARCH_URL = 'https://photon.komoot.io/api/'

export const PHOTON_ATTRIBUTION =
  '© OpenStreetMap contributors · Photon'

/** Bias search toward central Toronto without excluding the rest of Canada. */
const TORONTO_BIAS = { lat: 43.7, lon: -79.4 }

const RESULT_LIMIT = 6

interface PhotonProperties {
  osm_id?: number | string
  osm_type?: string
  osm_key?: string
  osm_value?: string
  type?: string
  name?: string
  housenumber?: string
  street?: string
  postcode?: string
  locality?: string
  district?: string
  city?: string
  state?: string
  country?: string
  countrycode?: string
  extent?: number[]
}

interface PhotonFeature {
  type?: string
  geometry?: { type?: string; coordinates?: unknown }
  properties?: PhotonProperties | null
}

interface PhotonResponse {
  type?: string
  features?: PhotonFeature[]
}

const resultCache = new Map<string, GeocodeSearchOutcome>()

export function clearGeocodeCache(): void {
  resultCache.clear()
}

function asLngLat(coordinates: unknown): LngLat | null {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null
  const lon = coordinates[0]
  const lat = coordinates[1]
  if (
    typeof lon !== 'number' ||
    typeof lat !== 'number' ||
    !Number.isFinite(lon) ||
    !Number.isFinite(lat)
  ) {
    return null
  }
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
  return [lon, lat]
}

function mapKind(
  properties: PhotonProperties,
  queryIsPostal: boolean,
): GeocodeKind {
  const type = `${properties.type ?? ''} ${properties.osm_key ?? ''} ${properties.osm_value ?? ''}`.toLowerCase()
  if (
    queryIsPostal ||
    type.includes('postcode') ||
    (Boolean(properties.postcode) && !properties.street && !properties.housenumber)
  ) {
    return 'postal_code'
  }
  if (
    type.includes('house') ||
    Boolean(properties.housenumber) ||
    (Boolean(properties.street) && Boolean(properties.housenumber))
  ) {
    return 'address'
  }
  if (
    type.includes('neighbourhood') ||
    type.includes('neighborhood') ||
    type.includes('suburb') ||
    type.includes('quarter') ||
    type.includes('locality')
  ) {
    return 'neighbourhood'
  }
  if (
    type.includes('city') ||
    type.includes('town') ||
    type.includes('village') ||
    type.includes('amenity') ||
    type.includes('tourism') ||
    type.includes('leisure') ||
    type.includes('park') ||
    type.includes('station') ||
    type.includes('railway')
  ) {
    return 'place'
  }
  if (properties.name && !properties.street) return 'place'
  return 'other'
}

function mapPrecision(kind: GeocodeKind): GeocodePrecision {
  if (kind === 'address') return 'point'
  if (kind === 'neighbourhood' || kind === 'postal_code') return 'area'
  return 'approximate'
}

function suggestedZoomFor(kind: GeocodeKind): number {
  switch (kind) {
    case 'address':
      return 17
    case 'postal_code':
      return 15
    case 'neighbourhood':
      return 14
    case 'place':
      return 13.5
    default:
      return 14.5
  }
}

function primaryLabel(properties: PhotonProperties): string {
  if (properties.housenumber && properties.street) {
    return `${properties.housenumber} ${properties.street}`
  }
  if (properties.name?.trim()) return properties.name.trim()
  if (properties.street?.trim()) return properties.street.trim()
  if (properties.postcode?.trim()) return properties.postcode.trim()
  return 'Unknown location'
}

function secondaryLabel(
  properties: PhotonProperties,
  kind: GeocodeKind,
): string | null {
  const city =
    properties.city ?? properties.district ?? properties.locality ?? null
  const province = properties.state ?? null
  const bits = [city, province].filter(Boolean)
  const kindLabel =
    kind === 'address'
      ? 'Address'
      : kind === 'postal_code'
        ? 'Postal code'
        : kind === 'neighbourhood'
          ? 'Neighbourhood'
          : kind === 'place'
            ? 'Place'
            : 'Location'
  if (bits.length === 0) return kindLabel
  return `${kindLabel} · ${bits.join(', ')}`
}

function featureId(feature: PhotonFeature, label: string, coordinates: LngLat): string {
  const props = feature.properties ?? {}
  if (props.osm_type && props.osm_id != null) {
    return `${props.osm_type}-${props.osm_id}`
  }
  return `${coordinates[0]},${coordinates[1]},${label}`
}

export function adaptPhotonFeatures(
  features: PhotonFeature[],
  options: { queryIsPostal?: boolean } = {},
): GeocodeResult[] {
  const queryIsPostal = options.queryIsPostal ?? false
  const results: GeocodeResult[] = []
  const seen = new Set<string>()

  for (const feature of features) {
    const properties = feature.properties
    if (!properties) continue

    const country = (properties.countrycode ?? '').toUpperCase()
    if (country && country !== 'CA') continue

    const coordinates = asLngLat(feature.geometry?.coordinates)
    if (!coordinates) continue

    const kind = mapKind(properties, queryIsPostal)
    const label = primaryLabel(properties)
    const id = featureId(feature, label, coordinates)
    if (seen.has(id)) continue
    seen.add(id)

    results.push({
      id,
      label,
      secondaryLabel: secondaryLabel(properties, kind),
      coordinates,
      precision: mapPrecision(kind),
      kind,
      suggestedZoom: suggestedZoomFor(kind),
      attribution: PHOTON_ATTRIBUTION,
    })
  }

  return results
}

function cacheKey(normalizedQuery: string): string {
  return normalizedQuery.toLowerCase()
}

/**
 * Search Canadian locations via Photon with a Toronto coordinate bias.
 * Safe for debounced autocomplete; results are cached per normalized query.
 */
export async function searchLocations(
  rawQuery: string,
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<GeocodeSearchOutcome> {
  const validation = validateLocationQuery(rawQuery)
  if (!validation.ok) {
    return {
      status: 'empty',
      results: [],
      message: validation.reason,
    }
  }

  const key = cacheKey(validation.normalized)
  const cached = resultCache.get(key)
  if (cached) return cached

  const params = new URLSearchParams({
    q: validation.normalized,
    lat: String(TORONTO_BIAS.lat),
    lon: String(TORONTO_BIAS.lon),
    limit: String(RESULT_LIMIT),
    lang: 'en',
  })

  const fetchImpl = options.fetchImpl ?? fetch

  try {
    const response = await fetchImpl(`${PHOTON_SEARCH_URL}?${params}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: options.signal,
    })

    if (!response.ok) {
      return {
        status: 'error',
        results: [],
        message:
          'Location search is temporarily unavailable. Try again in a moment.',
      }
    }

    const payload = (await response.json()) as PhotonResponse
    const features = Array.isArray(payload.features) ? payload.features : []
    const results = adaptPhotonFeatures(features, {
      queryIsPostal: validation.looksLikePostalCode,
    })

    const outcome: GeocodeSearchOutcome =
      results.length === 0
        ? {
            status: 'empty',
            results: [],
            message:
              'No matching Canadian locations found. Try a fuller address or nearby landmark.',
          }
        : {
            status: 'results',
            results,
            message: null,
          }

    resultCache.set(key, outcome)
    return outcome
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { status: 'empty', results: [], message: null }
    }
    return {
      status: 'error',
      results: [],
      message:
        'Could not reach the location service. Check your connection and try again.',
    }
  }
}

export function precisionDisclaimer(precision: GeocodePrecision): string {
  switch (precision) {
    case 'point':
      return 'Indicative map point from OpenStreetMap — not a surveyed property boundary or project impact area.'
    case 'area':
      return 'Approximate area result — not a legal boundary or confirmation of project impact.'
    case 'approximate':
      return 'Approximate location — verify on the map before relying on it for decisions.'
  }
}
