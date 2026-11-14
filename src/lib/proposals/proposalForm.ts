import type {
  DecisionStage,
  DecisionStatus,
  LocationPrecision,
  MunicipalRecord,
  ParticipationAvailability,
  RecordCategoryKind,
} from '../../types/municipalRecord'
import { slugifyProposalId } from './validateProposal'

/** Editable admin form model — maps 1:1 onto MunicipalRecord (no second domain model). */
export interface ProposalFormState {
  id: string
  title: string
  description: string
  municipality: string
  wardId: string
  categoryRaw: string
  categoryKind: RecordCategoryKind
  recordType: string
  projectStatus: string
  gisSourceStatus: string
  decisionStatus: DecisionStatus
  decisionStage: DecisionStage
  participationAvailability: ParticipationAvailability
  canParticipateNow: 'true' | 'false' | 'unknown'
  participationDeadline: string
  participationMethod: string
  participationUrl: string
  longitude: string
  latitude: string
  locationPrecision: LocationPrecision
  locationRole: string
  affectedArea: string
  locationNote: string
  uncertaintiesText: string
  impactsText: string
  sourcesText: string
  evidenceText: string
  eventsText: string
  participationOptionsText: string
  relatedProcessesText: string
  metricsText: string
  lastVerified: string
  verificationMethod: string
  officialSourceUrl: string
  geometrySourceUrl: string
  geometrySourceRecord: string
  gisProjectName: string
  decisionBody: string
  agendaItemId: string
  publishedDate: string
  decisionDate: string
  sourceModifiedDate: string
  dataOrigin: MunicipalRecord['dataOrigin']
  dataConfidenceFacts: string
  dataConfidenceLocation: string
  dataConfidenceParticipation: string
  dataConfidenceLimitations: string
}

export const CATEGORY_KINDS: RecordCategoryKind[] = [
  'housing',
  'parks',
  'transit',
  'infrastructure',
  'environment',
  'other',
]

export const DECISION_STATUSES: DecisionStatus[] = [
  'approved',
  'pending',
  'rejected',
  'unknown',
]

export const DECISION_STAGES: DecisionStage[] = [
  'proposal',
  'staff_review',
  'public_consultation',
  'committee_review',
  'council_decision',
  'implementation',
  'completed',
  'unknown',
]

export const PARTICIPATION_AVAILABILITIES: ParticipationAvailability[] = [
  'open',
  'not_open',
  'closed',
  'unknown',
]

export const LOCATION_PRECISIONS: LocationPrecision[] = [
  'approximate',
  'indicative_point',
  'address_midpoint',
  'address_verified',
  'unknown',
]

export function createEmptyProposalForm(seedTitle = ''): ProposalFormState {
  const id = seedTitle
    ? `${slugifyProposalId(seedTitle)}-${Date.now().toString(36)}`
    : `proposal-${Date.now().toString(36)}`

  return {
    id,
    title: seedTitle,
    description: '',
    municipality: 'Toronto',
    wardId: '',
    categoryRaw: '',
    categoryKind: 'other',
    recordType: '',
    projectStatus: '',
    gisSourceStatus: '',
    decisionStatus: 'unknown',
    decisionStage: 'unknown',
    participationAvailability: 'unknown',
    canParticipateNow: 'unknown',
    participationDeadline: '',
    participationMethod: '',
    participationUrl: '',
    longitude: '-79.3832',
    latitude: '43.6532',
    locationPrecision: 'approximate',
    locationRole: 'official_representative_point_not_impact_boundary',
    affectedArea: '',
    locationNote:
      'Representative point — not a surveyed property boundary or project impact area.',
    uncertaintiesText: '',
    impactsText: '',
    sourcesText: '',
    evidenceText: '',
    eventsText: '',
    participationOptionsText: '[]',
    relatedProcessesText: '[]',
    metricsText: '[]',
    lastVerified: '',
    verificationMethod: '',
    officialSourceUrl: '',
    geometrySourceUrl: '',
    geometrySourceRecord: '',
    gisProjectName: '',
    decisionBody: '',
    agendaItemId: '',
    publishedDate: '',
    decisionDate: '',
    sourceModifiedDate: '',
    dataOrigin: 'curated',
    dataConfidenceFacts: '',
    dataConfidenceLocation: '',
    dataConfidenceParticipation: '',
    dataConfidenceLimitations: '',
  }
}

function parseLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseImpacts(text: string): MunicipalRecord['potentialImpacts'] {
  return parseLines(text).map((line) => {
    const [kind, ...rest] = line.split('|')
    if (rest.length > 0) {
      return { kind: kind.trim() || undefined, text: rest.join('|').trim() }
    }
    return { text: line }
  })
}

function serializeImpacts(
  impacts: MunicipalRecord['potentialImpacts'],
): string {
  return impacts
    .map((impact) =>
      impact.kind ? `${impact.kind}|${impact.text}` : impact.text,
    )
    .join('\n')
}

function parseSources(text: string): MunicipalRecord['sources'] {
  return parseLines(text).flatMap((line) => {
    const [label, href, verifiedOn] = line.split('|').map((part) => part.trim())
    if (!label && !href) return []
    return [
      {
        label: label || 'Source',
        href: href || '',
        verifiedOn: verifiedOn || new Date().toISOString().slice(0, 10),
      },
    ]
  })
}

function serializeSources(sources: MunicipalRecord['sources']): string {
  return sources
    .map((source) => `${source.label}|${source.href}|${source.verifiedOn}`)
    .join('\n')
}

function parseEvidence(text: string): MunicipalRecord['evidence'] {
  return parseLines(text).flatMap((line) => {
    const [evidenceId, sourceUrl, locator] = line
      .split('|')
      .map((part) => part.trim())
    if (!evidenceId && !sourceUrl) return []
    return [
      {
        evidenceId: evidenceId || 'evidence',
        sourceUrl: sourceUrl || '',
        locator: locator || undefined,
      },
    ]
  })
}

function serializeEvidence(evidence: MunicipalRecord['evidence']): string {
  return evidence
    .map((item) =>
      [item.evidenceId, item.sourceUrl, item.locator ?? ''].join('|'),
    )
    .join('\n')
}

function parseEvents(text: string): MunicipalRecord['events'] {
  return parseLines(text).flatMap((line) => {
    const [type, date, description] = line.split('|').map((part) => part.trim())
    if (!type) return []
    return [{ type, date: date || null, description: description || null }]
  })
}

function serializeEvents(events: MunicipalRecord['events']): string {
  return events
    .map((event) =>
      [event.type, event.date ?? '', event.description ?? ''].join('|'),
    )
    .join('\n')
}

function parseJsonArray<T>(text: string, fallback: T[]): T[] {
  const trimmed = text.trim()
  if (!trimmed) return fallback
  try {
    const parsed = JSON.parse(trimmed) as unknown
    return Array.isArray(parsed) ? (parsed as T[]) : fallback
  } catch {
    return fallback
  }
}

export function formStateToMunicipalRecord(
  form: ProposalFormState,
): MunicipalRecord {
  const lng = Number(form.longitude)
  const lat = Number(form.latitude)

  const confidenceBits = [
    form.dataConfidenceFacts,
    form.dataConfidenceLocation,
    form.dataConfidenceParticipation,
    form.dataConfidenceLimitations,
  ]
  const hasConfidence = confidenceBits.some((value) => value.trim())

  return {
    id: form.id.trim(),
    title: form.title.trim(),
    description: form.description.trim(),
    municipality: form.municipality.trim(),
    wardId: form.wardId.trim() || null,
    categoryRaw: form.categoryRaw.trim(),
    categoryKind: form.categoryKind,
    recordType: form.recordType.trim(),
    projectStatus: form.projectStatus.trim(),
    gisSourceStatus: form.gisSourceStatus.trim() || null,
    decisionStatus: form.decisionStatus,
    decisionStage: form.decisionStage,
    participationAvailability: form.participationAvailability,
    canParticipateNow:
      form.canParticipateNow === 'unknown'
        ? null
        : form.canParticipateNow === 'true',
    participationDeadline: form.participationDeadline.trim() || null,
    participationMethod: form.participationMethod.trim() || null,
    participationUrl: form.participationUrl.trim() || null,
    participationOptions: parseJsonArray(form.participationOptionsText, []),
    events: parseEvents(form.eventsText),
    potentialImpacts: parseImpacts(form.impactsText),
    uncertainties: parseLines(form.uncertaintiesText),
    location: {
      coordinates: [lng, lat],
      precision: form.locationPrecision,
      locationRole: form.locationRole.trim(),
      affectedArea: form.affectedArea.trim() || null,
      note: form.locationNote.trim(),
    },
    sources: parseSources(form.sourcesText),
    evidence: parseEvidence(form.evidenceText),
    dataConfidence: hasConfidence
      ? {
          facts: form.dataConfidenceFacts.trim() || undefined,
          location: form.dataConfidenceLocation.trim() || undefined,
          participation: form.dataConfidenceParticipation.trim() || undefined,
          limitations: form.dataConfidenceLimitations.trim() || undefined,
        }
      : null,
    lastVerified: form.lastVerified.trim() || null,
    verificationMethod: form.verificationMethod.trim() || null,
    officialSourceUrl: form.officialSourceUrl.trim() || null,
    geometrySourceUrl: form.geometrySourceUrl.trim() || null,
    geometrySourceRecord: form.geometrySourceRecord.trim() || null,
    gisProjectName: form.gisProjectName.trim() || null,
    decisionBody: form.decisionBody.trim() || null,
    agendaItemId: form.agendaItemId.trim() || null,
    publishedDate: form.publishedDate.trim() || null,
    decisionDate: form.decisionDate.trim() || null,
    sourceModifiedDate: form.sourceModifiedDate.trim() || null,
    relatedProcesses: parseJsonArray(form.relatedProcessesText, []),
    metrics: parseJsonArray(form.metricsText, []),
    dataOrigin: form.dataOrigin,
  }
}

export function municipalRecordToFormState(
  record: MunicipalRecord,
): ProposalFormState {
  const [lng, lat] = record.location.coordinates
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    municipality: record.municipality,
    wardId: record.wardId ?? '',
    categoryRaw: record.categoryRaw,
    categoryKind: record.categoryKind,
    recordType: record.recordType,
    projectStatus: record.projectStatus,
    gisSourceStatus: record.gisSourceStatus ?? '',
    decisionStatus: record.decisionStatus,
    decisionStage: record.decisionStage,
    participationAvailability: record.participationAvailability,
    canParticipateNow:
      record.canParticipateNow === true
        ? 'true'
        : record.canParticipateNow === false
          ? 'false'
          : 'unknown',
    participationDeadline: record.participationDeadline ?? '',
    participationMethod: record.participationMethod ?? '',
    participationUrl: record.participationUrl ?? '',
    longitude: String(lng),
    latitude: String(lat),
    locationPrecision: record.location.precision,
    locationRole: record.location.locationRole,
    affectedArea: record.location.affectedArea ?? '',
    locationNote: record.location.note,
    uncertaintiesText: record.uncertainties.join('\n'),
    impactsText: serializeImpacts(record.potentialImpacts),
    sourcesText: serializeSources(record.sources),
    evidenceText: serializeEvidence(record.evidence),
    eventsText: serializeEvents(record.events),
    participationOptionsText: JSON.stringify(
      record.participationOptions ?? [],
      null,
      2,
    ),
    relatedProcessesText: JSON.stringify(record.relatedProcesses ?? [], null, 2),
    metricsText: JSON.stringify(record.metrics ?? [], null, 2),
    lastVerified: record.lastVerified ?? '',
    verificationMethod: record.verificationMethod ?? '',
    officialSourceUrl: record.officialSourceUrl ?? '',
    geometrySourceUrl: record.geometrySourceUrl ?? '',
    geometrySourceRecord: record.geometrySourceRecord ?? '',
    gisProjectName: record.gisProjectName ?? '',
    decisionBody: record.decisionBody ?? '',
    agendaItemId: record.agendaItemId ?? '',
    publishedDate: record.publishedDate ?? '',
    decisionDate: record.decisionDate ?? '',
    sourceModifiedDate: record.sourceModifiedDate ?? '',
    dataOrigin: record.dataOrigin,
    dataConfidenceFacts: record.dataConfidence?.facts ?? '',
    dataConfidenceLocation: record.dataConfidence?.location ?? '',
    dataConfidenceParticipation: record.dataConfidence?.participation ?? '',
    dataConfidenceLimitations: record.dataConfidence?.limitations ?? '',
  }
}
