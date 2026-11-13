import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, NavigationControl } from 'maplibre-gl'
import { MAP_VIEWPORT } from '../../data/mapLocation'
import type { MapLoadState } from '../../types/map'
import { MAP_STYLE_URL } from './maplibreSetup'
import styles from './MapView.module.css'

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const [loadState, setLoadState] = useState<MapLoadState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let cancelled = false

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: MAP_VIEWPORT.center,
      zoom: MAP_VIEWPORT.zoom,
      pitch: MAP_VIEWPORT.pitch,
      bearing: MAP_VIEWPORT.bearing,
      minZoom: MAP_VIEWPORT.minZoom,
      maxZoom: MAP_VIEWPORT.maxZoom,
      attributionControl: {
        compact: true,
        customAttribution:
          'OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors',
      },
    })

    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right')

    const onLoad = () => {
      if (cancelled) return
      setLoadState('ready')
      setErrorMessage(null)
    }

    const onError = () => {
      if (cancelled) return
      setLoadState('error')
      setErrorMessage('The map failed to load.')
    }

    map.on('load', onLoad)
    map.on('error', onError)

    mapRef.current = map

    return () => {
      cancelled = true
      map.off('load', onLoad)
      map.off('error', onError)
      map.remove()
      mapRef.current = null
    }
  }, [])

  return (
    <div className={styles.root} aria-label="Interactive neighbourhood map">
      <div ref={containerRef} className={styles.map} />

      {loadState === 'loading' && (
        <div className={styles.status} role="status">
          Loading neighbourhood map…
        </div>
      )}

      {loadState === 'error' && (
        <div className={`${styles.status} ${styles.statusError}`} role="alert">
          Map unavailable. Check your network connection and try refreshing.
          {errorMessage ? ` (${errorMessage})` : null}
        </div>
      )}
    </div>
  )
}
