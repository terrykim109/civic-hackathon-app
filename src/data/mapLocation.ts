import type { LngLat, MapViewport } from '../types/map'

/**
 * Case-study fallback focus: Kennedy Road & Danforth Road neighbourhood
 * (Clairlea-Birchmount, Scarborough, Toronto).
 *
 * Centre is the midpoint of two address points verified via OpenStreetMap
 * Nominatim (static bake-in — used when browser geolocation is unavailable):
 *
 * - 411 Kennedy Road: 43.7152652, -79.2608120
 * - 636 Danforth Road: 43.7162100, -79.2605400
 *
 * This is a neighbourhood camera target, not a property boundary.
 */
const KENNEDY_411: LngLat = [-79.260812, 43.7152652]
const DANFORTH_636: LngLat = [-79.26054, 43.71621]

export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

/** Default chip label before place features / geolocation resolve. */
export const NEIGHBOURHOOD_LABEL = 'Finding your area…'

export const CASE_STUDY_CENTER: LngLat = [
  (KENNEDY_411[0] + DANFORTH_636[0]) / 2,
  (KENNEDY_411[1] + DANFORTH_636[1]) / 2,
]

export const CASE_STUDY_LABEL = 'Kennedy Rd & Danforth Rd · Scarborough'

/**
 * Default elevated camera framing. Centre is replaced by the user’s location
 * when geolocation succeeds; otherwise CASE_STUDY_CENTER is used.
 */
export const MAP_VIEWPORT: MapViewport = {
  center: CASE_STUDY_CENTER,
  zoom: 16.2,
  /** ~50–55° keeps extrusions readable without extreme foreshortening. */
  pitch: 52,
  /** Slight rotation for a composed neighbourhood view (clockwise from north). */
  bearing: -32,
  minZoom: 12,
  maxZoom: 18,
  minPitch: 0,
  maxPitch: 60,
}

/** Shared ease duration for home-camera reset / neighbourhood focus. */
export const CAMERA_EASE_MS = 1100

/** Build a home viewport at an arbitrary centre, keeping elevated framing. */
export function viewportAtCenter(center: LngLat): MapViewport {
  return { ...MAP_VIEWPORT, center }
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
  if (
    viewport.pitch < viewport.minPitch ||
    viewport.pitch > viewport.maxPitch
  ) {
    throw new Error(
      `Pitch ${viewport.pitch} outside [${viewport.minPitch}, ${viewport.maxPitch}]`,
    )
  }
}
