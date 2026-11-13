import { describe, expect, it } from 'vitest'
import { CAMERA_EASE_MS, MAP_VIEWPORT } from '../../data/mapLocation'

describe('camera navigation config', () => {
  it('keeps the home pitch in the elevated 50–55° band', () => {
    expect(MAP_VIEWPORT.pitch).toBeGreaterThanOrEqual(50)
    expect(MAP_VIEWPORT.pitch).toBeLessThanOrEqual(55)
  })

  it('uses a slight non-zero bearing for composition', () => {
    expect(MAP_VIEWPORT.bearing).not.toBe(0)
    expect(Math.abs(MAP_VIEWPORT.bearing)).toBeLessThanOrEqual(45)
  })

  it('defines sensible zoom and pitch limits', () => {
    expect(MAP_VIEWPORT.minZoom).toBeLessThan(MAP_VIEWPORT.zoom)
    expect(MAP_VIEWPORT.maxZoom).toBeGreaterThan(MAP_VIEWPORT.zoom)
    expect(MAP_VIEWPORT.minPitch).toBe(0)
    expect(MAP_VIEWPORT.maxPitch).toBeGreaterThanOrEqual(MAP_VIEWPORT.pitch)
    expect(MAP_VIEWPORT.maxPitch).toBeLessThanOrEqual(85)
  })

  it('keeps ease duration in a smooth interactive range', () => {
    expect(CAMERA_EASE_MS).toBeGreaterThanOrEqual(600)
    expect(CAMERA_EASE_MS).toBeLessThanOrEqual(2000)
  })
})
