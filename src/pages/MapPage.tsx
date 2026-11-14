import { useMemo, useState } from 'react'
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
    // Same selection path as map markers: open SelectedRecordPreview.
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
    // Contextual park marker belongs to the open ward list — clear on change/dismiss.
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
