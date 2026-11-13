import decisionsGeoJson from '../municipalRecords.json'
import type { MunicipalRecord } from '../../types/municipalRecord'
import {
  adaptMunicipalFeatureCollection,
  mergeRecordsById,
  type GeoJsonFeatureCollection,
} from '../geojson/adaptMunicipalGeoJson'
import { torontoKennedyDanforthEnrichment } from './torontoKennedyDanforth'

const adapted = adaptMunicipalFeatureCollection(
  decisionsGeoJson as GeoJsonFeatureCollection,
)

/** Static import report for the bundled FeatureCollection (not a live feed). */
export const MUNICIPAL_GEOJSON_IMPORT_REPORT = adapted.report

/**
 * All map records: every valid GeoJSON feature, plus curated enrichments merged by id.
 * Do not hardcode feature counts in rendering code.
 */
export const MUNICIPAL_RECORDS: readonly MunicipalRecord[] = mergeRecordsById(
  adapted.records,
  [torontoKennedyDanforthEnrichment],
)

/** @deprecated Prefer MUNICIPAL_RECORDS */
export const MUNICIPAL_DECISIONS = MUNICIPAL_RECORDS

export function getRecordById(
  id: string,
  records: readonly MunicipalRecord[] = MUNICIPAL_RECORDS,
): MunicipalRecord | undefined {
  return records.find((record) => record.id === id)
}

/** @deprecated Prefer getRecordById */
export const getDecisionById = getRecordById

export { torontoKennedyDanforthEnrichment, torontoKennedyDanforthRental } from './torontoKennedyDanforth'
