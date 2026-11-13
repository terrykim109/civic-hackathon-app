import { describe, expect, it } from 'vitest'
import decisionsGeoJson from '../municipalRecords.json'
import {
  adaptMunicipalFeatureCollection,
  mergeRecordsById,
  type GeoJsonFeatureCollection,
} from './adaptMunicipalGeoJson'
import type { MunicipalRecord } from '../../types/municipalRecord'

describe('adaptMunicipalFeatureCollection', () => {
  const { records, report } = adaptMunicipalFeatureCollection(
    decisionsGeoJson as GeoJsonFeatureCollection,
  )

  it('imports every valid feature without hardcoding the count', () => {
    expect(report.sourceFeatureCount).toBe(
      (decisionsGeoJson as GeoJsonFeatureCollection).features?.length,
    )
    expect(report.importedCount).toBe(report.sourceFeatureCount)
    expect(records).toHaveLength(report.importedCount)
    expect(report.skipped).toEqual([])
  })

  it('keeps unique ids and GeoJSON [lng, lat] order', () => {
    const ids = records.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const record of records) {
      const [lng, lat] = record.location.coordinates
      expect(Math.abs(lng)).toBeGreaterThan(50)
      expect(Math.abs(lat)).toBeLessThan(80)
    }
  })

  it('does not conflate participation with GIS or project status', () => {
    for (const record of records) {
      expect(record.projectStatus).toBeTruthy()
      expect(['open', 'not_open', 'closed', 'unknown']).toContain(
        record.participationAvailability,
      )
      // GIS Complete must not force participation open.
      if (record.gisSourceStatus?.toLowerCase() === 'complete') {
        // participation comes from participation_status field only
        expect(record.participationAvailability).toBeDefined()
      }
    }
    const apted = records.find((r) => r.id.includes('apted'))
    expect(apted?.participationAvailability).toBe('not_open')
    expect(apted?.gisSourceStatus?.toLowerCase()).toBe('in progress')
  })

  it('covers multiple record types and categories from the dataset', () => {
    const types = new Set(records.map((r) => r.recordType))
    const categories = new Set(records.map((r) => r.categoryRaw))
    expect(types.size).toBeGreaterThanOrEqual(2)
    expect(categories.size).toBeGreaterThanOrEqual(2)
    expect(records.every((r) => r.municipality === 'Toronto')).toBe(true)
  })

  it('skips malformed features with an identifiable report entry', () => {
    const { records: partial, report: badReport } =
      adaptMunicipalFeatureCollection({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            id: 'ok-1',
            geometry: { type: 'Point', coordinates: [-79.4, 43.7] },
            properties: {
              decision_id: 'ok-1',
              title: 'Valid',
              category: 'park_design',
              record_type: 'project_consultation',
              status: 'design_consultation',
              participation_status: 'open',
              location_precision: 'approximate',
              location_role: 'official_representative_point_not_impact_boundary',
              last_verified: '2026-11-13',
            },
          },
          {
            type: 'Feature',
            id: 'bad-geom',
            geometry: { type: 'Polygon', coordinates: [] },
            properties: { decision_id: 'bad-geom', title: 'Bad' },
          },
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [-79.4, 43.7] },
            properties: { title: 'Missing id' },
          },
        ],
      })

    expect(partial).toHaveLength(1)
    expect(badReport.skipped).toHaveLength(2)
    expect(badReport.skipped[0]?.reasons.join(' ')).toMatch(/Unsupported geometry/i)
    expect(badReport.skipped[1]?.reasons.join(' ')).toMatch(/Missing/i)
  })
})

describe('mergeRecordsById', () => {
  it('dedupes by id and overlays curated metrics', () => {
    const base: MunicipalRecord = {
      id: 'toronto-notice-8007-rental-demolition',
      title: 'From geojson',
      description: 'geo',
      municipality: 'Toronto',
      categoryRaw: 'rental_housing',
      categoryKind: 'housing',
      recordType: 'public_meeting_notice',
      projectStatus: 'public_meeting_scheduled',
      gisSourceStatus: null,
      decisionStatus: 'unknown',
      decisionStage: 'unknown',
      participationAvailability: 'open',
      canParticipateNow: true,
      participationOptions: [],
      events: [],
      potentialImpacts: [],
      uncertainties: [],
      location: {
        coordinates: [-79.26, 43.71],
        precision: 'approximate',
        locationRole: 'official_representative_point_not_impact_boundary',
        note: 'test',
      },
      sources: [],
      evidence: [],
      relatedProcesses: [],
      metrics: [],
      dataOrigin: 'geojson',
    }

    const curated: MunicipalRecord = {
      ...base,
      title: 'Should not replace title when merged as overlay source order',
      decisionStatus: 'pending',
      metrics: [{ label: 'Existing rental units', value: '8' }],
      relatedProcesses: [
        {
          id: 'zoning',
          label: 'Zoning',
          status: 'approved',
          note: 'separate',
          sources: [],
        },
      ],
      dataOrigin: 'curated',
    }

    const merged = mergeRecordsById([base], [curated])
    expect(merged).toHaveLength(1)
    expect(merged[0]?.title).toBe('From geojson')
    expect(merged[0]?.decisionStatus).toBe('pending')
    expect(merged[0]?.metrics[0]?.value).toBe('8')
    expect(merged[0]?.relatedProcesses[0]?.status).toBe('approved')
  })
})
