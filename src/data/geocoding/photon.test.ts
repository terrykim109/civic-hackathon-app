import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  adaptPhotonFeatures,
  clearGeocodeCache,
  precisionDisclaimer,
  searchLocations,
} from './photon'

afterEach(() => {
  clearGeocodeCache()
  vi.unstubAllGlobals()
})

describe('adaptPhotonFeatures', () => {
  it('keeps Canadian features and drops other countries', () => {
    const results = adaptPhotonFeatures([
      {
        geometry: { type: 'Point', coordinates: [-79.260812, 43.7152652] },
        properties: {
          osm_type: 'N',
          osm_id: 1,
          type: 'house',
          housenumber: '411',
          street: 'Kennedy Road',
          city: 'Toronto',
          state: 'Ontario',
          countrycode: 'CA',
        },
      },
      {
        geometry: { type: 'Point', coordinates: [-74.0, 40.7] },
        properties: {
          osm_type: 'N',
          osm_id: 2,
          name: 'Somewhere USA',
          countrycode: 'US',
        },
      },
      {
        geometry: { type: 'Point', coordinates: [-79.3, 43.7] },
        properties: {
          osm_type: 'N',
          osm_id: 3,
          type: 'other',
          osm_value: 'postcode',
          name: 'M1K 2P5',
          city: 'Toronto',
          state: 'Ontario',
          countrycode: 'CA',
        },
      },
    ])

    expect(results).toHaveLength(2)
    expect(results[0]?.label).toBe('411 Kennedy Road')
    expect(results[0]?.kind).toBe('address')
    expect(results[1]?.kind).toBe('postal_code')
  })
})

describe('searchLocations', () => {
  it('does not fetch for invalid queries', async () => {
    const fetchImpl = vi.fn()
    const outcome = await searchLocations('??', { fetchImpl })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(outcome.status).toBe('empty')
  })

  it('adapts Photon payloads and caches by query', async () => {
    const payload = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-79.3832, 43.6532] },
          properties: {
            osm_type: 'W',
            osm_id: 99,
            name: 'Toronto City Hall',
            city: 'Toronto',
            state: 'Ontario',
            countrycode: 'CA',
            osm_key: 'amenity',
            osm_value: 'townhall',
          },
        },
      ],
    }
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    })

    const first = await searchLocations('Toronto City Hall', { fetchImpl })
    const second = await searchLocations('Toronto City Hall', { fetchImpl })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(first.status).toBe('results')
    expect(first.results[0]?.label).toBe('Toronto City Hall')
    expect(second).toEqual(first)

    const url = String(fetchImpl.mock.calls[0]?.[0])
    expect(url).toContain('lat=43.7')
    expect(url).toContain('lon=-79.4')
  })

  it('returns a service-error outcome on non-OK responses', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503 })
    const outcome = await searchLocations('Danforth', { fetchImpl })
    expect(outcome.status).toBe('error')
    expect(outcome.results).toHaveLength(0)
  })
})

describe('precisionDisclaimer', () => {
  it('states that points are not impact boundaries', () => {
    expect(precisionDisclaimer('point')).toMatch(/not a surveyed property/i)
    expect(precisionDisclaimer('area')).toMatch(/not a legal boundary/i)
  })
})
