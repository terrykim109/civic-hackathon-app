import type {
  GeoJsonImportReport,
  MunicipalRecord,
  SkippedFeatureReport,
} from '../../types/municipalRecord'
import type { LngLat } from '../../types/map'
import { PARK_FACILITY_PROJECTS_CATALOGUE_URL } from './parkProjectsAsset'

interface GeoJsonGeometry {
  type?: string
  coordinates?: unknown
}

interface GeoJsonFeature {
  type?: string
  id?: string | number
  geometry?: GeoJsonGeometry | null
  properties?: Record<string, unknown> | null
}

export interface GeoJsonFeatureCollection {
  type?: string
  features?: GeoJsonFeature[]
}

const GLOBAL_ID_LOCATOR = /globalid\s+([0-9a-f-]{36})/i

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

/** Normalize ward codes like "03" / "3" → "3" for matching wards.geojson ward_id. */
export function normalizeWardNumber(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed || /^none$/i.test(trimmed)) return null
  const asNum = Number(trimmed)
  if (!Number.isFinite(asNum)) return null
  return String(asNum)
}

/**
 * Collect Open Data `globalid` values already represented in municipal records
 * via `geometry_source_record` or evidence locators (`globalid <uuid>`).
 */
export function collectIntegratedParkGlobalIds(
  records: readonly MunicipalRecord[],
): Set<string> {
  const ids = new Set<string>()
  for (const record of records) {
    const gsr = record.geometrySourceRecord?.trim()
    if (gsr && /^[0-9a-f-]{36}$/i.test(gsr)) {
      ids.add(gsr.toLowerCase())
    }
    for (const evidence of record.evidence) {
      const match = evidence.locator?.match(GLOBAL_ID_LOCATOR)
      if (match?.[1]) ids.add(match[1].toLowerCase())
    }
  }
  return ids
}

function parseMultiPointOrPoint(
  geometry: GeoJsonGeometry | null | undefined,
): { coordinates: LngLat | null; reasons: string[] } {
  if (!geometry) {
    return { coordinates: null, reasons: ['Missing geometry'] }
  }

  const type = geometry.type
  const coords = geometry.coordinates

  if (type === 'Point') {
    if (!Array.isArray(coords) || coords.length < 2) {
      return { coordinates: null, reasons: ['Point coordinates missing'] }
    }
    const lng = coords[0]
    const lat = coords[1]
    if (
      typeof lng !== 'number' ||
      typeof lat !== 'number' ||
      !Number.isFinite(lng) ||
      !Number.isFinite(lat)
    ) {
      return { coordinates: null, reasons: ['Point coordinates are not finite'] }
    }
    return { coordinates: [lng, lat], reasons: [] }
  }

  if (type === 'MultiPoint') {
    if (!Array.isArray(coords) || coords.length === 0) {
      return { coordinates: null, reasons: ['MultiPoint has no positions'] }
    }
    // Open Data projects use single-position MultiPoints; take the first only.
    const first = coords[0]
    if (!Array.isArray(first) || first.length < 2) {
      return { coordinates: null, reasons: ['MultiPoint first position incomplete'] }
    }
    const lng = first[0]
    const lat = first[1]
    if (
      typeof lng !== 'number' ||
      typeof lat !== 'number' ||
      !Number.isFinite(lng) ||
      !Number.isFinite(lat)
    ) {
      return {
        coordinates: null,
        reasons: ['MultiPoint coordinates are not finite'],
      }
    }
    return { coordinates: [lng, lat], reasons: [] }
  }

  return {
    coordinates: null,
    reasons: [`Unsupported geometry type: ${String(type)}`],
  }
}

function adaptFeature(
  feature: GeoJsonFeature,
  featureIndex: number,
  excludeGlobalIds: ReadonlySet<string>,
): { record?: MunicipalRecord; skipped?: SkippedFeatureReport } {
  if (feature.type !== 'Feature') {
    return {
      skipped: {
        featureIndex,
        reasons: [`Expected Feature, got ${String(feature.type)}`],
      },
    }
  }

  const properties =
    feature.properties && typeof feature.properties === 'object'
      ? feature.properties
      : null
  if (!properties) {
    return {
      skipped: { featureIndex, reasons: ['Missing properties object'] },
    }
  }

  const globalid = asString(properties.globalid)?.toLowerCase() ?? null
  const title = asString(properties.project_name)
  const { coordinates, reasons: coordReasons } = parseMultiPointOrPoint(
    feature.geometry,
  )

  const reasons = [...coordReasons]
  if (!globalid) reasons.push('Missing globalid')
  if (!title) reasons.push('Missing project_name')

  if (globalid && excludeGlobalIds.has(globalid)) {
    return {
      skipped: {
        featureIndex,
        id: globalid,
        reasons: [
          `Already integrated as a municipal record (globalid ${globalid})`,
        ],
      },
    }
  }

  if (reasons.length > 0 || !globalid || !title || !coordinates) {
    return {
      skipped: {
        featureIndex,
        id: globalid ?? undefined,
        reasons: reasons.length > 0 ? reasons : ['Incomplete essential fields'],
      },
    }
  }

  const address = asString(properties.address)
  const addressDisplay =
    address && !/^none$/i.test(address) ? address : null
  const projectUrl = asString(properties.project_url)
  const projectType = asString(properties.project_type) ?? 'Park or facility project'
  const status = asString(properties.status) ?? 'unknown'
  const description =
    asString(properties.description) ??
    'Park and recreation facility project from City of Toronto Open Data.'
  const wardId = normalizeWardNumber(asString(properties.ward_number))
  const wardName = asString(properties.ward_name)

  const record: MunicipalRecord = {
    id: `park-project-${globalid}`,
    title,
    description,
    municipality: 'Toronto',
    wardId,
    categoryRaw: 'parks_recreation',
    categoryKind: 'parks',
    recordType: 'park_facility_project',
    projectStatus: status.toLowerCase().replace(/\s+/g, '_'),
    gisSourceStatus: status,
    decisionStatus: 'unknown',
    decisionStage: 'unknown',
    participationAvailability: 'unknown',
    canParticipateNow: null,
    participationOptions: [],
    events: [],
    potentialImpacts: [],
    uncertainties: [
      'Listed as a City of Toronto park and recreation facility project. This is not a verified public-consultation or council-decision record.',
      'Map location is the Open Data representative MultiPoint (rendered as a point) — not a project impact boundary.',
      'Presence of a project near a resident does not establish an impact on that resident.',
    ],
    location: {
      coordinates,
      precision: 'indicative_point',
      locationRole: 'official_representative_point_not_impact_boundary',
      affectedArea: addressDisplay,
      note:
        'Representative point from Park and Recreation Facility Projects Open Data — not a surveyed parcel or impact boundary.',
    },
    sources: [
      ...(projectUrl
        ? [
            {
              label: 'Project page',
              href: projectUrl,
              verifiedOn: 'open-data-extract',
            },
          ]
        : []),
      {
        label: 'Open Data catalogue',
        href: PARK_FACILITY_PROJECTS_CATALOGUE_URL,
        verifiedOn: 'open-data-extract',
      },
    ],
    evidence: [
      {
        evidenceId: `park-globalid-${globalid}`,
        sourceUrl: PARK_FACILITY_PROJECTS_CATALOGUE_URL,
        locator: `globalid ${globalid}`,
        supports: ['location', 'project_listing'],
      },
    ],
    dataConfidence: {
      facts: 'low — Open Data project listing fields only',
      location: 'medium — official representative MultiPoint',
      participation: 'unknown — not provided by this dataset',
      limitations:
        'Does not include council votes, agenda items, or verified participation windows.',
    },
    lastVerified: null,
    verificationMethod: 'static_open_data_extract',
    officialSourceUrl: projectUrl,
    geometrySourceUrl: PARK_FACILITY_PROJECTS_CATALOGUE_URL,
    geometrySourceRecord: globalid,
    gisProjectName: title,
    decisionBody: null,
    agendaItemId: null,
    publishedDate: null,
    decisionDate: null,
    sourceModifiedDate: null,
    relatedProcesses: [],
    metrics: [
      {
        label: 'Project type',
        value: projectType,
      },
      ...(wardName
        ? [
            {
              label: 'Ward (source field)',
              value: wardId ? `${wardName} (${wardId})` : wardName,
              detail: 'From Open Data ward_name / ward_number — not geographic inference',
            },
          ]
        : []),
    ],
    sourceFeatureId: asString(properties._id) ?? feature.id,
    dataOrigin: 'open_data',
  }

  return { record }
}

/**
 * Normalize Park and Recreation Facility Projects Open Data into MunicipalRecord values.
 * Skips features whose globalid is already present on curated/municipal GeoJSON records.
 */
export function adaptParkFacilityProjects(
  collection: GeoJsonFeatureCollection,
  options: {
    excludeGlobalIds?: ReadonlySet<string>
  } = {},
): { records: MunicipalRecord[]; report: GeoJsonImportReport } {
  const features = Array.isArray(collection.features) ? collection.features : []
  const excludeGlobalIds = options.excludeGlobalIds ?? new Set<string>()
  const records: MunicipalRecord[] = []
  const skipped: SkippedFeatureReport[] = []
  const seenIds = new Set<string>()

  features.forEach((feature, featureIndex) => {
    const result = adaptFeature(feature ?? {}, featureIndex, excludeGlobalIds)
    if (result.skipped) {
      skipped.push(result.skipped)
      return
    }
    const record = result.record
    if (!record) {
      skipped.push({
        featureIndex,
        reasons: ['Adapter returned no record'],
      })
      return
    }
    if (seenIds.has(record.id)) {
      skipped.push({
        featureIndex,
        id: record.id,
        reasons: [`Duplicate id within FeatureCollection: ${record.id}`],
      })
      return
    }
    seenIds.add(record.id)
    records.push(record)
  })

  return {
    records,
    report: {
      sourceFeatureCount: features.length,
      importedCount: records.length,
      skipped,
    },
  }
}

/** Exact ward_number match (normalized) — never geographic proximity. */
export function getParkProjectsForWard(
  wardId: string,
  projects: readonly MunicipalRecord[],
): MunicipalRecord[] {
  const normalized = normalizeWardNumber(wardId)
  if (!normalized) return []
  return projects.filter((project) => project.wardId === normalized)
}

export function isParkFacilityProject(record: MunicipalRecord): boolean {
  return (
    record.recordType === 'park_facility_project' ||
    record.id.startsWith('park-project-')
  )
}

/** Point FeatureCollection for MapLibre circle layers. */
export function parkProjectsToFeatureCollection(
  records: readonly MunicipalRecord[],
): GeoJsonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: records.map((record) => ({
      type: 'Feature',
      id: record.id,
      properties: {
        id: record.id,
        title: record.title,
        project_status: record.projectStatus,
        ward_id: record.wardId,
      },
      geometry: {
        type: 'Point',
        coordinates: record.location.coordinates,
      },
    })),
  }
}

/**
 * Map markers for park Open Data projects are contextual only:
 * include the selected park project, otherwise an empty collection.
 * Full project lists remain available for ward panels — they are not drawn.
 */
export function contextualParkProjectCollection(
  projects: readonly MunicipalRecord[],
  selectedRecordId: string | null,
): GeoJsonFeatureCollection {
  if (!selectedRecordId) {
    return { type: 'FeatureCollection', features: [] }
  }
  const selected = projects.find((project) => project.id === selectedRecordId)
  if (!selected || !isParkFacilityProject(selected)) {
    return { type: 'FeatureCollection', features: [] }
  }
  return parkProjectsToFeatureCollection([selected])
}

export async function loadParkFacilityProjectRecords(
  geoJsonUrl: string,
  existingMunicipalRecords: readonly MunicipalRecord[],
): Promise<{ records: MunicipalRecord[]; report: GeoJsonImportReport }> {
  const response = await fetch(geoJsonUrl)
  if (!response.ok) {
    throw new Error(
      `Failed to load park facility projects (${response.status})`,
    )
  }
  const collection = (await response.json()) as GeoJsonFeatureCollection
  return adaptParkFacilityProjects(collection, {
    excludeGlobalIds: collectIntegratedParkGlobalIds(existingMunicipalRecords),
  })
}
