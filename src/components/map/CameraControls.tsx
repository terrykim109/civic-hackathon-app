import type { SyntheticEvent } from 'react'
import { Focus, Minus, Plus } from 'lucide-react'
import { MAP_VIEWPORT } from '../../data/mapLocation'
import type { MapCameraApi } from '../../types/map'
import styles from './CameraControls.module.css'

interface CameraControlsProps {
  camera: MapCameraApi | null
  zoom: number
}

function stopMapGesture(event: SyntheticEvent) {
  event.stopPropagation()
}

export function CameraControls({ camera, zoom }: CameraControlsProps) {
  const atMinZoom = zoom <= MAP_VIEWPORT.minZoom + 1e-6
  const atMaxZoom = zoom >= MAP_VIEWPORT.maxZoom - 1e-6
  const ready = camera !== null

  return (
    <div
      className={styles.group}
      role="group"
      aria-label="Map camera controls"
      onMouseDown={stopMapGesture}
      onPointerDown={stopMapGesture}
      onDoubleClick={stopMapGesture}
      onWheel={stopMapGesture}
    >
      <button
        type="button"
        className={styles.button}
        aria-label="Zoom in"
        title="Zoom in"
        disabled={!ready || atMaxZoom}
        onClick={() => camera?.zoomIn()}
      >
        <Plus size={18} strokeWidth={2.25} aria-hidden="true" />
      </button>

      <button
        type="button"
        className={styles.button}
        aria-label="Zoom out"
        title="Zoom out"
        disabled={!ready || atMinZoom}
        onClick={() => camera?.zoomOut()}
      >
        <Minus size={18} strokeWidth={2.25} aria-hidden="true" />
      </button>

      <button
        type="button"
        className={styles.button}
        aria-label="Reset view to your location"
        title="Reset to your location"
        disabled={!ready}
        onClick={() => camera?.resetView()}
      >
        <Focus size={18} strokeWidth={2.25} aria-hidden="true" />
      </button>
    </div>
  )
}
