import type { LngLat } from '../../types/map'

/** How precisely the geocoder located the query — never a legal parcel claim. */
export type GeocodePrecision = 'point' | 'approximate' | 'area'

export type GeocodeKind =
  | 'address'
  | 'postal_code'
  | 'neighbourhood'
  | 'place'
  | 'other'

export interface GeocodeResult {
  id: string
  /** Primary line shown in the suggestions list and after selection. */
  label: string
  /** Optional secondary context (city, province, type). */
  secondaryLabel: string | null
  coordinates: LngLat
  precision: GeocodePrecision
  kind: GeocodeKind
  /** Suggested map zoom for this result class (clamped by the map later). */
  suggestedZoom: number
  /** Provider attribution fragment for UI footers. */
  attribution: string
}

export type GeocodeQueryStatus =
  | 'idle'
  | 'invalid'
  | 'loading'
  | 'results'
  | 'empty'
  | 'error'

export interface GeocodeSearchOutcome {
  status: 'results' | 'empty' | 'error'
  results: GeocodeResult[]
  message: string | null
}
