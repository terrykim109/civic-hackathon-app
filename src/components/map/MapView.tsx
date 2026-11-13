import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, type MapMouseEvent } from 'maplibre-gl'
import {
  CASE_STUDY_LABEL,
  MAP_VIEWPORT,
  viewportAtCenter,
} from '../../data/mapLocation'
import { requestBrowserLngLat } from '../../data/userLocation'
import type { MunicipalRecord } from '../../types/municipalRecord'
import type { MapCameraApi, MapLoadState, MapViewport } from '../../types/map'
import type { WardSelection } from '../../types/ward'
import { ensureBuildingExtrusions } from './buildingExtrusion'
import {
  configureMapNavigation,
  easeToHomeCamera,
  easeZoomBy,
  ZOOM_STEP,
} from './cameraNavigation'
import { DecisionMarkerLayer } from './DecisionMarkerLayer'
import { MAP_STYLE_URL } from './maplibreSetup'
import {
  PARK_PROJECT_HIT_LAYER_IDS,
  ParkProjectLayer,
} from './ParkProjectLayer'
import { resolvePlaceLabelFromMap } from './placeLabel'
import { WardHoverLabel } from './WardHoverLabel'
import { WardLayer } from './WardLayer'
import { WARDS_FILL_LAYER_ID } from './wardLayers'
import styles from './MapView.module.css'

interface MapViewProps {
  records: readonly MunicipalRecord[]
  selectedRecordId: string | null
  onRecordSelect: (record: MunicipalRecord | null) => void
  onParkProjectsLoaded?: (projects: MunicipalRecord[]) => void
  selectedWardId: string | null
  onWardSelect: (ward: WardSelection | null) => void
  onPlaceLabelChange?: (label: string) => void
  onCameraReady?: (camera: MapCameraApi | null) => void
  onZoomChange?: (zoom: number) => void
}

export function MapView({
  records,
  selectedRecordId,
  onRecordSelect,
  onParkProjectsLoaded,
  selectedWardId,
  onWardSelect,
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
  const onRecordSelectRef = useRef(onRecordSelect)
  const onWardSelectRef = useRef(onWardSelect)
  const [loadState, setLoadState] = useState<MapLoadState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null)
  const [hoveredWard, setHoveredWard] = useState<WardSelection | null>(null)
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(
    null,
  )

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
    onRecordSelectRef.current = onRecordSelect
  }, [onRecordSelect])

  useEffect(() => {
    onWardSelectRef.current = onWardSelect
  }, [onWardSelect])

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

    const onBackgroundClick = (event: MapMouseEvent) => {
      const parkLayers = PARK_PROJECT_HIT_LAYER_IDS.filter((id) =>
        Boolean(map.getLayer(id)),
      )
      if (parkLayers.length > 0) {
        const parkHits = map.queryRenderedFeatures(event.point, {
          layers: [...parkLayers],
        })
        if (parkHits.length > 0) return
      }

      if (!map.getLayer(WARDS_FILL_LAYER_ID)) {
        onWardSelectRef.current(null)
        onRecordSelectRef.current(null)
        return
      }
      const wardHits = map.queryRenderedFeatures(event.point, {
        layers: [WARDS_FILL_LAYER_ID],
      })
      if (wardHits.length > 0) return
      onWardSelectRef.current(null)
      onRecordSelectRef.current(null)
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
    map.on('click', onBackgroundClick)
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
      map.off('click', onBackgroundClick)
      map.off('error', onError)
      map.remove()
      mapRef.current = null
    }
  }, [])

  return (
    <div className={styles.root} aria-label="Interactive neighbourhood map">
      <div ref={containerRef} className={styles.map} />
      <WardLayer
        map={mapInstance}
        selectedWardId={selectedWardId}
        onWardSelect={onWardSelect}
        onWardHover={(ward, point) => {
          setHoveredWard(ward)
          setHoverPoint(point ?? null)
        }}
      />
      <DecisionMarkerLayer
        map={mapInstance}
        records={records}
        selectedRecordId={selectedRecordId}
        onRecordSelect={onRecordSelect}
      />
      <ParkProjectLayer
        map={mapInstance}
        municipalRecords={records}
        selectedRecordId={selectedRecordId}
        onProjectsLoaded={onParkProjectsLoaded ?? (() => undefined)}
        onRecordSelect={onRecordSelect}
      />
      {hoveredWard && hoverPoint && selectedWardId !== hoveredWard.wardId ? (
        <WardHoverLabel ward={hoveredWard} x={hoverPoint.x} y={hoverPoint.y} />
      ) : null}

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
