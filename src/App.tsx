import { useState } from 'react'
import { TopNav } from './components/layout/TopNav'
import { CameraControls } from './components/map/CameraControls'
import { MapView } from './components/map/MapView'
import { SelectedRecordPreview } from './components/records/SelectedRecordPreview'
import { MUNICIPAL_RECORDS } from './data/decisions'
import { MAP_VIEWPORT, NEIGHBOURHOOD_LABEL } from './data/mapLocation'
import type { MunicipalRecord } from './types/municipalRecord'
import type { MapCameraApi } from './types/map'
import styles from './App.module.css'

export default function App() {
  const [locationLabel, setLocationLabel] = useState(NEIGHBOURHOOD_LABEL)
  const [camera, setCamera] = useState<MapCameraApi | null>(null)
  const [zoom, setZoom] = useState(MAP_VIEWPORT.zoom)
  const [selectedRecord, setSelectedRecord] = useState<MunicipalRecord | null>(
    null,
  )

  return (
    <div className={styles.shell}>
      <MapView
        records={MUNICIPAL_RECORDS}
        selectedRecordId={selectedRecord?.id ?? null}
        onRecordSelect={setSelectedRecord}
        onPlaceLabelChange={setLocationLabel}
        onCameraReady={setCamera}
        onZoomChange={setZoom}
      />
      <div className={styles.ui}>
        <TopNav locationLabel={locationLabel} />
        <CameraControls camera={camera} zoom={zoom} />
        {selectedRecord ? (
          <SelectedRecordPreview
            key={selectedRecord.id}
            record={selectedRecord}
            onClose={() => setSelectedRecord(null)}
          />
        ) : null}
      </div>
      <span className={styles.srOnly} role="status" aria-live="polite">
        {selectedRecord
          ? `Selected record: ${selectedRecord.title}`
          : 'No municipal record selected'}
      </span>
    </div>
  )
}
