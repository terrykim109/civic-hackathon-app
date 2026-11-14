import type { MunicipalRecord } from '../../types/municipalRecord'
import { humanizeToken } from '../records/recordPreview'

export interface MarkerPreviewInfo {
  title: string
  category: string | null
  status: string | null
}

/**
 * Project only fields that exist on the record for the marker hover card.
 * Omits category/status when blank or unknown — never invents labels.
 */
export function buildMarkerPreview(record: MunicipalRecord): MarkerPreviewInfo {
  const title = record.title.trim()
  const categoryRaw = record.categoryRaw?.trim() || ''
  const category = categoryRaw ? humanizeToken(categoryRaw) : null

  const projectStatus = record.projectStatus?.trim() || ''
  const status =
    projectStatus && projectStatus.toLowerCase() !== 'unknown'
      ? humanizeToken(projectStatus)
      : null

  return {
    title: title || record.id,
    category,
    status,
  }
}
