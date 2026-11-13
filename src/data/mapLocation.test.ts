import { describe, expect, it } from 'vitest'
import {
  MAP_STYLE_URL,
  MAP_VIEWPORT,
  NEIGHBOURHOOD_LABEL,
  assertMapViewportValid,
} from './mapLocation'

describe('mapLocation', () => {
  it('keeps the camera over the Kennedy / Danforth neighbourhood', () => {
    const [lng, lat] = MAP_VIEWPORT.center

    // Rough Scarborough bounds around Clairlea-Birchmount
    expect(lng).toBeGreaterThan(-79.28)
    expect(lng).toBeLessThan(-79.24)
    expect(lat).toBeGreaterThan(43.7)
    expect(lat).toBeLessThan(43.73)
  })

  it('uses an elevated pitch in the 50–55° band', () => {
    expect(MAP_VIEWPORT.pitch).toBeGreaterThanOrEqual(50)
    expect(MAP_VIEWPORT.pitch).toBeLessThanOrEqual(55)
    expect(() => assertMapViewportValid(MAP_VIEWPORT)).not.toThrow()
  })


  it('points at the OpenFreeMap Liberty style', () => {
    expect(MAP_STYLE_URL).toBe('https://tiles.openfreemap.org/styles/liberty')
  })

  it('exposes a neighbourhood label for the floating nav', () => {
    expect(NEIGHBOURHOOD_LABEL.length).toBeGreaterThan(0)
    expect(NEIGHBOURHOOD_LABEL).toMatch(/Kennedy/i)
    expect(NEIGHBOURHOOD_LABEL).toMatch(/Danforth/i)
  })
})
