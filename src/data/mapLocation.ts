import type { MapViewport } from '../types/map'

/**
 * Static map focus for the Kennedy Road & Danforth Road neighbourhood
 * (Clairlea-Birchmount, Scarborough, Toronto).
 *
 * Centre is the midpoint of two address points verified via OpenStreetMap
 * Nominatim (static bake-in only — no runtime geocoding):
 *
 * - 411 Kennedy Road: 43.7152652, -79.2608120
 * - 636 Danforth Road: 43.7162100, -79.2605400
 *
 * This is a neighbourhood camera target, not a property boundary.
 */
const KENNEDY_411: [number, number] = [-79.260812, 43.7152652]
const DANFORTH_636: [number, number] = [-79.26054, 43.71621]

export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

export const NEIGHBOURHOOD_LABEL = 'Kennedy Rd & Danforth Rd · Scarborough'

export const MAP_VIEWPORT: MapViewport = {
  center: [
    (KENNEDY_411[0] + DANFORTH_636[0]) / 2,
    (KENNEDY_411[1] + DANFORTH_636[1]) / 2,
  ],
  zoom: 15.4,
  pitch: 0,
  bearing: 0,
  minZoom: 11,
  maxZoom: 18,
}

/** Invariant checks used by tests and as documentation of expected ranges. */
export function assertMapViewportValid(viewport: MapViewport): void {
  const [lng, lat] = viewport.center
  if (lng < -180 || lng > 180) {
    throw new Error(`Longitude out of range: ${lng}`)
  }
  if (lat < -90 || lat > 90) {
    throw new Error(`Latitude out of range: ${lat}`)
  }
  if (viewport.zoom < viewport.minZoom || viewport.zoom > viewport.maxZoom) {
    throw new Error(
      `Zoom ${viewport.zoom} outside [${viewport.minZoom}, ${viewport.maxZoom}]`,
    )
  }
}
