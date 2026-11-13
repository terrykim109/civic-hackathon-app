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
