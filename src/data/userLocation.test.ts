import { describe, expect, it, vi, afterEach } from 'vitest'
import { requestBrowserLngLat } from './userLocation'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('requestBrowserLngLat', () => {
  it('returns coordinates from the geolocation API', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (
          success: (pos: GeolocationPosition) => void,
        ) => {
          success({
            coords: {
              longitude: -79.38,
              latitude: 43.65,
              accuracy: 20,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
              toJSON: () => ({}),
            },
            timestamp: Date.now(),
            toJSON: () => ({}),
          })
        },
      },
    })

    await expect(requestBrowserLngLat()).resolves.toEqual([-79.38, 43.65])
  })

  it('returns null when geolocation is unavailable', async () => {
    vi.stubGlobal('navigator', {})
    await expect(requestBrowserLngLat()).resolves.toBeNull()
  })

  it('returns null when the user denies permission', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (
          _success: unknown,
          error: (err: GeolocationPositionError) => void,
        ) => {
          error({
            code: 1,
            message: 'denied',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          })
        },
      },
    })

    await expect(requestBrowserLngLat()).resolves.toBeNull()
  })
})
