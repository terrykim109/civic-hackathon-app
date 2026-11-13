import { useEffect, useRef } from 'react'
import type { Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl'
import {
  loadParkFacilityProjectRecords,
  parkProjectsToFeatureCollection,
  type GeoJsonFeatureCollection,
} from '../../data/parks/adaptParkFacilityProjects'
import { PARK_FACILITY_PROJECTS_GEOJSON_URL } from '../../data/parks/parkProjectsAsset'
import type { MunicipalRecord } from '../../types/municipalRecord'
import {
  ensureParkProjectLayers,
  PARK_PROJECTS_CIRCLE_LAYER_ID,
  PARK_PROJECTS_SELECTED_LAYER_ID,
  setParkProjectData,
  setParkProjectSelectionFilter,
} from './parkProjectLayers'

interface ParkProjectLayerProps {
  map: MapLibreMap | null
  municipalRecords: readonly MunicipalRecord[]
  selectedRecordId: string | null
  onProjectsLoaded: (projects: MunicipalRecord[]) => void
  onRecordSelect: (record: MunicipalRecord | null) => void
}

/**
 * Loads Open Data park facility projects, skips globalids already in municipal
 * records, and renders them as MapLibre circle markers (not a second HTML marker set).
 */
export function ParkProjectLayer({
  map,
  municipalRecords,
  selectedRecordId,
  onProjectsLoaded,
  onRecordSelect,
}: ParkProjectLayerProps) {
  const projectsRef = useRef<MunicipalRecord[]>([])
  const collectionRef = useRef<GeoJsonFeatureCollection | null>(null)
  const onProjectsLoadedRef = useRef(onProjectsLoaded)
  const onRecordSelectRef = useRef(onRecordSelect)
  const selectedIdRef = useRef(selectedRecordId)

  useEffect(() => {
    onProjectsLoadedRef.current = onProjectsLoaded
  }, [onProjectsLoaded])

  useEffect(() => {
    onRecordSelectRef.current = onRecordSelect
  }, [onRecordSelect])

  useEffect(() => {
    selectedIdRef.current = selectedRecordId
  }, [selectedRecordId])

  useEffect(() => {
    if (!map) return

    let cancelled = false
    let loaded = false

    const onClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0]
      const id = feature?.properties?.id
      if (typeof id !== 'string' || !id) return
      event.originalEvent.stopPropagation()
      const record = projectsRef.current.find((project) => project.id === id)
      if (!record) return
      const alreadySelected = selectedIdRef.current === id
      onRecordSelectRef.current(alreadySelected ? null : record)
    }

    const onEnter = () => {
      map.getCanvas().style.cursor = 'pointer'
    }
    const onLeave = () => {
      map.getCanvas().style.cursor = ''
    }

    const bindLayerEvents = () => {
      map.on('click', PARK_PROJECTS_CIRCLE_LAYER_ID, onClick)
      map.on('click', PARK_PROJECTS_SELECTED_LAYER_ID, onClick)
      map.on('mouseenter', PARK_PROJECTS_CIRCLE_LAYER_ID, onEnter)
      map.on('mouseleave', PARK_PROJECTS_CIRCLE_LAYER_ID, onLeave)
    }

    const unbindLayerEvents = () => {
      map.off('click', PARK_PROJECTS_CIRCLE_LAYER_ID, onClick)
      map.off('click', PARK_PROJECTS_SELECTED_LAYER_ID, onClick)
      map.off('mouseenter', PARK_PROJECTS_CIRCLE_LAYER_ID, onEnter)
      map.off('mouseleave', PARK_PROJECTS_CIRCLE_LAYER_ID, onLeave)
    }

    const applyToMap = () => {
      if (cancelled || !collectionRef.current) return
      ensureParkProjectLayers(map)
      setParkProjectData(map, collectionRef.current)
      setParkProjectSelectionFilter(map, selectedIdRef.current)
      unbindLayerEvents()
      bindLayerEvents()
    }

    const boot = async () => {
      try {
        const { records } = await loadParkFacilityProjectRecords(
          PARK_FACILITY_PROJECTS_GEOJSON_URL,
          municipalRecords,
        )
        if (cancelled) return
        projectsRef.current = records
        collectionRef.current = parkProjectsToFeatureCollection(records)
        loaded = true
        if (map.isStyleLoaded()) applyToMap()
        onProjectsLoadedRef.current(records)
      } catch {
        if (!cancelled) onProjectsLoadedRef.current([])
      }
    }

    const onStyleLoad = () => {
      if (loaded) applyToMap()
    }

    map.on('style.load', onStyleLoad)
    void boot()

    return () => {
      cancelled = true
      map.off('style.load', onStyleLoad)
      unbindLayerEvents()
      if (map.getStyle()) {
        map.getCanvas().style.cursor = ''
      }
    }
  }, [map, municipalRecords])

  useEffect(() => {
    if (!map) return
    setParkProjectSelectionFilter(map, selectedRecordId)
  }, [map, selectedRecordId])

  return null
}

/** Layers that should block background deselect when clicked. */
export const PARK_PROJECT_HIT_LAYER_IDS = [
  PARK_PROJECTS_CIRCLE_LAYER_ID,
  PARK_PROJECTS_SELECTED_LAYER_ID,
] as const
