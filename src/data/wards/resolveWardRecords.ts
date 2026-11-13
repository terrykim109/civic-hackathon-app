import type { MunicipalRecord } from '../../types/municipalRecord'
import type { WardProperties, WardRecordAssociation } from '../../types/ward'

/** Exact ID match only — never infer associations from geography. */
export function resolveWardRecordAssociations(
  ward: Pick<WardProperties, 'decisionIds'>,
  records: readonly MunicipalRecord[],
): WardRecordAssociation[] {
  const byId = new Map(records.map((record) => [record.id, record]))

  return ward.decisionIds.map((decisionId) => {
    const record = byId.get(decisionId)
    return {
      decisionId,
      recordId: record?.id ?? null,
      found: Boolean(record),
    }
  })
}

export function getRecordsForWard(
  ward: Pick<WardProperties, 'decisionIds'>,
  records: readonly MunicipalRecord[],
): {
  matched: MunicipalRecord[]
  missingDecisionIds: string[]
} {
  const associations = resolveWardRecordAssociations(ward, records)
  const matched: MunicipalRecord[] = []
  const missingDecisionIds: string[] = []
  const byId = new Map(records.map((record) => [record.id, record]))

  for (const association of associations) {
    if (association.found && association.recordId) {
      const record = byId.get(association.recordId)
      if (record) matched.push(record)
    } else {
      missingDecisionIds.push(association.decisionId)
    }
  }

  return { matched, missingDecisionIds }
}

export function parseWardProperties(
  properties: Record<string, unknown> | null | undefined,
): WardProperties | null {
  if (!properties) return null
  const wardId = properties.ward_id
  const name = properties.name
  const role = properties.role
  const decisionIdsRaw = properties.decision_ids

  if (typeof wardId !== 'string' || !wardId.trim()) return null
  if (typeof name !== 'string' || !name.trim()) return null

  const decisionIds = Array.isArray(decisionIdsRaw)
    ? decisionIdsRaw.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : []

  return {
    wardId: wardId.trim(),
    name: name.trim(),
    decisionIds,
    role: typeof role === 'string' && role.trim() ? role.trim() : 'navigation_boundary_not_impact_area',
  }
}
