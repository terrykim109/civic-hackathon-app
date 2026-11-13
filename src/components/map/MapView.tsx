import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, NavigationControl } from 'maplibre-gl'
import { MAP_VIEWPORT } from '../../data/mapLocation'
import type { MapLoadState } from '../../types/map'
import { ensureBuildingExtrusions } from './buildingExtrusion'
import { configureMapNavigation } from './cameraNavigation'
import { MAP_STYLE_URL } from './maplibreSetup'
import { resolvePlaceLabelFromMap } from './placeLabel'
import styles from './MapView.module.css'

interface MapViewProps {
  onPlaceLabelChange?: (label: string) => void
}

export function MapView({ onPlaceLabelChange }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const onPlaceLabelChangeRef = useRef(onPlaceLabelChange)
  const [loadState, setLoadState] = useState<MapLoadState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    onPlaceLabelChangeRef.current = onPlaceLabelChange
  }, [onPlaceLabelChange])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let cancelled = false
    let labelTimer: ReturnType<typeof setTimeout> | undefined

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: MAP_VIEWPORT.center,
      zoom: MAP_VIEWPORT.zoom,
      pitch: MAP_VIEWPORT.pitch,
      bearing: MAP_VIEWPORT.bearing,
      minZoom: MAP_VIEWPORT.minZoom,
      maxZoom: MAP_VIEWPORT.maxZoom,
      minPitch: MAP_VIEWPORT.minPitch,
      maxPitch: MAP_VIEWPORT.maxPitch,
      attributionControl: {
        compact: true,
        customAttribution:
          'OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors',
      },
      canvasContextAttributes: { antialias: true },
    })

    configureMapNavigation(map)

    map.addControl(
      new NavigationControl({ visualizePitch: true, showCompass: true }),
      'bottom-right',
    )

    const publishPlaceLabel = () => {
      if (cancelled) return
      const label = resolvePlaceLabelFromMap(map)
      onPlaceLabelChangeRef.current?.(label)
    }

    const schedulePlaceLabel = () => {
      if (labelTimer !== undefined) clearTimeout(labelTimer)
      labelTimer = setTimeout(publishPlaceLabel, 280)
    }

    const applyBuildings = () => {
      if (cancelled) return
      ensureBuildingExtrusions(map)
    }

    const onLoad = () => {
      if (cancelled) return
      applyBuildings()
      publishPlaceLabel()
      setLoadState('ready')
      setErrorMessage(null)
    }

    const onError = () => {
      if (cancelled) return
      setLoadState('error')
      setErrorMessage('The map failed to load.')
    }

    map.on('load', onLoad)
    map.on('style.load', applyBuildings)
    map.on('moveend', schedulePlaceLabel)
    map.on('error', onError)

    mapRef.current = map

    return () => {
      cancelled = true
      if (labelTimer !== undefined) clearTimeout(labelTimer)
      map.off('load', onLoad)
      map.off('style.load', applyBuildings)
      map.off('moveend', schedulePlaceLabel)
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
