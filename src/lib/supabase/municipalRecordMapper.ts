import type { MunicipalRecord } from '../../types/municipalRecord'
import type { MunicipalRecordRow, PublicationStatus } from './types'

/**
 * Map a MunicipalRecord into a DB insert/upsert payload.
 * Scalar columns mirror the model for filters; `record` stays canonical.
 */
export function municipalRecordToRow(
  record: MunicipalRecord,
  publicationStatus: PublicationStatus = 'draft',
): Omit<MunicipalRecordRow, 'created_at' | 'updated_at' | 'created_by' | 'updated_by'> {
  const [lng, lat] = record.location.coordinates

  return {
    id: record.id,
    publication_status: publicationStatus,
    title: record.title,
    description: record.description,
    municipality: record.municipality,
    ward_id: record.wardId ?? null,
    category_raw: record.categoryRaw,
    category_kind: record.categoryKind,
    record_type: record.recordType,
    project_status: record.projectStatus,
    gis_source_status: record.gisSourceStatus,
    decision_status: record.decisionStatus,
    decision_stage: record.decisionStage,
    participation_availability: record.participationAvailability,
    can_participate_now: record.canParticipateNow,
    participation_deadline: record.participationDeadline ?? null,
    participation_method: record.participationMethod ?? null,
    participation_url: record.participationUrl ?? null,
    location_lng: lng,
    location_lat: lat,
    location: record.location,
    participation_options: record.participationOptions,
    events: record.events,
    potential_impacts: record.potentialImpacts,
    uncertainties: record.uncertainties,
    sources: record.sources,
    evidence: record.evidence,
    data_confidence: record.dataConfidence ?? null,
    related_processes: record.relatedProcesses,
    metrics: record.metrics,
    last_verified: record.lastVerified ?? null,
    verification_method: record.verificationMethod ?? null,
    official_source_url: record.officialSourceUrl ?? null,
    geometry_source_url: record.geometrySourceUrl ?? null,
    geometry_source_record: record.geometrySourceRecord ?? null,
    gis_project_name: record.gisProjectName ?? null,
    decision_body: record.decisionBody ?? null,
    agenda_item_id: record.agendaItemId ?? null,
    published_date: record.publishedDate ?? null,
    decision_date: record.decisionDate ?? null,
    source_modified_date: record.sourceModifiedDate ?? null,
    source_feature_id:
      record.sourceFeatureId === undefined || record.sourceFeatureId === null
        ? null
        : String(record.sourceFeatureId),
    data_origin: record.dataOrigin,
    record,
  }
}

/**
 * Prefer the stored canonical JSON document when present and id-aligned.
 * Falls back to scalar columns if `record` is missing (should not happen).
 */
export function rowToMunicipalRecord(row: MunicipalRecordRow): MunicipalRecord {
  if (row.record && row.record.id === row.id) {
    return row.record
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    municipality: row.municipality,
    wardId: row.ward_id,
    categoryRaw: row.category_raw,
    categoryKind: row.category_kind as MunicipalRecord['categoryKind'],
    recordType: row.record_type,
    projectStatus: row.project_status,
    gisSourceStatus: row.gis_source_status,
    decisionStatus: row.decision_status as MunicipalRecord['decisionStatus'],
    decisionStage: row.decision_stage as MunicipalRecord['decisionStage'],
    participationAvailability:
      row.participation_availability as MunicipalRecord['participationAvailability'],
    canParticipateNow: row.can_participate_now,
    participationDeadline: row.participation_deadline,
    participationMethod: row.participation_method,
    participationUrl: row.participation_url,
    participationOptions: row.participation_options ?? [],
    events: row.events ?? [],
    potentialImpacts: row.potential_impacts ?? [],
    uncertainties: row.uncertainties ?? [],
    location: row.location ?? {
      coordinates: [row.location_lng, row.location_lat],
      precision: 'unknown',
      locationRole: 'unknown',
      note: 'Reconstructed from scalar columns; prefer record JSONB.',
    },
    sources: row.sources ?? [],
    evidence: row.evidence ?? [],
    dataConfidence: row.data_confidence,
    lastVerified: row.last_verified,
    verificationMethod: row.verification_method,
    officialSourceUrl: row.official_source_url,
    geometrySourceUrl: row.geometry_source_url,
    geometrySourceRecord: row.geometry_source_record,
    gisProjectName: row.gis_project_name,
    decisionBody: row.decision_body,
    agendaItemId: row.agenda_item_id,
    publishedDate: row.published_date,
    decisionDate: row.decision_date,
    sourceModifiedDate: row.source_modified_date,
    relatedProcesses: row.related_processes ?? [],
    metrics: row.metrics ?? [],
    sourceFeatureId: row.source_feature_id ?? undefined,
    dataOrigin: row.data_origin as MunicipalRecord['dataOrigin'],
  }
}
