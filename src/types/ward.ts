/**
 * Toronto municipal ward used for navigation / discovery only.
 * `role` is always a navigation boundary — never a project impact area.
 */
export interface WardProperties {
  wardId: string
  name: string
  decisionIds: string[]
  role: 'navigation_boundary_not_impact_area' | string
}

export type WardSelection = WardProperties

export interface WardRecordAssociation {
  decisionId: string
  recordId: string | null
  found: boolean
}
