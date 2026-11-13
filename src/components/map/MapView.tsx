import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap } from 'maplibre-gl'
import {
  CASE_STUDY_LABEL,
  MAP_VIEWPORT,
  viewportAtCenter,
} from '../../data/mapLocation'
import { requestBrowserLngLat } from '../../data/userLocation'
import type { MunicipalRecord } from '../../types/municipalRecord'
import type { MapCameraApi, MapLoadState, MapViewport } from '../../types/map'
import { ensureBuildingExtrusions } from './buildingExtrusion'
import {
  configureMapNavigation,
  easeToHomeCamera,
  easeZoomBy,
  ZOOM_STEP,
} from './cameraNavigation'
import { DecisionMarkerLayer } from './DecisionMarkerLayer'
import { MAP_STYLE_URL } from './maplibreSetup'
import { resolvePlaceLabelFromMap } from './placeLabel'
import styles from './MapView.module.css'

interface MapViewProps {
  records: readonly MunicipalRecord[]
  selectedRecordId: string | null
  onRecordSelect: (record: MunicipalRecord | null) => void
  onPlaceLabelChange?: (label: string) => void
  onCameraReady?: (camera: MapCameraApi | null) => void
  onZoomChange?: (zoom: number) => void
}

export function MapView({
  records,
  selectedRecordId,
  onRecordSelect,
  onPlaceLabelChange,
  onCameraReady,
  onZoomChange,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const homeViewportRef = useRef<MapViewport>(MAP_VIEWPORT)
  const onPlaceLabelChangeRef = useRef(onPlaceLabelChange)
  const onCameraReadyRef = useRef(onCameraReady)
  const onZoomChangeRef = useRef(onZoomChange)
  const [loadState, setLoadState] = useState<MapLoadState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null)

  useEffect(() => {
    onPlaceLabelChangeRef.current = onPlaceLabelChange
  }, [onPlaceLabelChange])

  useEffect(() => {
    onCameraReadyRef.current = onCameraReady
  }, [onCameraReady])

  useEffect(() => {
    onZoomChangeRef.current = onZoomChange
  }, [onZoomChange])

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

    const cameraApi: MapCameraApi = {
      zoomIn: () => easeZoomBy(map, ZOOM_STEP),
      zoomOut: () => easeZoomBy(map, -ZOOM_STEP),
      resetView: () => easeToHomeCamera(map, homeViewportRef.current),
      getZoom: () => map.getZoom(),
    }

    const publishPlaceLabel = () => {
      if (cancelled) return
      const label = resolvePlaceLabelFromMap(map)
      onPlaceLabelChangeRef.current?.(label)
    }

    const schedulePlaceLabel = () => {
      if (labelTimer !== undefined) clearTimeout(labelTimer)
      labelTimer = setTimeout(publishPlaceLabel, 280)
    }

    const publishZoom = () => {
      if (cancelled) return
      onZoomChangeRef.current?.(map.getZoom())
    }

    const applyBuildings = () => {
      if (cancelled) return
      ensureBuildingExtrusions(map)
    }

    const applyUserHomeIfAvailable = async () => {
      const lngLat = await requestBrowserLngLat()
      if (cancelled) return

      if (lngLat) {
        homeViewportRef.current = viewportAtCenter(lngLat)
        easeToHomeCamera(map, homeViewportRef.current)
        return
      }

      homeViewportRef.current = MAP_VIEWPORT
      onPlaceLabelChangeRef.current?.(CASE_STUDY_LABEL)
      publishPlaceLabel()
    }

    const onLoad = () => {
      if (cancelled) return
      applyBuildings()
      publishPlaceLabel()
      publishZoom()
      onCameraReadyRef.current?.(cameraApi)
      setMapInstance(map)
      setLoadState('ready')
      setErrorMessage(null)
      void applyUserHomeIfAvailable()
    }

    const onError = () => {
      if (cancelled) return
      setLoadState('error')
      setErrorMessage('The map failed to load.')
    }

    map.on('load', onLoad)
    map.on('style.load', applyBuildings)
    map.on('moveend', schedulePlaceLabel)
    map.on('zoom', publishZoom)
    map.on('zoomend', publishZoom)
    map.on('error', onError)

    mapRef.current = map

    return () => {
      cancelled = true
      if (labelTimer !== undefined) clearTimeout(labelTimer)
      setMapInstance(null)
      onCameraReadyRef.current?.(null)
      map.off('load', onLoad)
      map.off('style.load', applyBuildings)
      map.off('moveend', schedulePlaceLabel)
      map.off('zoom', publishZoom)
      map.off('zoomend', publishZoom)
      map.off('error', onError)
      map.remove()
      mapRef.current = null
    }
  }, [])

  return (
    <div className={styles.root} aria-label="Interactive neighbourhood map">
      <div ref={containerRef} className={styles.map} />
      <DecisionMarkerLayer
        map={mapInstance}
        records={records}
        selectedRecordId={selectedRecordId}
        onRecordSelect={onRecordSelect}
      />

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
