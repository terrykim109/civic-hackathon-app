import { describe, expect, it } from 'vitest'
import { CAMERA_EASE_MS, MAP_VIEWPORT } from '../../data/mapLocation'
import {
  SEARCH_FLY_MS,
  ZOOM_EASE_MS,
  ZOOM_STEP,
  clampZoom,
} from './cameraNavigation'

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

  it('keeps ease durations in a smooth interactive range', () => {
    expect(CAMERA_EASE_MS).toBeGreaterThanOrEqual(600)
    expect(CAMERA_EASE_MS).toBeLessThanOrEqual(2000)
    expect(ZOOM_EASE_MS).toBeGreaterThanOrEqual(200)
    expect(ZOOM_EASE_MS).toBeLessThan(CAMERA_EASE_MS)
    expect(SEARCH_FLY_MS).toBeGreaterThanOrEqual(CAMERA_EASE_MS)
    expect(SEARCH_FLY_MS).toBeLessThanOrEqual(2500)
  })

  it('clamps zoom steps inside min/max', () => {
    expect(clampZoom(11, 12, 18)).toBe(12)
    expect(clampZoom(19, 12, 18)).toBe(18)
    expect(clampZoom(16.2 + ZOOM_STEP, 12, 18)).toBe(17.2)
  })
})
