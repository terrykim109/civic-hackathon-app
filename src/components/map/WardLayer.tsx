import { useEffect, useRef } from 'react'
import type { Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl'
import { WARDS_GEOJSON_URL } from '../../data/wards/wardsAsset'
import { parseWardProperties } from '../../data/wards/resolveWardRecords'
import type { WardSelection } from '../../types/ward'
import {
  WARDS_FILL_LAYER_ID,
  clearWardFeatureState,
  ensureWardLayers,
  setWardFeatureState,
} from './wardLayers'

interface WardLayerProps {
  map: MapLibreMap | null
  selectedWardId: string | null
  onWardSelect: (ward: WardSelection | null) => void
  onWardHover: (
    ward: WardSelection | null,
    point?: { x: number; y: number },
  ) => void
}

/**
 * Loads ward GeoJSON by URL once per style and wires hover/selection feature-state.
 * HTML decision markers remain above the canvas and keep their own pointer events.
 */
export function WardLayer({
  map,
  selectedWardId,
  onWardSelect,
  onWardHover,
}: WardLayerProps) {
  const selectedIdRef = useRef(selectedWardId)
  const hoveredIdRef = useRef<string | null>(null)
  const previousSelectedRef = useRef<string | null>(null)
  const onWardSelectRef = useRef(onWardSelect)
  const onWardHoverRef = useRef(onWardHover)

  useEffect(() => {
    selectedIdRef.current = selectedWardId
  }, [selectedWardId])

  useEffect(() => {
    onWardSelectRef.current = onWardSelect
  }, [onWardSelect])

  useEffect(() => {
    onWardHoverRef.current = onWardHover
  }, [onWardHover])

  useEffect(() => {
    if (!map) return

    let cancelled = false

    const install = () => {
      if (cancelled) return
      ensureWardLayers(map, WARDS_GEOJSON_URL)
      if (selectedIdRef.current) {
        setWardFeatureState(map, selectedIdRef.current, 'selected', true)
      }
    }

    if (map.isStyleLoaded()) {
      install()
    }
    map.on('style.load', install)

    const onEnter = () => {
      map.getCanvas().style.cursor = 'pointer'
    }

    const onLeave = () => {
      map.getCanvas().style.cursor = ''
      if (hoveredIdRef.current) {
        clearWardFeatureState(map, hoveredIdRef.current, 'hover')
        hoveredIdRef.current = null
      }
      onWardHoverRef.current(null)
    }

    const onMove = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0]
      const ward = parseWardProperties(
        feature?.properties as Record<string, unknown> | undefined,
      )
      if (!ward) return

      if (hoveredIdRef.current && hoveredIdRef.current !== ward.wardId) {
        clearWardFeatureState(map, hoveredIdRef.current, 'hover')
      }
      hoveredIdRef.current = ward.wardId
      setWardFeatureState(map, ward.wardId, 'hover', true)
      onWardHoverRef.current(ward, { x: event.point.x, y: event.point.y })
    }

    const onClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0]
      const ward = parseWardProperties(
        feature?.properties as Record<string, unknown> | undefined,
      )
      if (!ward) return

      event.originalEvent.stopPropagation()

      if (selectedIdRef.current === ward.wardId) {
        onWardSelectRef.current(null)
        return
      }
      onWardSelectRef.current(ward)
    }

    map.on('mouseenter', WARDS_FILL_LAYER_ID, onEnter)
    map.on('mousemove', WARDS_FILL_LAYER_ID, onMove)
    map.on('mouseleave', WARDS_FILL_LAYER_ID, onLeave)
    map.on('click', WARDS_FILL_LAYER_ID, onClick)

    return () => {
      cancelled = true
      map.off('style.load', install)
      map.off('mouseenter', WARDS_FILL_LAYER_ID, onEnter)
      map.off('mousemove', WARDS_FILL_LAYER_ID, onMove)
      map.off('mouseleave', WARDS_FILL_LAYER_ID, onLeave)
      map.off('click', WARDS_FILL_LAYER_ID, onClick)
      if (hoveredIdRef.current) {
        clearWardFeatureState(map, hoveredIdRef.current, 'hover')
        hoveredIdRef.current = null
      }
    }
  }, [map])

  useEffect(() => {
    if (!map) return
    const previous = previousSelectedRef.current
    if (previous && previous !== selectedWardId) {
      clearWardFeatureState(map, previous, 'selected')
    }
    if (selectedWardId) {
      setWardFeatureState(map, selectedWardId, 'selected', true)
    } else if (previous) {
      clearWardFeatureState(map, previous, 'selected')
    }
    previousSelectedRef.current = selectedWardId
  }, [map, selectedWardId])

  return null
}
