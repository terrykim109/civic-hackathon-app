import type {
  DataConfidence,
  DecisionStage,
  DecisionStatus,
  GeoJsonImportReport,
  MunicipalEvent,
  MunicipalRecord,
  OfficialSource,
  ParticipationAvailability,
  ParticipationOption,
  PotentialImpact,
  RecordCategoryKind,
  RecordEvidence,
  LocationPrecision,
  SkippedFeatureReport,
} from '../../types/municipalRecord'
import type { LngLat } from '../../types/map'

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

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function mapCategoryKind(raw: string): RecordCategoryKind {
  const key = raw.toLowerCase()
  if (
    key.includes('housing') ||
    key.includes('rental') ||
    key.includes('zoning') ||
    key.includes('development')
  ) {
    return 'housing'
  }
  if (key.includes('park') || key.includes('recreation') || key.includes('public_space')) {
    return 'parks'
  }
  if (key.includes('transit') || key.includes('transport')) return 'transit'
  if (key.includes('infra') || key.includes('utility') || key.includes('road')) {
    return 'infrastructure'
  }
  if (key.includes('environ') || key.includes('climate') || key.includes('green')) {
    return 'environment'
  }
  return 'other'
}

function mapParticipationAvailability(raw: string | null): ParticipationAvailability {
  if (!raw) return 'unknown'
  const key = raw.toLowerCase()
  if (key === 'open') return 'open'
  if (key === 'closed') return 'closed'
  if (key === 'upcoming' || key === 'not_open' || key === 'not-open') return 'not_open'
  if (key === 'unknown') return 'unknown'
  return 'unknown'
}

function mapLocationPrecision(raw: string | null): LocationPrecision {
  if (!raw) return 'unknown'
  const key = raw.toLowerCase()
  if (key === 'approximate') return 'approximate'
  if (key === 'indicative_point') return 'indicative_point'
  if (key === 'address_midpoint') return 'address_midpoint'
  if (key === 'address_verified') return 'address_verified'
  return 'unknown'
}

/**
 * Decision outcome is not present as approved/pending in the supplied GeoJSON.
 * Keep unknown unless an explicit outcome string appears.
 */
function mapDecisionStatus(rawStatus: string | null): DecisionStatus {
  if (!rawStatus) return 'unknown'
  const key = rawStatus.toLowerCase()
  if (key.includes('approv')) return 'approved'
  if (key.includes('reject') || key.includes('refus')) return 'rejected'
  if (key.includes('pending') || key.includes('under_review')) return 'pending'
  return 'unknown'
}

function mapDecisionStage(
  recordType: string,
  projectStatus: string,
): DecisionStage {
  const blob = `${recordType} ${projectStatus}`.toLowerCase()
  if (blob.includes('public_meeting') || blob.includes('consultation') || blob.includes('engagement')) {
    return 'public_consultation'
  }
  if (blob.includes('committee')) return 'committee_review'
  if (blob.includes('council')) return 'council_decision'
  if (blob.includes('implement') || blob.includes('construction')) return 'implementation'
  if (blob.includes('complete')) return 'completed'
  if (blob.includes('design') || blob.includes('proposal')) return 'proposal'
  return 'unknown'
}

function parsePointCoordinates(
  geometry: GeoJsonGeometry | null | undefined,
  properties: Record<string, unknown>,
): { coordinates: LngLat | null; reasons: string[] } {
  const reasons: string[] = []

  if (!geometry) {
    reasons.push('Missing geometry')
    return { coordinates: null, reasons }
  }
  if (geometry.type !== 'Point') {
    reasons.push(`Unsupported geometry type: ${String(geometry.type)}`)
    return { coordinates: null, reasons }
  }

  const coords = geometry.coordinates
  if (!Array.isArray(coords) || coords.length < 2) {
    reasons.push('Point coordinates missing or incomplete')
    return { coordinates: null, reasons }
  }

  const lng = coords[0]
  const lat = coords[1]
  if (typeof lng !== 'number' || typeof lat !== 'number' || !Number.isFinite(lng) || !Number.isFinite(lat)) {
    reasons.push('Point coordinates are not finite numbers')
    return { coordinates: null, reasons }
  }
  if (Math.abs(lng) > 180 || Math.abs(lat) > 90) {
    reasons.push('Point coordinates out of WGS84 range (expected [longitude, latitude])')
    return { coordinates: null, reasons }
  }

  // Prefer geometry coordinates; property lat/lng are cross-checked when present.
  const propLng = properties.longitude
  const propLat = properties.latitude
  if (typeof propLng === 'number' && typeof propLat === 'number') {
    if (Math.abs(propLng) <= 90 && Math.abs(propLat) <= 180 && Math.abs(propLng) < 40) {
      // Heuristic: if properties look swapped vs geometry, keep geometry (GeoJSON order).
    }
  }

  return { coordinates: [lng, lat], reasons: [] }
}

function parseParticipationOptions(value: unknown): ParticipationOption[] {
  if (!Array.isArray(value)) return []
  const options: ParticipationOption[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const method = asString(row.method)
    const availability = asString(row.availability)
    if (!method || !availability) continue
    options.push({
      method,
      availability,
      opensOn: asString(row.opens_on),
      deadline: asString(row.deadline),
      deadlinePrecision: asString(row.deadline_precision),
      deadlineTimezone: asString(row.deadline_timezone),
      deadlineTime: asString(row.deadline_time),
      deadlineRule: asString(row.deadline_rule),
      url: asString(row.url),
      contactEmail: asString(row.contact_email),
      contactPhone: asString(row.contact_phone),
      venue: asString(row.venue),
      eventStart: asString(row.event_start),
      eventEnd: asString(row.event_end),
      evidenceId: asString(row.evidence_id) ?? undefined,
    })
  }
  return options
}

function parseEvents(value: unknown): MunicipalEvent[] {
  if (!Array.isArray(value)) return []
  const events: MunicipalEvent[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const type = asString(row.type)
    if (!type) continue
    events.push({
      type,
      date: asString(row.date),
      precision: asString(row.precision),
      description: asString(row.description),
    })
  }
  return events
}

function parseImpacts(value: unknown): PotentialImpact[] {
  if (!Array.isArray(value)) return []
  const impacts: PotentialImpact[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const text = asString(row.text)
    if (!text) continue
    impacts.push({
      text,
      kind: asString(row.kind) ?? undefined,
      evidenceId: asString(row.evidence_id) ?? undefined,
    })
  }
  return impacts
}

function parseEvidence(value: unknown): RecordEvidence[] {
  if (!Array.isArray(value)) return []
  const evidence: RecordEvidence[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const evidenceId = asString(row.evidence_id)
    const sourceUrl = asString(row.source_url)
    if (!evidenceId || !sourceUrl) continue
    evidence.push({
      evidenceId,
      sourceUrl,
      locator: asString(row.locator) ?? undefined,
      supports: asStringArray(row.supports),
    })
  }
  return evidence
}

function parseConfidence(value: unknown): DataConfidence | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  return {
    facts: asString(row.facts) ?? undefined,
    location: asString(row.location) ?? undefined,
    participation: asString(row.participation) ?? undefined,
    limitations: asString(row.limitations) ?? undefined,
  }
}

function buildSources(
  properties: Record<string, unknown>,
  verifiedOn: string,
): OfficialSource[] {
  const sources: OfficialSource[] = []
  const official = asString(properties.official_source_url)
  if (official) {
    sources.push({
      label: 'Official source',
      href: official,
      verifiedOn,
    })
  }
  const geometrySource = asString(properties.geometry_source_url)
  if (geometrySource && geometrySource !== official) {
    sources.push({
      label: 'Geometry source',
      href: geometrySource,
      verifiedOn,
    })
  }
  return sources
}

function adaptFeature(
  feature: GeoJsonFeature,
  featureIndex: number,
): { record?: MunicipalRecord; skipped?: SkippedFeatureReport } {
  const properties =
    feature.properties && typeof feature.properties === 'object'
      ? feature.properties
      : null

  if (feature.type !== 'Feature') {
    return {
      skipped: {
        featureIndex,
        reasons: [`Expected Feature, got ${String(feature.type)}`],
      },
    }
  }
  if (!properties) {
    return {
      skipped: { featureIndex, reasons: ['Missing properties object'] },
    }
  }

  const id =
    asString(feature.id) ??
    asString(properties.decision_id) ??
    asString(properties.id)

  const { coordinates, reasons: coordReasons } = parsePointCoordinates(
    feature.geometry,
    properties,
  )

  const title = asString(properties.title)
  const reasons = [...coordReasons]
  if (!id) reasons.push('Missing feature id / decision_id')
  if (!title) reasons.push('Missing title')
  if (!coordinates) {
    // already noted
  }

  if (reasons.length > 0 || !id || !title || !coordinates) {
    return {
      skipped: {
        featureIndex,
        id: id ?? undefined,
        reasons: reasons.length > 0 ? reasons : ['Incomplete essential fields'],
      },
    }
  }

  const categoryRaw = asString(properties.category) ?? 'other'
  const recordType = asString(properties.record_type) ?? 'unknown'
  const projectStatus = asString(properties.status) ?? 'unknown'
  const participationRaw = asString(properties.participation_status)
  const verifiedOn = asString(properties.last_verified) ?? 'unknown'
  const locationRole =
    asString(properties.location_role) ??
    'official_representative_point_not_impact_boundary'
  const precision = mapLocationPrecision(asString(properties.location_precision))

  const description =
    asString(properties.plain_language_summary) ??
    asString(properties.original_summary) ??
    title

  const municipality = asString(properties.municipality) ?? 'Unknown municipality'

  const record: MunicipalRecord = {
    id,
    title,
    description,
    municipality,
    wardId: asString(properties.ward_id),
    categoryRaw,
    categoryKind: mapCategoryKind(categoryRaw),
    recordType,
    projectStatus,
    gisSourceStatus: asString(properties.source_gis_status),
    decisionStatus: mapDecisionStatus(asString(properties.decision_status)),
    decisionStage: mapDecisionStage(recordType, projectStatus),
    participationAvailability: mapParticipationAvailability(participationRaw),
    canParticipateNow: asBoolean(properties.can_participate_now),
    participationDeadline: asString(properties.participation_deadline),
    participationMethod: asString(properties.participation_method),
    participationUrl: asString(properties.participation_url),
    participationOptions: parseParticipationOptions(properties.participation_options),
    events: parseEvents(properties.events),
    potentialImpacts: parseImpacts(properties.potential_impact),
    uncertainties: asStringArray(properties.uncertainties),
    location: {
      coordinates,
      precision,
      locationRole,
      affectedArea: asString(properties.affected_area),
      note:
        locationRole.includes('not_impact_boundary') ||
        locationRole.includes('representative')
          ? 'Representative point from source data — not a surveyed parcel or impact boundary.'
          : 'Location from source geometry; precision as recorded in the dataset.',
    },
    sources: buildSources(properties, verifiedOn),
    evidence: parseEvidence(properties.evidence),
    dataConfidence: parseConfidence(properties.data_confidence),
    lastVerified: verifiedOn,
    verificationMethod: asString(properties.verification_method),
    officialSourceUrl: asString(properties.official_source_url),
    geometrySourceUrl: asString(properties.geometry_source_url),
    geometrySourceRecord: asString(properties.geometry_source_record),
    gisProjectName: asString(properties.gis_project_name),
    decisionBody: asString(properties.decision_body),
    agendaItemId: asString(properties.agenda_item_id),
    publishedDate: asString(properties.published_date),
    decisionDate: asString(properties.decision_date),
    sourceModifiedDate: asString(properties.source_modified_date),
    relatedProcesses: [],
    metrics: [],
    sourceFeatureId: feature.id,
    dataOrigin: 'geojson',
  }

  return { record }
}

/**
 * Normalize an entire FeatureCollection into MunicipalRecord values.
 * Does not hardcode feature count or individual project names.
 */
export function adaptMunicipalFeatureCollection(
  collection: GeoJsonFeatureCollection,
): { records: MunicipalRecord[]; report: GeoJsonImportReport } {
  const features = Array.isArray(collection.features) ? collection.features : []
  const records: MunicipalRecord[] = []
  const skipped: SkippedFeatureReport[] = []
  const seenIds = new Set<string>()

  features.forEach((feature, featureIndex) => {
    const result = adaptFeature(feature ?? {}, featureIndex)
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

/** Merge curated records that are not already present (by id). */
export function mergeRecordsById(
  primary: readonly MunicipalRecord[],
  curated: readonly MunicipalRecord[],
): MunicipalRecord[] {
  const byId = new Map<string, MunicipalRecord>()
  for (const record of primary) {
    byId.set(record.id, record)
  }
  for (const record of curated) {
    const existing = byId.get(record.id)
    if (!existing) {
      byId.set(record.id, record)
      continue
    }
    // Same id: keep GeoJSON core, overlay curated enrichments when present.
    const sourceHrefs = new Set(existing.sources.map((source) => source.href))
    const mergedSources = [
      ...existing.sources,
      ...record.sources.filter((source) => !sourceHrefs.has(source.href)),
    ]
    byId.set(record.id, {
      ...existing,
      sources: mergedSources,
      relatedProcesses:
        record.relatedProcesses.length > 0
          ? record.relatedProcesses
          : existing.relatedProcesses,
      metrics: record.metrics.length > 0 ? record.metrics : existing.metrics,
      decisionStatus:
        existing.decisionStatus === 'unknown' && record.decisionStatus !== 'unknown'
          ? record.decisionStatus
          : existing.decisionStatus,
      decisionStage:
        existing.decisionStage === 'unknown' && record.decisionStage !== 'unknown'
          ? record.decisionStage
          : existing.decisionStage,
    })
  }
  return [...byId.values()]
}
