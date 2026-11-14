import { useEffect, useRef } from 'react'
import type { Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl'
import {
  contextualParkProjectCollection,
  loadParkFacilityProjectRecords,
} from '../../data/parks/adaptParkFacilityProjects'
import { PARK_FACILITY_PROJECTS_GEOJSON_URL } from '../../data/parks/parkProjectsAsset'
import type { MunicipalRecord } from '../../types/municipalRecord'
import {
  ensureParkProjectLayers,
  PARK_PROJECTS_CIRCLE_LAYER_ID,
  setParkProjectData,
} from './parkProjectLayers'

interface ParkProjectLayerProps {
  map: MapLibreMap | null
  municipalRecords: readonly MunicipalRecord[]
  selectedRecordId: string | null
  onProjectsLoaded: (projects: MunicipalRecord[]) => void
  onRecordSelect: (record: MunicipalRecord | null) => void
}

/**
 * Loads Open Data park facility projects for ward lists, but only draws a
 * map marker for the currently selected park project (contextual, not global).
 */
export function ParkProjectLayer({
  map,
  municipalRecords,
  selectedRecordId,
  onProjectsLoaded,
  onRecordSelect,
}: ParkProjectLayerProps) {
  const projectsRef = useRef<MunicipalRecord[]>([])
  const municipalRecordsRef = useRef(municipalRecords)
  const onProjectsLoadedRef = useRef(onProjectsLoaded)
  const onRecordSelectRef = useRef(onRecordSelect)
  const selectedIdRef = useRef(selectedRecordId)
  const drawnIdRef = useRef<string | null>(null)

  useEffect(() => {
    municipalRecordsRef.current = municipalRecords
  }, [municipalRecords])

  useEffect(() => {
    onProjectsLoadedRef.current = onProjectsLoaded
  }, [onProjectsLoaded])

  useEffect(() => {
    onRecordSelectRef.current = onRecordSelect
  }, [onRecordSelect])

  useEffect(() => {
    selectedIdRef.current = selectedRecordId
  }, [selectedRecordId])

  const syncContextualMarker = (mapInstance: MapLibreMap) => {
    const nextId = selectedIdRef.current
    // Avoid clear/setData churn that flashes the marker during camera moves
    // or parent re-renders with a new municipalRecords array identity.
    if (drawnIdRef.current === nextId) return

    const collection = contextualParkProjectCollection(
      projectsRef.current,
      nextId,
    )
    ensureParkProjectLayers(mapInstance)
    setParkProjectData(mapInstance, collection)
    drawnIdRef.current = nextId
  }

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
      map.on('mouseenter', PARK_PROJECTS_CIRCLE_LAYER_ID, onEnter)
      map.on('mouseleave', PARK_PROJECTS_CIRCLE_LAYER_ID, onLeave)
    }

    const unbindLayerEvents = () => {
      map.off('click', PARK_PROJECTS_CIRCLE_LAYER_ID, onClick)
      map.off('mouseenter', PARK_PROJECTS_CIRCLE_LAYER_ID, onEnter)
      map.off('mouseleave', PARK_PROJECTS_CIRCLE_LAYER_ID, onLeave)
    }

    const applyToMap = () => {
      if (cancelled) return
      drawnIdRef.current = null
      syncContextualMarker(map)
      unbindLayerEvents()
      bindLayerEvents()
    }

    const boot = async () => {
      try {
        const { records } = await loadParkFacilityProjectRecords(
          PARK_FACILITY_PROJECTS_GEOJSON_URL,
          municipalRecordsRef.current,
        )
        if (cancelled) return
        projectsRef.current = records
        loaded = true
        if (map.isStyleLoaded()) applyToMap()
        onProjectsLoadedRef.current(records)
      } catch {
        if (!cancelled) {
          projectsRef.current = []
          onProjectsLoadedRef.current([])
          if (map.isStyleLoaded()) applyToMap()
        }
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
        setParkProjectData(map, { type: 'FeatureCollection', features: [] })
        drawnIdRef.current = null
      }
    }
    // Load once per map instance. municipalRecords is read via ref so identity
    // churn from mergeStaticAndPublishedRecords does not clear the marker.
  }, [map])

  useEffect(() => {
    if (!map) return
    syncContextualMarker(map)
  }, [map, selectedRecordId])

  return null
}

/** Layers that should block background deselect when clicked. */
export const PARK_PROJECT_HIT_LAYER_IDS = [PARK_PROJECTS_CIRCLE_LAYER_ID] as const
