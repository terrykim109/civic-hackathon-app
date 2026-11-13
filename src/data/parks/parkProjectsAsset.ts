/**
 * Vite emits a hashed static URL for the Open Data GeoJSON file.
 * Loaded by fetch + MapLibre — not inlined into the JS bundle.
 */
import parkProjectsGeoJsonUrl from '../park-and-recreation-facility-projects.geojson?url'

export const PARK_FACILITY_PROJECTS_GEOJSON_URL = parkProjectsGeoJsonUrl

/** Catalogue page for attribution / verification. */
export const PARK_FACILITY_PROJECTS_CATALOGUE_URL =
  'https://open.toronto.ca/dataset/park-and-recreation-facility-projects/'
