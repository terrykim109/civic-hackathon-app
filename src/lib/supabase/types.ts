import type { MunicipalRecord } from '../../types/municipalRecord'

/** CivicLens publication state — independent of municipal decisionStatus. */
export type PublicationStatus = 'draft' | 'published' | 'archived'

export type FeedbackReviewStatus = 'new' | 'under_review' | 'reviewed'

/** Row shape for public.municipal_records (PostgREST / generated-client friendly). */
export interface MunicipalRecordRow {
  id: string
  publication_status: PublicationStatus
  title: string
  description: string
  municipality: string
  ward_id: string | null
  category_raw: string
  category_kind: string
  record_type: string
  project_status: string
  gis_source_status: string | null
  decision_status: string
  decision_stage: string
  participation_availability: string
  can_participate_now: boolean | null
  participation_deadline: string | null
  participation_method: string | null
  participation_url: string | null
  location_lng: number
  location_lat: number
  location: MunicipalRecord['location']
  participation_options: MunicipalRecord['participationOptions']
  events: MunicipalRecord['events']
  potential_impacts: MunicipalRecord['potentialImpacts']
  uncertainties: string[]
  sources: MunicipalRecord['sources']
  evidence: MunicipalRecord['evidence']
  data_confidence: MunicipalRecord['dataConfidence']
  related_processes: MunicipalRecord['relatedProcesses']
  metrics: MunicipalRecord['metrics']
  last_verified: string | null
  verification_method: string | null
  official_source_url: string | null
  geometry_source_url: string | null
  geometry_source_record: string | null
  gis_project_name: string | null
  decision_body: string | null
  agenda_item_id: string | null
  published_date: string | null
  decision_date: string | null
  source_modified_date: string | null
  source_feature_id: string | null
  data_origin: string
  /** Canonical MunicipalRecord JSON document. */
  record: MunicipalRecord
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface FeedbackSubmissionRow {
  id: string
  municipal_record_id: string
  comment: string
  perspective: string | null
  contact_name: string | null
  contact_email: string | null
  review_status: FeedbackReviewStatus
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

export interface AdminUserRow {
  user_id: string
  created_at: string
  created_by: string | null
  note: string | null
}

export interface Database {
  public: {
    Tables: {
      municipal_records: {
        Row: MunicipalRecordRow
        Insert: Omit<
          MunicipalRecordRow,
          'created_at' | 'updated_at'
        > & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<MunicipalRecordRow>
      }
      feedback_submissions: {
        Row: FeedbackSubmissionRow
        Insert: Omit<FeedbackSubmissionRow, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<FeedbackSubmissionRow>
      }
      admin_users: {
        Row: AdminUserRow
        Insert: Omit<AdminUserRow, 'created_at'> & { created_at?: string }
        Update: Partial<AdminUserRow>
      }
    }
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean }
    }
  }
}
