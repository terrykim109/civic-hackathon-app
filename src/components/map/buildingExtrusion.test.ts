import { describe, expect, it } from 'vitest'
import {
  BUILDING_3D_LAYER_ID,
  BUILDING_EXTRUSION_COLOR,
  BUILDING_EXTRUSION_OPACITY,
  BUILDING_SOURCE_ID,
  BUILDING_SOURCE_LAYER,
} from './buildingExtrusion'

describe('buildingExtrusion constants', () => {
  it('targets the OpenFreeMap Liberty building-3d layer contract', () => {
    expect(BUILDING_3D_LAYER_ID).toBe('building-3d')
    expect(BUILDING_SOURCE_ID).toBe('openmaptiles')
    expect(BUILDING_SOURCE_LAYER).toBe('building')
  })

  it('uses a muted limestone colour and near-opaque extrusion', () => {
    expect(BUILDING_EXTRUSION_COLOR).toMatch(/^hsl\(/)
    expect(BUILDING_EXTRUSION_OPACITY).toBeGreaterThan(0.8)
    expect(BUILDING_EXTRUSION_OPACITY).toBeLessThanOrEqual(1)
  })
})
