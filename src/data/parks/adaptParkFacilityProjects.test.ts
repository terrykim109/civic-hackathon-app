import { describe, expect, it } from 'vitest'
import type { MunicipalRecord } from '../../types/municipalRecord'
import {
  adaptParkFacilityProjects,
  collectIntegratedParkGlobalIds,
  contextualParkProjectCollection,
  getParkProjectsForWard,
  isParkFacilityProject,
  normalizeWardNumber,
  parkProjectsToFeatureCollection,
} from './adaptParkFacilityProjects'

const WYCHWOOD_GID = '9e834435-e0b8-4559-a3eb-44e2b1924170'
const NEW_GID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

function sampleCollection() {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          _id: 1,
          project_name: 'Wychwood Barns Park Playground Improvements',
          address: '76 Wychwood Ave',
          status: 'Complete',
          description: 'Existing municipal record overlap.',
          project_url: 'https://www.toronto.ca/example-wychwood/',
          project_type: 'Park or Facility Improvements',
          ward_name: 'Toronto-St. Paul\'s',
          ward_number: '12',
          globalid: WYCHWOOD_GID,
        },
        geometry: {
          type: 'MultiPoint',
          coordinates: [[-79.42, 43.68]],
        },
      },
      {
        type: 'Feature',
        properties: {
          _id: 2,
          project_name: 'Grand Avenue Park Expansion',
          address: '1 Grand Ave',
          status: 'In progress',
          description: 'The City is expanding Grand Avenue Park.',
          project_url: 'https://www.toronto.ca/example-grand/',
          project_type: 'Park or Facility Improvements',
          ward_name: 'Etobicoke-Lakeshore',
          ward_number: '03',
          globalid: NEW_GID,
        },
        geometry: {
          type: 'MultiPoint',
          coordinates: [[-79.49, 43.62]],
        },
      },
    ],
  }
}

const existingMunicipal: MunicipalRecord[] = [
  {
    id: 'toronto-wychwood-streetcar-2026',
    title: 'Wychwood',
    description: 'Curated',
    municipality: 'Toronto',
    categoryRaw: 'park_design',
    categoryKind: 'parks',
    recordType: 'project_consultation',
    projectStatus: 'design_consultation',
    gisSourceStatus: 'Complete',
    decisionStatus: 'unknown',
    decisionStage: 'unknown',
    participationAvailability: 'unknown',
    canParticipateNow: null,
    participationOptions: [],
    events: [],
    potentialImpacts: [],
    uncertainties: [],
    location: {
      coordinates: [-79.42, 43.68],
      precision: 'indicative_point',
      locationRole: 'official_representative_point_not_impact_boundary',
      note: 'test',
    },
    sources: [],
    evidence: [
      {
        evidenceId: 'e1',
        sourceUrl: 'https://example.com',
        locator: `globalid ${WYCHWOOD_GID}`,
      },
    ],
    geometrySourceRecord: WYCHWOOD_GID,
    relatedProcesses: [],
    metrics: [],
    dataOrigin: 'geojson',
  },
]

describe('normalizeWardNumber', () => {
  it('strips leading zeros', () => {
    expect(normalizeWardNumber('03')).toBe('3')
    expect(normalizeWardNumber('12')).toBe('12')
  })

  it('rejects empty / none', () => {
    expect(normalizeWardNumber('None')).toBeNull()
    expect(normalizeWardNumber('')).toBeNull()
  })
})

describe('adaptParkFacilityProjects', () => {
  it('skips globalids already present on municipal records', () => {
    const exclude = collectIntegratedParkGlobalIds(existingMunicipal)
    const { records, report } = adaptParkFacilityProjects(sampleCollection(), {
      excludeGlobalIds: exclude,
    })

    expect(report.sourceFeatureCount).toBe(2)
    expect(report.importedCount).toBe(1)
    expect(records).toHaveLength(1)
    expect(records[0]?.id).toBe(`park-project-${NEW_GID}`)
    expect(records[0]?.wardId).toBe('3')
    expect(records[0]?.dataOrigin).toBe('open_data')
    expect(records[0]?.recordType).toBe('park_facility_project')
    expect(records[0]?.participationAvailability).toBe('unknown')
    expect(report.skipped.some((row) => row.id === WYCHWOOD_GID)).toBe(true)
  })

  it('converts MultiPoint to Point features for the map layer', () => {
    const { records } = adaptParkFacilityProjects(sampleCollection(), {
      excludeGlobalIds: collectIntegratedParkGlobalIds(existingMunicipal),
    })
    const fc = parkProjectsToFeatureCollection(records)
    expect(fc.features?.[0]?.geometry?.type).toBe('Point')
    expect(fc.features?.[0]?.geometry?.coordinates).toEqual([-79.49, 43.62])
  })
})

describe('getParkProjectsForWard', () => {
  it('matches only by normalized ward_number', () => {
    const { records } = adaptParkFacilityProjects(sampleCollection(), {
      excludeGlobalIds: new Set(),
    })
    expect(getParkProjectsForWard('3', records)).toHaveLength(1)
    expect(getParkProjectsForWard('12', records)).toHaveLength(1)
    expect(getParkProjectsForWard('7', records)).toHaveLength(0)
  })
})

describe('contextualParkProjectCollection', () => {
  it('keeps the full catalogue off the map until a park project is selected', () => {
    const { records } = adaptParkFacilityProjects(sampleCollection(), {
      excludeGlobalIds: new Set(),
    })
    expect(records.length).toBeGreaterThan(1)
    expect(contextualParkProjectCollection(records, null).features).toEqual([])
    expect(
      contextualParkProjectCollection(records, 'municipal-not-a-park').features,
    ).toEqual([])

    const selectedId = records[0]!.id
    expect(isParkFacilityProject(records[0]!)).toBe(true)
    const contextual = contextualParkProjectCollection(records, selectedId)
    expect(contextual.features).toHaveLength(1)
    expect(contextual.features?.[0]?.properties?.id).toBe(selectedId)
  })
})
