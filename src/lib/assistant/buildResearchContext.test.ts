import { describe, expect, it } from 'vitest'
import type { MunicipalRecord } from '../../types/municipalRecord'
import { ASSISTANT_MAX_RECORDS, PROXIMITY_DISCLAIMER } from './types'
import {
  buildResearchContext,
  collectEvidenceRefs,
  summarizeMunicipalRecord,
} from './buildResearchContext'

function record(
  id: string,
  options: {
    lng?: number
    lat?: number
    title?: string
    description?: string
    sources?: MunicipalRecord['sources']
    officialSourceUrl?: string
  } = {},
): MunicipalRecord {
  const lng = options.lng ?? -79.38
  const lat = options.lat ?? 43.65
  return {
    id,
    title: options.title ?? id,
    description: options.description ?? 'Test description',
    municipality: 'Toronto',
    categoryRaw: 'housing',
    categoryKind: 'housing',
    recordType: 'notice',
    projectStatus: 'pending',
    gisSourceStatus: null,
    decisionStatus: 'pending',
    decisionStage: 'proposal',
    participationAvailability: 'unknown',
    canParticipateNow: null,
    participationOptions: [],
    events: [],
    potentialImpacts: [],
    uncertainties: [],
    location: {
      coordinates: [lng, lat],
      precision: 'approximate',
      locationRole: 'official_representative_point_not_impact_boundary',
      note: 'Representative point',
    },
    sources: options.sources ?? [],
    evidence: [],
    relatedProcesses: [],
    metrics: [],
    dataOrigin: 'curated',
    officialSourceUrl: options.officialSourceUrl,
  }
}

describe('summarizeMunicipalRecord', () => {
  it('keeps documented fields and truncates long summaries', () => {
    const long = 'x'.repeat(400)
    const summary = summarizeMunicipalRecord(
      record('r1', {
        description: long,
        sources: [
          {
            label: 'City page',
            href: 'https://example.com/a',
            verifiedOn: '2026-01-01',
          },
        ],
        officialSourceUrl: 'https://example.com/b',
      }),
      120,
    )

    expect(summary.id).toBe('r1')
    expect(summary.distanceMeters).toBe(120)
    expect(summary.summary?.endsWith('…')).toBe(true)
    expect(summary.summary!.length).toBeLessThanOrEqual(280)
    expect(summary.sources.map((s) => s.href)).toEqual([
      'https://example.com/a',
      'https://example.com/b',
    ])
    expect(summary.evidenceRefs.map((r) => r.href)).toEqual([
      'https://example.com/a',
      'https://example.com/b',
    ])
  })

  it('collects evidence and related-process URLs and skips local assets', () => {
    const base = record('r2', {
      sources: [
        {
          label: 'Local snapshot',
          href: '/assets/notice.html',
          verifiedOn: '2026-01-01',
        },
        {
          label: 'City notice',
          href: 'https://secure.toronto.ca/nm/api/individual/notice/8007.do',
          verifiedOn: '2026-01-01',
        },
      ],
    })
    const enriched: MunicipalRecord = {
      ...base,
      evidence: [
        {
          evidenceId: 'ev-1',
          sourceUrl:
            'https://www.toronto.ca/legdocs/mmis/2021/sc/bgrd/backgroundfile-165240.pdf',
          locator: 'Planning report',
        },
      ],
      relatedProcesses: [
        {
          id: 'rel-1',
          label: 'Related zoning',
          status: 'approved',
          note: 'Separate process',
          sources: [
            {
              label: 'Notice',
              href: 'https://secure.toronto.ca/nm/api/individual/notice/8007.do',
              verifiedOn: '2026-01-01',
            },
          ],
        },
      ],
    }

    const refs = collectEvidenceRefs(enriched)
    expect(refs.map((r) => r.href)).toEqual([
      'https://secure.toronto.ca/nm/api/individual/notice/8007.do',
      'https://www.toronto.ca/legdocs/mmis/2021/sc/bgrd/backgroundfile-165240.pdf',
    ])
    expect(refs.some((r) => r.kind === 'evidence')).toBe(true)
  })
})

describe('buildResearchContext', () => {
  const origin: [number, number] = [-79.38, 43.65]

  it('includes ward-linked records without inventing distance', () => {
    const linked = record('ward-rec', { title: 'Ward Linked' })
    const other = record('other', { lng: -79.381, lat: 43.651, title: 'Other' })

    const context = buildResearchContext({
      label: 'York Centre',
      ward: {
        wardId: '7',
        name: 'York Centre',
        decisionIds: ['ward-rec'],
      },
      records: [linked, other],
    })

    expect(context.label).toBe('York Centre')
    expect(context.wardId).toBe('7')
    expect(context.wardName).toBe('York Centre')
    expect(context.coordinates).toBeNull()
    expect(context.proximityNote).toBe(PROXIMITY_DISCLAIMER)
    expect(context.records.map((r) => r.id)).toEqual(['ward-rec'])
    expect(context.records[0]!.distanceMeters).toBeNull()
  })

  it('reuses nearby Haversine results and attaches distances', () => {
    const near = record('near', {
      lng: -79.381,
      lat: 43.651,
      title: 'Near',
    })
    const far = record('far', { lng: -79.5, lat: 43.8, title: 'Far' })

    const context = buildResearchContext({
      label: 'Kennedy Station',
      coordinates: origin,
      records: [far, near],
      nearbyRadiusMeters: 3000,
    })

    expect(context.coordinates).toEqual(origin)
    expect(context.records.map((r) => r.id)).toEqual(['near'])
    expect(context.records[0]!.distanceMeters).toBeGreaterThan(0)
  })

  it('merges ward + nearby without claiming impact, preferring distance sort', () => {
    const wardOnly = record('ward-only', {
      lng: -79.5,
      lat: 43.8,
      title: 'Ward Only Far',
    })
    const near = record('near', {
      lng: -79.381,
      lat: 43.651,
      title: 'Nearby',
    })

    const context = buildResearchContext({
      label: 'Area',
      coordinates: origin,
      ward: {
        wardId: '12',
        name: 'Toronto-St. Paul\'s',
        decisionIds: ['ward-only'],
      },
      records: [wardOnly, near],
      nearbyRadiusMeters: 3000,
    })

    expect(context.records.map((r) => r.id)).toEqual(['near', 'ward-only'])
    expect(context.records[0]!.distanceMeters).not.toBeNull()
    expect(context.records[1]!.distanceMeters).toBeNull()
    expect(context.proximityNote).toMatch(/not proof/i)
  })

  it('caps record count for request size control', () => {
    const many = Array.from({ length: ASSISTANT_MAX_RECORDS + 5 }, (_, i) =>
      record(`r-${i}`, {
        lng: -79.38 + i * 0.0001,
        lat: 43.65,
        title: `R${i}`,
      }),
    )

    const context = buildResearchContext({
      label: 'Dense',
      coordinates: origin,
      records: many,
      nearbyRadiusMeters: 5000,
    })

    expect(context.records.length).toBeLessThanOrEqual(ASSISTANT_MAX_RECORDS)
  })
})
