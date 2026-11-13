import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import type { GeoJsonFeatureCollection } from '../../data/parks/adaptParkFacilityProjects'

export const PARK_PROJECTS_SOURCE_ID = 'park-facility-projects'
export const PARK_PROJECTS_CIRCLE_LAYER_ID = 'park-facility-projects-circle'
export const PARK_PROJECTS_SELECTED_LAYER_ID = 'park-facility-projects-selected'

const EMPTY_COLLECTION: GeoJsonFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
}

/**
 * Ensure MapLibre source + circle layers for Open Data park facility projects.
 * Uses an empty FeatureCollection until adapted Point data is set via setParkProjectData.
 */
export function ensureParkProjectLayers(map: MapLibreMap): void {
  if (!map.getSource(PARK_PROJECTS_SOURCE_ID)) {
    map.addSource(PARK_PROJECTS_SOURCE_ID, {
      type: 'geojson',
      data: EMPTY_COLLECTION,
      promoteId: 'id',
    })
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
          4,
          14,
          7,
          17,
          10,
        ],
        'circle-color': '#4f7a5c',
        'circle-opacity': 0.88,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#f4f7f2',
      },
    })
  }

  if (!map.getLayer(PARK_PROJECTS_SELECTED_LAYER_ID)) {
    map.addLayer({
      id: PARK_PROJECTS_SELECTED_LAYER_ID,
      type: 'circle',
      source: PARK_PROJECTS_SOURCE_ID,
      filter: ['==', ['get', 'id'], ''],
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10,
          7,
          14,
          11,
          17,
          14,
        ],
        'circle-color': '#2f5a3d',
        'circle-opacity': 1,
        'circle-stroke-width': 2.5,
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

export function setParkProjectSelectionFilter(
  map: MapLibreMap,
  selectedId: string | null,
): void {
  if (!map.getLayer(PARK_PROJECTS_SELECTED_LAYER_ID)) return
  map.setFilter(PARK_PROJECTS_SELECTED_LAYER_ID, [
    '==',
    ['get', 'id'],
    selectedId ?? '',
  ])
}
