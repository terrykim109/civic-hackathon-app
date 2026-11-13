/// <reference types="vite/client" />

declare module 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url' {
  const workerUrl: string
  export default workerUrl
}

declare module '*.geojson?url' {
  const url: string
  export default url
}

declare module '*.html?url' {
  const url: string
  export default url
}
