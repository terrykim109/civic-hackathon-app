import { useState } from 'react'
import { AuthNav } from '../components/auth/AuthNav'
import { TopNav } from '../components/layout/TopNav'
import { CameraControls } from '../components/map/CameraControls'
import { MapRecordsStatus } from '../components/map/MapRecordsStatus'
import { MapView } from '../components/map/MapView'
import { SelectedRecordPreview } from '../components/records/SelectedRecordPreview'
import { SelectedWardPanel } from '../components/wards/SelectedWardPanel'
import { useMapMunicipalRecords } from '../data/useMapMunicipalRecords'
import { MAP_VIEWPORT, NEIGHBOURHOOD_LABEL } from '../data/mapLocation'
import type { MunicipalRecord } from '../types/municipalRecord'
import type { MapCameraApi } from '../types/map'
import type { WardSelection } from '../types/ward'
import styles from '../App.module.css'

/** Public map experience — static records plus published Supabase proposals. */
export function MapPage() {
  const { records, loadState, publishedCount, errorMessage } =
    useMapMunicipalRecords()
  const [locationLabel, setLocationLabel] = useState(NEIGHBOURHOOD_LABEL)
  const [camera, setCamera] = useState<MapCameraApi | null>(null)
  const [zoom, setZoom] = useState(MAP_VIEWPORT.zoom)
  const [selectedRecord, setSelectedRecord] = useState<MunicipalRecord | null>(
    null,
  )
  const [selectedWard, setSelectedWard] = useState<WardSelection | null>(null)
  const [parkProjects, setParkProjects] = useState<MunicipalRecord[]>([])

  return (
    <div className={styles.shell}>
      <MapView
        records={records}
        selectedRecordId={selectedRecord?.id ?? null}
        onRecordSelect={setSelectedRecord}
        onParkProjectsLoaded={setParkProjects}
        selectedWardId={selectedWard?.wardId ?? null}
        onWardSelect={setSelectedWard}
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
        />
        <CameraControls camera={camera} zoom={zoom} />
        <MapRecordsStatus
          loadState={loadState}
          publishedCount={publishedCount}
          errorMessage={errorMessage}
        />
        {selectedWard ? (
          <SelectedWardPanel
            key={selectedWard.wardId}
            ward={selectedWard}
            records={records}
            parkProjects={parkProjects}
            selectedRecordId={selectedRecord?.id ?? null}
            onClose={() => setSelectedWard(null)}
            onRecordSelect={setSelectedRecord}
          />
        ) : null}
        {selectedRecord ? (
          <SelectedRecordPreview
            key={selectedRecord.id}
            record={selectedRecord}
            onClose={() => setSelectedRecord(null)}
          />
        ) : null}
      </div>
      <span className={styles.srOnly} role="status" aria-live="polite">
        {loadState === 'loading' ? 'Loading published proposals. ' : ''}
        {loadState === 'error'
          ? `Published proposal refresh failed. ${errorMessage ?? ''} `
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
