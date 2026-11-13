import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'

/**
 * Configure MapLibre’s web worker once before any Map is created.
 * Vite serves the worker as a separate URL module.
 */
setWorkerUrl(workerUrl)

export { MAP_STYLE_URL } from '../../data/mapLocation'
