/** Lon/lat pair used by MapLibre: [longitude, latitude]. */
export type LngLat = [number, number]

export interface MapViewport {
  center: LngLat
  zoom: number
  /** Flat 2D view for Commit 01; pitch/bearing reserved for later 3D work. */
  pitch: number
  bearing: number
  minZoom: number
  maxZoom: number
}

export type MapLoadState = 'loading' | 'ready' | 'error'
