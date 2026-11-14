import type {
  DecisionStage,
  DecisionStatus,
  LocationPrecision,
  MunicipalRecord,
  ParticipationAvailability,
  RecordCategoryKind,
} from '../../types/municipalRecord'
import { rowToMunicipalRecord } from '../supabase/municipalRecordMapper'
import type { MunicipalRecordRow } from '../supabase/types'

const CATEGORY_KINDS = new Set<RecordCategoryKind>([
  'housing',
  'parks',
  'transit',
  'infrastructure',
  'environment',
  'other',
])

const DECISION_STATUSES = new Set<DecisionStatus>([
  'approved',
  'pending',
  'rejected',
  'unknown',
])

const DECISION_STAGES = new Set<DecisionStage>([
  'proposal',
  'staff_review',
  'public_consultation',
  'committee_review',
  'council_decision',
  'implementation',
  'completed',
  'unknown',
])

const PARTICIPATION = new Set<ParticipationAvailability>([
  'open',
  'not_open',
  'closed',
  'unknown',
])

const PRECISIONS = new Set<LocationPrecision>([
  'approximate',
  'indicative_point',
  'address_midpoint',
  'address_verified',
  'unknown',
])

const DATA_ORIGINS = new Set<MunicipalRecord['dataOrigin']>([
  'geojson',
  'curated',
  'open_data',
])

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeRecord(record: MunicipalRecord): MunicipalRecord | null {
  if (!record.id?.trim() || !record.title?.trim() || !record.description?.trim()) {
    return null
  }
  if (!record.municipality?.trim()) return null
  if (!record.categoryRaw?.trim() || !record.recordType?.trim()) return null
  if (!record.projectStatus?.trim()) return null

  const [lng, lat] = record.location?.coordinates ?? [NaN, NaN]
  if (
    !Number.isFinite(lng) ||
    !Number.isFinite(lat) ||
    Math.abs(lng) > 180 ||
    Math.abs(lat) > 90
  ) {
    return null
  }

  if (!record.location?.note?.trim() || !record.location?.locationRole?.trim()) {
    return null
  }

  return {
    ...record,
    categoryKind: CATEGORY_KINDS.has(record.categoryKind)
      ? record.categoryKind
      : 'other',
    decisionStatus: DECISION_STATUSES.has(record.decisionStatus)
      ? record.decisionStatus
      : 'unknown',
    decisionStage: DECISION_STAGES.has(record.decisionStage)
      ? record.decisionStage
      : 'unknown',
    participationAvailability: PARTICIPATION.has(record.participationAvailability)
      ? record.participationAvailability
      : 'unknown',
    location: {
      ...record.location,
      precision: PRECISIONS.has(record.location.precision)
        ? record.location.precision
        : 'unknown',
      coordinates: [lng, lat],
    },
    participationOptions: Array.isArray(record.participationOptions)
      ? record.participationOptions
      : [],
    events: Array.isArray(record.events) ? record.events : [],
    potentialImpacts: Array.isArray(record.potentialImpacts)
      ? record.potentialImpacts
      : [],
    uncertainties: Array.isArray(record.uncertainties) ? record.uncertainties : [],
    sources: Array.isArray(record.sources) ? record.sources : [],
    evidence: Array.isArray(record.evidence) ? record.evidence : [],
    relatedProcesses: Array.isArray(record.relatedProcesses)
      ? record.relatedProcesses
      : [],
    metrics: Array.isArray(record.metrics) ? record.metrics : [],
    dataOrigin: DATA_ORIGINS.has(record.dataOrigin) ? record.dataOrigin : 'curated',
  }
}

function isRowShape(value: unknown): value is MunicipalRecordRow {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return (
    typeof row.id === 'string' &&
    typeof row.publication_status === 'string' &&
    typeof row.title === 'string'
  )
}

export interface AdaptedPublishedRecord {
  record: MunicipalRecord | null
  skippedReason: string | null
}

/**
 * Safely adapt a municipal_records row for the public map.
 * Rejects non-published rows and malformed payloads instead of inventing data.
 */
export function adaptPublishedMunicipalRow(
  value: unknown,
): AdaptedPublishedRecord {
  if (!isRowShape(value)) {
    return { record: null, skippedReason: 'Row is missing required fields.' }
  }

  if (value.publication_status !== 'published') {
    return {
      record: null,
      skippedReason: `Skipped non-published row (${value.publication_status}).`,
    }
  }

  const lng = asFiniteNumber(value.location_lng)
  const lat = asFiniteNumber(value.location_lat)
  if (lng === null || lat === null) {
    return {
      record: null,
      skippedReason: `Skipped ${value.id}: invalid coordinates.`,
    }
  }

  try {
    const mapped = rowToMunicipalRecord({
      ...value,
      location_lng: lng,
      location_lat: lat,
      participation_options: Array.isArray(value.participation_options)
        ? value.participation_options
        : [],
      events: Array.isArray(value.events) ? value.events : [],
      potential_impacts: Array.isArray(value.potential_impacts)
        ? value.potential_impacts
        : [],
      uncertainties: Array.isArray(value.uncertainties) ? value.uncertainties : [],
      sources: Array.isArray(value.sources) ? value.sources : [],
      evidence: Array.isArray(value.evidence) ? value.evidence : [],
      related_processes: Array.isArray(value.related_processes)
        ? value.related_processes
        : [],
      metrics: Array.isArray(value.metrics) ? value.metrics : [],
      location:
        value.location && typeof value.location === 'object'
          ? value.location
          : {
              coordinates: [lng, lat] as [number, number],
              precision: 'unknown' as const,
              locationRole: 'unknown',
              note: 'Location reconstructed from published coordinates.',
            },
      record:
        value.record && typeof value.record === 'object'
          ? (value.record as MunicipalRecord)
          : ({
              id: value.id,
              title: value.title,
              description: value.description,
              municipality: value.municipality,
              categoryRaw: value.category_raw,
              categoryKind: value.category_kind,
              recordType: value.record_type,
              projectStatus: value.project_status,
              gisSourceStatus: value.gis_source_status,
              decisionStatus: value.decision_status,
              decisionStage: value.decision_stage,
              participationAvailability: value.participation_availability,
              canParticipateNow: value.can_participate_now,
              participationOptions: [],
              events: [],
              potentialImpacts: [],
              uncertainties: [],
              location: {
                coordinates: [lng, lat],
                precision: 'unknown',
                locationRole: 'unknown',
                note: 'Location reconstructed from published coordinates.',
              },
              sources: [],
              evidence: [],
              relatedProcesses: [],
              metrics: [],
              dataOrigin: value.data_origin,
            } as MunicipalRecord),
    })

    const normalized = normalizeRecord(mapped)
    if (!normalized) {
      return {
        record: null,
        skippedReason: `Skipped ${value.id}: failed MunicipalRecord validation.`,
      }
    }

    return { record: normalized, skippedReason: null }
  } catch {
    return {
      record: null,
      skippedReason: `Skipped ${value.id}: adapter threw on malformed payload.`,
    }
  }
}
