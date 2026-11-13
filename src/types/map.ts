/** Lon/lat pair used by MapLibre: [longitude, latitude]. */
export type LngLat = [number, number]

export interface MapViewport {
  center: LngLat
  zoom: number
  /** Camera pitch in degrees (0 = top-down; ~50–60 shows building extrusions). */
  pitch: number
  bearing: number
  minZoom: number
  maxZoom: number
}

export type MapLoadState = 'loading' | 'ready' | 'error'
