import { useMemo, useState } from 'react'
import { ResearchAssistantPanel } from '../components/assistant/ResearchAssistantPanel'
import { AuthNav } from '../components/auth/AuthNav'
import { TopNav } from '../components/layout/TopNav'
import type { LocationSearchResolved } from '../components/layout/LocationSearch'
import { CameraControls } from '../components/map/CameraControls'
import { MapView } from '../components/map/MapView'
import { NearbyProposalsPanel } from '../components/nearby/NearbyProposalsPanel'
import { SelectedRecordPreview } from '../components/records/SelectedRecordPreview'
import { SelectedWardPanel } from '../components/wards/SelectedWardPanel'
import { useMapMunicipalRecords } from '../data/useMapMunicipalRecords'
import { MAP_VIEWPORT, NEIGHBOURHOOD_LABEL } from '../data/mapLocation'
import { buildResearchContext } from '../lib/assistant/buildResearchContext'
import type { AssistantAreaContext } from '../lib/assistant/types'
import { findNearbyProposals } from '../lib/nearby/findNearbyProposals'
import {
  NEARBY_RADIUS_DEFAULT_M,
  normalizeNearbyRadiusMeters,
} from '../lib/nearby/nearbyRadius'
import { nearbySelectionCenter } from '../lib/nearby/nearbySelection'
import { isValidLngLat } from '../lib/geo/haversine'
import { isParkFacilityProject } from '../data/parks/adaptParkFacilityProjects'
import type { MunicipalRecord } from '../types/municipalRecord'
import type { LngLat, MapCameraApi } from '../types/map'
import type { WardSelection } from '../types/ward'
import styles from '../App.module.css'

interface NearbySearchState {
  label: string
  coordinates: LngLat
}

/** Public map experience — static records plus published Supabase proposals. */
export function MapPage() {
  const { records, loadState, publishedIds, errorMessage } =
    useMapMunicipalRecords()
  const [locationLabel, setLocationLabel] = useState(NEIGHBOURHOOD_LABEL)
  const [camera, setCamera] = useState<MapCameraApi | null>(null)
  const [zoom, setZoom] = useState(MAP_VIEWPORT.zoom)
  const [selectedRecord, setSelectedRecord] = useState<MunicipalRecord | null>(
    null,
  )
  const [selectedWard, setSelectedWard] = useState<WardSelection | null>(null)
  const [parkProjects, setParkProjects] = useState<MunicipalRecord[]>([])
  const [nearbySearch, setNearbySearch] = useState<NearbySearchState | null>(
    null,
  )
  const [nearbyRadiusMeters, setNearbyRadiusMeters] = useState(
    NEARBY_RADIUS_DEFAULT_M,
  )
  const [nearbyCollapsed, setNearbyCollapsed] = useState(false)
  const [nearbyOpen, setNearbyOpen] = useState(false)
  const [assistantArea, setAssistantArea] =
    useState<AssistantAreaContext | null>(null)
  const [assistantSessionKey, setAssistantSessionKey] = useState(0)

  const nearbyResults = useMemo(() => {
    if (!nearbySearch) return []
    return findNearbyProposals(
      nearbySearch.coordinates,
      records,
      nearbyRadiusMeters,
    )
  }, [nearbySearch, records, nearbyRadiusMeters])

  const onLocationResolved = (result: LocationSearchResolved) => {
    if (!isValidLngLat(result.coordinates)) return
    setNearbySearch({
      label: result.label,
      coordinates: result.coordinates,
    })
    setNearbyRadiusMeters(NEARBY_RADIUS_DEFAULT_M)
    setNearbyCollapsed(false)
    setNearbyOpen(true)
  }

  const onLocationCleared = () => {
    setNearbyOpen(false)
    setNearbySearch(null)
    setNearbyCollapsed(false)
    setNearbyRadiusMeters(NEARBY_RADIUS_DEFAULT_M)
  }

  const onSelectNearby = (record: MunicipalRecord) => {
    setSelectedRecord(record)
    setNearbyCollapsed(true)
    const center = nearbySelectionCenter(record)
    if (camera && center) {
      camera.flyToLocation({ center })
    }
  }

  const clearParkFacilitySelection = () => {
    setSelectedRecord((current) =>
      current && isParkFacilityProject(current) ? null : current,
    )
  }

  const onWardSelect = (ward: WardSelection | null) => {
    setSelectedWard(ward)
    clearParkFacilitySelection()
  }

  const onWardRecordSelect = (record: MunicipalRecord) => {
    setSelectedRecord(record)
    if (isParkFacilityProject(record)) {
      const center = nearbySelectionCenter(record)
      if (camera && center) {
        camera.flyToLocation({ center })
      }
    }
  }

  const openAssistant = (area: AssistantAreaContext) => {
    setAssistantArea(area)
    setAssistantSessionKey((value) => value + 1)
    setNearbyCollapsed(true)
  }

  const exploreSelectedWard = () => {
    if (!selectedWard) return
    openAssistant(
      buildResearchContext({
        label: selectedWard.name,
        ward: selectedWard,
        coordinates: nearbySearch?.coordinates ?? null,
        records,
        nearbyRadiusMeters,
      }),
    )
  }

  const exploreNearbySearch = () => {
    if (!nearbySearch) return
    openAssistant(
      buildResearchContext({
        label: nearbySearch.label,
        coordinates: nearbySearch.coordinates,
        ward: selectedWard,
        records,
        nearbyRadiusMeters,
      }),
    )
  }

  return (
    <div className={styles.shell}>
      <MapView
        records={records}
        selectedRecordId={selectedRecord?.id ?? null}
        onRecordSelect={setSelectedRecord}
        onParkProjectsLoaded={setParkProjects}
        selectedWardId={selectedWard?.wardId ?? null}
        onWardSelect={onWardSelect}
        onPlaceLabelChange={setLocationLabel}
        onCameraReady={setCamera}
        onZoomChange={setZoom}
      />
      <div className={styles.ui}>
        <AuthNav />
        <TopNav
          locationLabel={locationLabel}
          camera={camera}
          onSearchResolved={setLocationLabel}
          onLocationResolved={onLocationResolved}
          onLocationCleared={onLocationCleared}
        />
        <CameraControls camera={camera} zoom={zoom} />
        {selectedWard ? (
          <SelectedWardPanel
            key={selectedWard.wardId}
            ward={selectedWard}
            records={records}
            parkProjects={parkProjects}
            selectedRecordId={selectedRecord?.id ?? null}
            onClose={() => onWardSelect(null)}
            onRecordSelect={onWardRecordSelect}
            onExploreArea={exploreSelectedWard}
          />
        ) : null}
        {nearbyOpen && nearbySearch ? (
          <NearbyProposalsPanel
            searchLabel={nearbySearch.label}
            radiusMeters={nearbyRadiusMeters}
            results={nearbyResults}
            collapsed={nearbyCollapsed}
            selectedRecordId={selectedRecord?.id ?? null}
            onRadiusChange={(meters) => {
              setNearbyRadiusMeters(normalizeNearbyRadiusMeters(meters))
            }}
            onToggleCollapsed={() => setNearbyCollapsed((value) => !value)}
            onClose={onLocationCleared}
            onSelect={onSelectNearby}
            onExploreArea={exploreNearbySearch}
          />
        ) : null}
        {assistantArea ? (
          <ResearchAssistantPanel
            key={assistantSessionKey}
            area={assistantArea}
            onClose={() => setAssistantArea(null)}
          />
        ) : null}
        {selectedRecord ? (
          <SelectedRecordPreview
            key={selectedRecord.id}
            record={selectedRecord}
            canPersistFeedback={publishedIds.has(selectedRecord.id)}
            onClose={() => setSelectedRecord(null)}
          />
        ) : null}
      </div>
      <span className={styles.srOnly} role="status" aria-live="polite">
        {loadState === 'loading' ? 'Loading published proposals. ' : ''}
        {loadState === 'error'
          ? `Published proposal refresh failed. ${errorMessage ?? ''} `
          : ''}
        {nearbyOpen && nearbySearch
          ? `Nearby proposals: ${nearbyResults.length} within the selected radius. `
          : ''}
        {assistantArea ? `Explorer assistant open for ${assistantArea.label}. ` : ''}
        {selectedWard
          ? `Selected ward ${selectedWard.wardId}: ${selectedWard.name}. `
          : ''}
        {selectedRecord
          ? `Selected record: ${selectedRecord.title}`
          : selectedWard
            ? 'No municipal record selected'
            : 'No ward or municipal record selected'}
      </span>
    </div>
  )
}
