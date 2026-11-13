import type { Map as MapLibreMap } from 'maplibre-gl'
import { CAMERA_EASE_MS, MAP_VIEWPORT } from '../../data/mapLocation'

/**
 * Apply centralized zoom/pitch limits and enable immersive navigation handlers.
 * Call once per MapLibre instance — does not register long-lived custom listeners.
 */
export function configureMapNavigation(map: MapLibreMap): void {
  map.setMinZoom(MAP_VIEWPORT.minZoom)
  map.setMaxZoom(MAP_VIEWPORT.maxZoom)
  map.setMinPitch(MAP_VIEWPORT.minPitch)
  map.setMaxPitch(MAP_VIEWPORT.maxPitch)

  // Pan + scroll zoom remain on by default; ensure rotate/pitch are available.
  map.dragPan.enable()
  map.scrollZoom.enable()
  map.dragRotate.enable()
  map.keyboard.enable()
  map.touchZoomRotate.enable()
  map.touchZoomRotate.enableRotation()
  map.touchPitch.enable()
}

/**
 * Smoothly ease to the home elevated camera without recreating the map.
 */
export function easeToHomeCamera(map: MapLibreMap): void {
  map.easeTo({
    center: MAP_VIEWPORT.center,
    zoom: MAP_VIEWPORT.zoom,
    pitch: MAP_VIEWPORT.pitch,
    bearing: MAP_VIEWPORT.bearing,
    duration: CAMERA_EASE_MS,
    essential: true,
  })
}
