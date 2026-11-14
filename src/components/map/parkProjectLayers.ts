import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import type { GeoJsonFeatureCollection } from '../../data/parks/adaptParkFacilityProjects'

export const PARK_PROJECTS_SOURCE_ID = 'park-facility-projects'
export const PARK_PROJECTS_CIRCLE_LAYER_ID = 'park-facility-projects-circle'
/** @deprecated Kept for style cleanup of older dual-layer setup. */
export const PARK_PROJECTS_SELECTED_LAYER_ID = 'park-facility-projects-selected'

const EMPTY_COLLECTION: GeoJsonFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
}

/**
 * Ensure MapLibre source + a single circle layer for the contextual park marker.
 * Source starts empty — callers set at most the currently selected park project.
 */
export function ensureParkProjectLayers(map: MapLibreMap): void {
  if (!map.getSource(PARK_PROJECTS_SOURCE_ID)) {
    map.addSource(PARK_PROJECTS_SOURCE_ID, {
      type: 'geojson',
      data: EMPTY_COLLECTION,
      promoteId: 'id',
    })
  }

  // Remove legacy highlight layer if present (two stacked circles looked like flashing).
  if (map.getLayer(PARK_PROJECTS_SELECTED_LAYER_ID)) {
    map.removeLayer(PARK_PROJECTS_SELECTED_LAYER_ID)
  }

  if (!map.getLayer(PARK_PROJECTS_CIRCLE_LAYER_ID)) {
    map.addLayer({
      id: PARK_PROJECTS_CIRCLE_LAYER_ID,
      type: 'circle',
      source: PARK_PROJECTS_SOURCE_ID,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10,
          6,
          14,
          10,
          17,
          13,
        ],
        'circle-color': '#2f5a3d',
        'circle-opacity': 1,
        'circle-stroke-width': 2.25,
        'circle-stroke-color': '#fff8f2',
      },
    })
  }
}

export function setParkProjectData(
  map: MapLibreMap,
  collection: GeoJsonFeatureCollection,
): void {
  ensureParkProjectLayers(map)
  const source = map.getSource(PARK_PROJECTS_SOURCE_ID)
  if (source) {
    ;(source as GeoJSONSource).setData(collection)
  }
}
