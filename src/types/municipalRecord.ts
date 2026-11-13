import type { LngLat } from './map'

/**
 * Visual / filter category bucket derived from source `category` strings.
 * Kept separate from record_type and from any status field.
 */
export type RecordCategoryKind =
  | 'housing'
  | 'parks'
  | 'transit'
  | 'infrastructure'
  | 'environment'
  | 'other'

/** Formal decision outcome when known — not inferred from GIS or consultation status. */
export type DecisionStatus = 'approved' | 'pending' | 'rejected' | 'unknown'

/** Optional normalized decision-making stage when mappable; else unknown. */
export type DecisionStage =
  | 'proposal'
  | 'staff_review'
  | 'public_consultation'
  | 'committee_review'
  | 'council_decision'
  | 'implementation'
  | 'completed'
  | 'unknown'

/**
 * Whether the public can participate now.
 * Do not infer from DecisionStatus or GIS project status.
 */
export type ParticipationAvailability = 'open' | 'not_open' | 'closed' | 'unknown'

export type LocationPrecision =
  | 'approximate'
  | 'indicative_point'
  | 'address_midpoint'
  | 'address_verified'
  | 'unknown'

export interface OfficialSource {
  label: string
  href: string
  verifiedOn: string
}

export interface RecordEvidence {
  evidenceId: string
  sourceUrl: string
  locator?: string
  supports?: string[]
}

export interface PotentialImpact {
  text: string
  kind?: string
  evidenceId?: string
}

export interface ParticipationOption {
  method: string
  availability: string
  opensOn?: string | null
  deadline?: string | null
  deadlinePrecision?: string | null
  deadlineTimezone?: string | null
  deadlineTime?: string | null
  deadlineRule?: string | null
  url?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  venue?: string | null
  eventStart?: string | null
  eventEnd?: string | null
  evidenceId?: string
}

export interface MunicipalEvent {
  type: string
  date?: string | null
  precision?: string | null
  description?: string | null
}

export interface DataConfidence {
  facts?: string
  location?: string
  participation?: string
  limitations?: string
}

export interface RecordLocation {
  coordinates: LngLat
  precision: LocationPrecision
  /** Source location_role — e.g. representative point, not impact boundary. */
  locationRole: string
  affectedArea?: string | null
  note: string
}

export interface RelatedMunicipalProcess {
  id: string
  label: string
  status: DecisionStatus
  note: string
  sources: OfficialSource[]
}

export interface DecisionMetric {
  label: string
  value: string
  detail?: string
}

/**
 * Normalized municipal record used by the map.
 * Preserves source metadata without conflating status concepts.
 */
export interface MunicipalRecord {
  id: string
  title: string
  description: string
  municipality: string
  wardId?: string | null
  /** Raw source category string (e.g. park_design, rental_housing). */
  categoryRaw: string
  /** Bucket used for marker colour / future filters. */
  categoryKind: RecordCategoryKind
  /** Raw record_type (e.g. project_consultation, public_meeting_notice). */
  recordType: string
  /**
   * Raw project/consultation status from the source `status` field
   * (e.g. design_consultation). Not the same as decisionStatus.
   */
  projectStatus: string
  /** GIS layer status (e.g. Complete / In progress) — independent. */
  gisSourceStatus: string | null
  decisionStatus: DecisionStatus
  decisionStage: DecisionStage
  participationAvailability: ParticipationAvailability
  canParticipateNow: boolean | null
  participationDeadline?: string | null
  participationMethod?: string | null
  participationUrl?: string | null
  participationOptions: ParticipationOption[]
  events: MunicipalEvent[]
  potentialImpacts: PotentialImpact[]
  uncertainties: string[]
  location: RecordLocation
  sources: OfficialSource[]
  evidence: RecordEvidence[]
  dataConfidence?: DataConfidence | null
  lastVerified?: string | null
  verificationMethod?: string | null
  officialSourceUrl?: string | null
  geometrySourceUrl?: string | null
  geometrySourceRecord?: string | null
  gisProjectName?: string | null
  decisionBody?: string | null
  agendaItemId?: string | null
  publishedDate?: string | null
  decisionDate?: string | null
  sourceModifiedDate?: string | null
  relatedProcesses: RelatedMunicipalProcess[]
  metrics: DecisionMetric[]
  /** Original GeoJSON feature id when imported from a FeatureCollection. */
  sourceFeatureId?: string | number
  dataOrigin: 'geojson' | 'curated'
}

export interface SkippedFeatureReport {
  featureIndex: number
  id?: string
  reasons: string[]
}

export interface GeoJsonImportReport {
  sourceFeatureCount: number
  importedCount: number
  skipped: SkippedFeatureReport[]
}
