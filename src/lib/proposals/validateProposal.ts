import type { MunicipalRecord } from '../../types/municipalRecord'
import type { PublicationStatus } from '../supabase/types'

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const URL_PATTERN = /^https?:\/\/.+/i

export interface ProposalValidationResult {
  ok: boolean
  errors: string[]
}

function requireText(value: string | null | undefined, label: string): string | null {
  if (!value || !value.trim()) return `${label} is required.`
  return null
}

function optionalUrl(value: string | null | undefined, label: string): string | null {
  if (!value || !value.trim()) return null
  if (!URL_PATTERN.test(value.trim())) {
    return `${label} must be an http(s) URL.`
  }
  return null
}

function validateCoordinates(lng: number, lat: number): string[] {
  const errors: string[] = []
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    errors.push('Longitude must be a number between -180 and 180.')
  }
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    errors.push('Latitude must be a number between -90 and 90.')
  }
  return errors
}

/**
 * Validate a MunicipalRecord before draft save or publish.
 * Publish requires the same core integrity as draft (no partial publishes).
 */
export function validateProposal(
  record: MunicipalRecord,
  options: { publicationStatus: PublicationStatus } = {
    publicationStatus: 'draft',
  },
): ProposalValidationResult {
  const errors: string[] = []

  const idError = requireText(record.id, 'Record id')
  if (idError) errors.push(idError)
  else if (!ID_PATTERN.test(record.id.trim())) {
    errors.push(
      'Record id must be lowercase letters, numbers, and hyphens (e.g. toronto-notice-8007).',
    )
  }

  for (const [value, label] of [
    [record.title, 'Title'],
    [record.description, 'Description'],
    [record.municipality, 'Municipality'],
    [record.categoryRaw, 'Category'],
    [record.recordType, 'Record type'],
    [record.projectStatus, 'Project status'],
  ] as const) {
    const err = requireText(value, label)
    if (err) errors.push(err)
  }

  if (!record.categoryKind) errors.push('Category kind is required.')
  if (!record.decisionStatus) errors.push('Decision status is required.')
  if (!record.decisionStage) errors.push('Decision stage is required.')
  if (!record.participationAvailability) {
    errors.push('Participation availability is required.')
  }
  if (!record.dataOrigin) errors.push('Data origin is required.')

  if (!record.location?.note?.trim()) {
    errors.push('Location note is required (e.g. representative point disclaimer).')
  }
  if (!record.location?.locationRole?.trim()) {
    errors.push('Location role is required.')
  }
  if (!record.location?.precision) {
    errors.push('Location precision is required.')
  }

  const [lng, lat] = record.location?.coordinates ?? [NaN, NaN]
  errors.push(...validateCoordinates(lng, lat))

  const urlChecks: Array<[string | null | undefined, string]> = [
    [record.participationUrl, 'Participation URL'],
    [record.officialSourceUrl, 'Official source URL'],
    [record.geometrySourceUrl, 'Geometry source URL'],
  ]
  for (const [value, label] of urlChecks) {
    const err = optionalUrl(value, label)
    if (err) errors.push(err)
  }

  record.sources.forEach((source, index) => {
    if (!source.label?.trim()) {
      errors.push(`Source ${index + 1}: label is required.`)
    }
    const hrefError = optionalUrl(source.href, `Source ${index + 1} URL`)
    if (!source.href?.trim()) {
      errors.push(`Source ${index + 1}: URL is required.`)
    } else if (hrefError) {
      errors.push(hrefError)
    }
  })

  record.evidence.forEach((item, index) => {
    if (!item.evidenceId?.trim()) {
      errors.push(`Evidence ${index + 1}: evidence id is required.`)
    }
    if (!item.sourceUrl?.trim()) {
      errors.push(`Evidence ${index + 1}: source URL is required.`)
    } else {
      const err = optionalUrl(item.sourceUrl, `Evidence ${index + 1} URL`)
      if (err) errors.push(err)
    }
  })

  record.potentialImpacts.forEach((impact, index) => {
    if (!impact.text?.trim()) {
      errors.push(`Impact ${index + 1}: text is required.`)
    }
  })

  if (options.publicationStatus === 'published') {
    if (record.participationAvailability === 'open' && record.canParticipateNow == null) {
      errors.push(
        'When participation is open, set “Can participate now” explicitly (true/false), never leave it blank.',
      )
    }
  }

  return { ok: errors.length === 0, errors }
}

export function slugifyProposalId(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return base || 'municipal-proposal'
}
