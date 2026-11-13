import type { LngLat } from './map'

/** High-level topic used for future filters — not the same as process status. */
export type DecisionCategory =
  | 'housing'
  | 'transit'
  | 'infrastructure'
  | 'environment'
  | 'other'

/**
 * Outcome / approval state of a municipal process.
 * Independent of stage and of whether feedback is open.
 */
export type DecisionStatus = 'approved' | 'pending' | 'rejected' | 'unknown'

/**
 * Where the file sits in the municipal process timeline.
 * Independent of approval status and feedback window.
 */
export type DecisionStage =
  | 'proposal'
  | 'staff_review'
  | 'public_consultation'
  | 'committee_review'
  | 'council_decision'
  | 'implementation'
  | 'completed'

/**
 * Whether the public can submit feedback right now.
 * Do not infer this from DecisionStatus alone.
 */
export type FeedbackAvailability = 'open' | 'not_open' | 'closed' | 'unknown'

/**
 * How precise the mapped point is.
 * CivicSync currently only uses indicative / address-verified points — never surveyed parcels.
 */
export type LocationPrecision = 'indicative_point' | 'address_midpoint'

export interface OfficialSource {
  label: string
  href: string
  /** ISO date (YYYY-MM-DD) when this source was checked for the curated record. */
  verifiedOn: string
}

export interface DecisionLocation {
  coordinates: LngLat
  precision: LocationPrecision
  addresses: string[]
  /** Human-readable caveat (e.g. not a surveyed boundary). */
  note: string
}

export interface ParticipationInfo {
  /**
   * Short description of known participation avenues.
   * Must not claim feedback is open unless feedbackAvailability is `open`.
   */
  summary: string
  feedbackAvailability: FeedbackAvailability
  sources: OfficialSource[]
  verifiedOn: string
}

/** A distinct municipal process tied to the same site (e.g. zoning vs demolition). */
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

export interface MunicipalDecision {
  id: string
  title: string
  municipality: string
  description: string
  category: DecisionCategory
  location: DecisionLocation
  /** Status of the primary process described by this record. */
  status: DecisionStatus
  stage: DecisionStage
  feedbackAvailability: FeedbackAvailability
  participation: ParticipationInfo
  relatedProcesses: RelatedMunicipalProcess[]
  metrics: DecisionMetric[]
  sources: OfficialSource[]
}
