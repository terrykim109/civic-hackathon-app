/**
 * Vite emits a hashed static URL for the GeoJSON file.
 * MapLibre loads it by URL — the FeatureCollection is not inlined into the JS bundle.
 */
import wardsGeoJsonUrl from '../wards.geojson?url'

export const WARDS_GEOJSON_URL = wardsGeoJsonUrl
