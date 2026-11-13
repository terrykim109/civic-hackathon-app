import { describe, expect, it } from 'vitest'
import {
  CASE_STUDY_CENTER,
  CASE_STUDY_LABEL,
  MAP_STYLE_URL,
  MAP_VIEWPORT,
  NEIGHBOURHOOD_LABEL,
  assertMapViewportValid,
  viewportAtCenter,
} from './mapLocation'

describe('mapLocation', () => {
  it('keeps the case-study fallback over Kennedy / Danforth', () => {
    const [lng, lat] = CASE_STUDY_CENTER

    expect(lng).toBeGreaterThan(-79.28)
    expect(lng).toBeLessThan(-79.24)
    expect(lat).toBeGreaterThan(43.7)
    expect(lat).toBeLessThan(43.73)
    expect(MAP_VIEWPORT.center).toEqual(CASE_STUDY_CENTER)
  })

  it('uses an elevated pitch in the 50–55° band', () => {
    expect(MAP_VIEWPORT.pitch).toBeGreaterThanOrEqual(50)
    expect(MAP_VIEWPORT.pitch).toBeLessThanOrEqual(55)
    expect(() => assertMapViewportValid(MAP_VIEWPORT)).not.toThrow()
  })

  it('builds a home viewport at an arbitrary user centre', () => {
    const home = viewportAtCenter([-79.38, 43.65])
    expect(home.center).toEqual([-79.38, 43.65])
    expect(home.pitch).toBe(MAP_VIEWPORT.pitch)
    expect(home.zoom).toBe(MAP_VIEWPORT.zoom)
  })

  it('points at the OpenFreeMap Liberty style', () => {
    expect(MAP_STYLE_URL).toBe('https://tiles.openfreemap.org/styles/liberty')
  })

  it('exposes loading and case-study labels', () => {
    expect(NEIGHBOURHOOD_LABEL.length).toBeGreaterThan(0)
    expect(CASE_STUDY_LABEL).toMatch(/Kennedy/i)
    expect(CASE_STUDY_LABEL).toMatch(/Danforth/i)
  })
})
