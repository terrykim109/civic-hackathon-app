import type { Map as MapLibreMap, ExpressionSpecification } from 'maplibre-gl'

/** Matches the OpenFreeMap Liberty style layer id. */
export const BUILDING_3D_LAYER_ID = 'building-3d'

/** OpenMapTiles vector source id used by the Liberty style. */
export const BUILDING_SOURCE_ID = 'openmaptiles'

/** OpenMapTiles source-layer for building footprints. */
export const BUILDING_SOURCE_LAYER = 'building'

/**
 * Muted limestone fill for extruded buildings.
 * Tuned for a restrained urban twin look (not saturated cartoon colours).
 */
export const BUILDING_EXTRUSION_COLOR = 'hsl(36, 12%, 78%)'
export const BUILDING_EXTRUSION_OPACITY = 0.92

/**
 * Height in metres from OpenMapTiles `render_height`.
 * Missing values coalesce to 0 so we never invent storeys or metres.
 */
const EXTRUSION_HEIGHT: ExpressionSpecification = [
  'coalesce',
  ['to-number', ['get', 'render_height']],
  0,
]

const EXTRUSION_BASE: ExpressionSpecification = [
  'coalesce',
  ['to-number', ['get', 'render_min_height']],
  0,
]

/**
 * Ensure a single 3D building extrusion layer exists and use refined paint.
 *
 * OpenFreeMap Liberty already ships `building-3d`. We refine that layer when
 * present; we only add a layer if the style somehow omits it. Never duplicates.
 */
export function ensureBuildingExtrusions(map: MapLibreMap): void {
  if (!map.getSource(BUILDING_SOURCE_ID)) {
    return
  }

  if (!map.getLayer(BUILDING_3D_LAYER_ID)) {
    map.addLayer({
      id: BUILDING_3D_LAYER_ID,
      type: 'fill-extrusion',
      source: BUILDING_SOURCE_ID,
      'source-layer': BUILDING_SOURCE_LAYER,
      minzoom: 14,
      filter: ['!', ['has', 'hide_3d']],
      paint: {
        'fill-extrusion-color': BUILDING_EXTRUSION_COLOR,
        'fill-extrusion-height': EXTRUSION_HEIGHT,
        'fill-extrusion-base': EXTRUSION_BASE,
        'fill-extrusion-opacity': BUILDING_EXTRUSION_OPACITY,
      },
    })
    return
  }

  map.setPaintProperty(
    BUILDING_3D_LAYER_ID,
    'fill-extrusion-color',
    BUILDING_EXTRUSION_COLOR,
  )
  map.setPaintProperty(
    BUILDING_3D_LAYER_ID,
    'fill-extrusion-height',
    EXTRUSION_HEIGHT,
  )
  map.setPaintProperty(
    BUILDING_3D_LAYER_ID,
    'fill-extrusion-base',
    EXTRUSION_BASE,
  )
  map.setPaintProperty(
    BUILDING_3D_LAYER_ID,
    'fill-extrusion-opacity',
    BUILDING_EXTRUSION_OPACITY,
  )
  map.setLayoutProperty(BUILDING_3D_LAYER_ID, 'visibility', 'visible')
}
