import type { LngLat } from '../types/map'

/**
 * Request the browser’s current position once.
 * Returns null when geolocation is unavailable, denied, or times out.
 * Does not reverse-geocode — only raw coordinates from the device.
 */
export function requestBrowserLngLat(): Promise<LngLat | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords
        if (
          !Number.isFinite(longitude) ||
          !Number.isFinite(latitude) ||
          longitude < -180 ||
          longitude > 180 ||
          latitude < -90 ||
          latitude > 90
        ) {
          resolve(null)
          return
        }
        resolve([longitude, latitude])
      },
      () => resolve(null),
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 60_000,
      },
    )
  })
}
