import type { Map as MapLibreMap } from 'maplibre-gl'
import { CAMERA_EASE_MS, MAP_VIEWPORT } from '../../data/mapLocation'
import type { FlyToLocationOptions, MapViewport } from '../../types/map'

/** Shorter ease for stepwise zoom controls. */
export const ZOOM_EASE_MS = 320

export const ZOOM_STEP = 1

/** Slightly longer than home ease so search navigation reads clearly. */
export const SEARCH_FLY_MS = 1600

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
 * Smoothly ease to the current home camera without recreating the map.
 * Home is usually the user’s geolocation; falls back to the case-study centre.
 */
export function easeToHomeCamera(
  map: MapLibreMap,
  home: MapViewport = MAP_VIEWPORT,
): void {
  map.easeTo({
    center: home.center,
    zoom: home.zoom,
    pitch: home.pitch,
    bearing: home.bearing,
    duration: CAMERA_EASE_MS,
    essential: true,
  })
}

/** Clamp a target zoom to the map’s current min/max. */
export function clampZoom(
  zoom: number,
  minZoom: number,
  maxZoom: number,
): number {
  return Math.min(maxZoom, Math.max(minZoom, zoom))
}

/** Smooth zoom by a step, respecting min/max zoom on the live map. */
export function easeZoomBy(map: MapLibreMap, delta: number): void {
  const next = clampZoom(
    map.getZoom() + delta,
    map.getMinZoom(),
    map.getMaxZoom(),
  )
  if (next === map.getZoom()) return
  map.easeTo({
    zoom: next,
    duration: ZOOM_EASE_MS,
    essential: true,
  })
}

/**
 * Fly the existing map to a geocoded location.
 * Preserves elevated pitch/bearing unless overridden; does not create a new map.
 */
export function flyToLocation(
  map: MapLibreMap,
  options: FlyToLocationOptions,
): void {
  const zoom = clampZoom(
    options.zoom ?? MAP_VIEWPORT.zoom,
    map.getMinZoom(),
    map.getMaxZoom(),
  )
  map.flyTo({
    center: options.center,
    zoom,
    pitch: options.pitch ?? MAP_VIEWPORT.pitch,
    bearing: options.bearing ?? MAP_VIEWPORT.bearing,
    duration: options.durationMs ?? SEARCH_FLY_MS,
    essential: true,
  })
}
