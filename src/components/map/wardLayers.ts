import type { Map as MapLibreMap } from 'maplibre-gl'
import { BUILDING_3D_LAYER_ID } from './buildingExtrusion'

export const WARDS_SOURCE_ID = 'toronto-wards'
export const WARDS_FILL_LAYER_ID = 'toronto-wards-fill'
export const WARDS_LINE_LAYER_ID = 'toronto-wards-outline'

/**
 * Add (or refresh) ward boundary layers from a static GeoJSON URL.
 * Layers sit beneath 3D buildings when that layer exists.
 * Uses promoteId = ward_id for feature-state hover/selection.
 */
export function ensureWardLayers(map: MapLibreMap, geoJsonUrl: string): void {
  const beforeId = map.getLayer(BUILDING_3D_LAYER_ID)
    ? BUILDING_3D_LAYER_ID
    : undefined

  if (map.getSource(WARDS_SOURCE_ID)) {
    const source = map.getSource(WARDS_SOURCE_ID) as {
      setData?: (data: string) => void
    }
    source.setData?.(geoJsonUrl)
  } else {
    map.addSource(WARDS_SOURCE_ID, {
      type: 'geojson',
      data: geoJsonUrl,
      promoteId: 'ward_id',
    })
  }

  if (!map.getLayer(WARDS_FILL_LAYER_ID)) {
    map.addLayer(
      {
        id: WARDS_FILL_LAYER_ID,
        type: 'fill',
        source: WARDS_SOURCE_ID,
        paint: {
          'fill-color': '#1f4a3f',
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            0.26,
            ['boolean', ['feature-state', 'hover'], false],
            0.16,
            0.05,
          ],
        },
      },
      beforeId,
    )
  }

  if (!map.getLayer(WARDS_LINE_LAYER_ID)) {
    map.addLayer(
      {
        id: WARDS_LINE_LAYER_ID,
        type: 'line',
        source: WARDS_SOURCE_ID,
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#14352d',
            ['boolean', ['feature-state', 'hover'], false],
            '#1f4a3f',
            'rgba(31, 74, 63, 0.55)',
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            2.4,
            ['boolean', ['feature-state', 'hover'], false],
            1.7,
            1.05,
          ],
          'line-opacity': 0.9,
        },
      },
      beforeId,
    )
  }
}

export function clearWardFeatureState(
  map: MapLibreMap,
  wardId: string | null,
  state: 'hover' | 'selected',
): void {
  if (!wardId || !map.getSource(WARDS_SOURCE_ID)) return
  map.setFeatureState(
    { source: WARDS_SOURCE_ID, id: wardId },
    { [state]: false },
  )
}

export function setWardFeatureState(
  map: MapLibreMap,
  wardId: string,
  state: 'hover' | 'selected',
  value: boolean,
): void {
  if (!map.getSource(WARDS_SOURCE_ID)) return
  map.setFeatureState(
    { source: WARDS_SOURCE_ID, id: wardId },
    { [state]: value },
  )
}
