import { useState } from 'react'
import { TopNav } from './components/layout/TopNav'
import { CameraControls } from './components/map/CameraControls'
import { MapView } from './components/map/MapView'
import { MAP_VIEWPORT, NEIGHBOURHOOD_LABEL } from './data/mapLocation'
import type { MapCameraApi } from './types/map'
import styles from './App.module.css'

export default function App() {
  const [locationLabel, setLocationLabel] = useState(NEIGHBOURHOOD_LABEL)
  const [camera, setCamera] = useState<MapCameraApi | null>(null)
  const [zoom, setZoom] = useState(MAP_VIEWPORT.zoom)

  return (
    <div className={styles.shell}>
      <MapView
        onPlaceLabelChange={setLocationLabel}
        onCameraReady={setCamera}
        onZoomChange={setZoom}
      />
      <div className={styles.ui}>
        <TopNav locationLabel={locationLabel} />
        <CameraControls camera={camera} zoom={zoom} />
      </div>
    </div>
  )
}
