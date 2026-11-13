# Architecture — Commit 01

## Chosen approach

CivicLens is a **client-only Vite + React + TypeScript** app. The geographic surface is **MapLibre GL JS** rendering the **OpenFreeMap Liberty** vector style.

### Why MapLibre + OpenFreeMap

- **MapLibre** is an open-source WebGL map engine with first-class vector tiles, pan/zoom, and a clear path to later 3D building extrusions without introducing Three.js.
- **OpenFreeMap** provides a free, attribution-friendly hosted style (`/styles/liberty`) so we do not need a tile server or API key for the hackathon foundation.

### Alternatives considered

| Option | Why not now |
| --- | --- |
| Mapbox GL JS | Proprietary license / token requirements for production use. |
| Leaflet + raster tiles | Weaker fit for later 3D building work and vector styling. |
| Google Maps | Closed ecosystem; heavier compliance and billing surface. |
| Self-hosted tiles | Unnecessary ops cost for Commit 01. |

### Module boundaries

```
src/
  components/layout/   # chrome that is not the map canvas
  components/map/      # MapLibre lifecycle + map chrome styles
  data/                # static location / config (no network geocoding)
  styles/              # design tokens + global resets
  types/               # shared TypeScript contracts
```

`MapView` owns map create/destroy and load/error state. Camera constants live in `data/mapLocation.ts` so the map centre can change without touching React UI.

### Current limitations

- No backend, auth, AI, or municipal business data layers.
- No 3D extrusions, decision markers, or analysis panels.
- Tile availability depends on the public OpenFreeMap service.
