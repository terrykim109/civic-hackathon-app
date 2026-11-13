import { describe, expect, it } from 'vitest'
import {
  MUNICIPAL_GEOJSON_IMPORT_REPORT,
  MUNICIPAL_RECORDS,
  getRecordById,
  torontoKennedyDanforthEnrichment,
} from './index'

describe('MUNICIPAL_RECORDS', () => {
  it('exposes the full imported GeoJSON set plus curated merge', () => {
    expect(MUNICIPAL_GEOJSON_IMPORT_REPORT.importedCount).toBe(
      MUNICIPAL_GEOJSON_IMPORT_REPORT.sourceFeatureCount,
    )
    expect(MUNICIPAL_GEOJSON_IMPORT_REPORT.skipped).toEqual([])
    expect(MUNICIPAL_RECORDS.length).toBe(
      MUNICIPAL_GEOJSON_IMPORT_REPORT.importedCount,
    )
  })

  it('keeps Kennedy/Danforth enrichments on the GeoJSON notice id', () => {
    const record = getRecordById('toronto-notice-8007-rental-demolition')
    expect(record).toBeDefined()
    expect(record?.metrics.some((m) => m.value === '276')).toBe(true)
    expect(
      record?.relatedProcesses.some((p) => p.status === 'approved'),
    ).toBe(true)
    expect(
      record?.relatedProcesses.some((p) => p.id.includes('rental-demolition')),
    ).toBe(true)
    expect(torontoKennedyDanforthEnrichment.id).toBe(
      'toronto-notice-8007-rental-demolition',
    )
  })

  it('does not duplicate Kennedy/Danforth after merge', () => {
    const matches = MUNICIPAL_RECORDS.filter((r) =>
      r.id.includes('8007') || r.title.toLowerCase().includes('kennedy'),
    )
    expect(matches).toHaveLength(1)
  })

  it('keeps status concepts distinct on imported records', () => {
    for (const record of MUNICIPAL_RECORDS) {
      expect(record.projectStatus).toBeTruthy()
      expect(record.decisionStatus).toBeTruthy()
      expect(record.participationAvailability).toBeTruthy()
      // pending decision must not force open feedback — field is independent
      if (record.decisionStatus === 'pending') {
        expect(['open', 'not_open', 'closed', 'unknown']).toContain(
          record.participationAvailability,
        )
      }
    }
  })
})
