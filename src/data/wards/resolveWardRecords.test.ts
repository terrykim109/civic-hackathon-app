import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { MunicipalRecord } from '../../types/municipalRecord'
import {
  getRecordsForWard,
  parseWardProperties,
  resolveWardRecordAssociations,
} from './resolveWardRecords'

const here = dirname(fileURLToPath(import.meta.url))

function stubRecord(id: string): MunicipalRecord {
  return {
    id,
    title: id,
    description: 'stub',
    municipality: 'Toronto',
    categoryRaw: 'other',
    categoryKind: 'other',
    recordType: 'stub',
    projectStatus: 'unknown',
    gisSourceStatus: null,
    decisionStatus: 'unknown',
    decisionStage: 'unknown',
    participationAvailability: 'unknown',
    canParticipateNow: null,
    participationOptions: [],
    events: [],
    potentialImpacts: [],
    uncertainties: [],
    location: {
      coordinates: [-79.4, 43.7],
      precision: 'approximate',
      locationRole: 'test',
      note: 'test',
    },
    sources: [],
    evidence: [],
    relatedProcesses: [],
    metrics: [],
    dataOrigin: 'curated',
  }
}

describe('wards.geojson source file', () => {
  it('contains 25 unique MultiPolygon wards with string ids', () => {
    const raw = readFileSync(resolve(here, '../wards.geojson'), 'utf8')
    const fc = JSON.parse(raw) as {
      type: string
      features: Array<{
        geometry?: { type?: string }
        properties?: Record<string, unknown>
      }>
    }

    expect(fc.type).toBe('FeatureCollection')
    expect(fc.features).toHaveLength(25)

    const ids = fc.features.map((feature) => {
      expect(feature.geometry?.type).toBe('MultiPolygon')
      const ward = parseWardProperties(feature.properties)
      expect(ward).not.toBeNull()
      expect(ward?.role).toBe('navigation_boundary_not_impact_area')
      return ward!.wardId
    })

    expect(new Set(ids).size).toBe(25)

    const withDecisions = fc.features
      .map((feature) => parseWardProperties(feature.properties))
      .filter((ward) => ward && ward.decisionIds.length > 0)

    expect(withDecisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          wardId: '7',
          decisionIds: ['toronto-apted-amenities-2026'],
        }),
        expect.objectContaining({
          wardId: '12',
          decisionIds: ['toronto-wychwood-streetcar-2026'],
        }),
      ]),
    )
    expect(withDecisions).toHaveLength(2)
  })
})

describe('resolveWardRecordAssociations', () => {
  const records = [
    stubRecord('toronto-apted-amenities-2026'),
    stubRecord('toronto-wychwood-streetcar-2026'),
  ]

  it('matches decision ids exactly and reports missing ids', () => {
    const associations = resolveWardRecordAssociations(
      {
        decisionIds: [
          'toronto-apted-amenities-2026',
          'does-not-exist',
        ],
      },
      records,
    )

    expect(associations).toEqual([
      {
        decisionId: 'toronto-apted-amenities-2026',
        recordId: 'toronto-apted-amenities-2026',
        found: true,
      },
      {
        decisionId: 'does-not-exist',
        recordId: null,
        found: false,
      },
    ])
  })

  it('returns matched records and missing ids for UI empty/error states', () => {
    const result = getRecordsForWard(
      { decisionIds: ['toronto-wychwood-streetcar-2026', 'missing-id'] },
      records,
    )
    expect(result.matched.map((record) => record.id)).toEqual([
      'toronto-wychwood-streetcar-2026',
    ])
    expect(result.missingDecisionIds).toEqual(['missing-id'])
  })

  it('supports wards with empty decision_ids', () => {
    const result = getRecordsForWard({ decisionIds: [] }, records)
    expect(result.matched).toEqual([])
    expect(result.missingDecisionIds).toEqual([])
  })
})
