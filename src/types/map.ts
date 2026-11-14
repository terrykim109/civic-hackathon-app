/** Lon/lat pair used by MapLibre: [longitude, latitude]. */
export type LngLat = [number, number]

/**
 * Central camera + navigation limits for the MapLibre map.
 * Pitch is degrees from nadir (0 = top-down). Bearing is degrees clockwise from north.
 */
export interface MapViewport {
  center: LngLat
  zoom: number
  pitch: number
  bearing: number
  minZoom: number
  maxZoom: number
  minPitch: number
  maxPitch: number
}

export type MapLoadState = 'loading' | 'ready' | 'error'

/** Options for flying the shared MapLibre camera to a geocoded location. */
export interface FlyToLocationOptions {
  center: LngLat
  zoom?: number
  /** Override pitch; defaults to current elevated framing. */
  pitch?: number
  bearing?: number
  durationMs?: number
}

/** Imperative camera actions bound to a single MapLibre instance. */
export interface MapCameraApi {
  zoomIn: () => void
  zoomOut: () => void
  /** Restores home centre, zoom, pitch and bearing (focus neighbourhood). */
  resetView: () => void
  /** Smoothly fly to a geocoded centre without recreating the map. */
  flyToLocation: (options: FlyToLocationOptions) => void
  getZoom: () => number
}
