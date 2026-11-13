# Architecture — CivicLens

## Chosen approach

CivicLens is a **client-only Vite + React + TypeScript** app. The geographic surface is **MapLibre GL JS** rendering the **OpenFreeMap Liberty** vector style.

### Why MapLibre + OpenFreeMap

- **MapLibre** is an open-source WebGL map engine with first-class vector tiles, pan/zoom, and native `fill-extrusion` 3D buildings (no Three.js).
- **OpenFreeMap** provides a free, attribution-friendly hosted style (`/styles/liberty`) so we do not need a tile server or API key for the hackathon foundation.

### Alternatives considered

| Option | Why not now |
| --- | --- |
| Mapbox GL JS | Proprietary license / token requirements for production use. |
| Leaflet + raster tiles | Weaker fit for 3D building work and vector styling. |
| Google Maps | Closed ecosystem; heavier compliance and billing surface. |
| Three.js building meshes | Extra engine and invents geometry; MapLibre already extrudes vector footprints. |
| Self-hosted tiles | Unnecessary ops cost for the current scope. |

### Module boundaries

```
src/
  components/layout/   # chrome that is not the map canvas
  components/map/      # MapLibre lifecycle, extrusions, map chrome styles
  data/                # static location / config (no network geocoding)
  styles/              # design tokens + global resets
  types/               # shared TypeScript contracts
```

`MapView` owns map create/destroy and load/error state. Camera constants live in `data/mapLocation.ts`. Building extrusion setup lives in `components/map/buildingExtrusion.ts`.

## 3D buildings (Commit 02)

Inspected from the live OpenFreeMap Liberty style (`https://tiles.openfreemap.org/styles/liberty`):

| Item | Actual value |
| --- | --- |
| Vector source id | `openmaptiles` |
| Source URL | `https://tiles.openfreemap.org/planet` |
| Source-layer | `building` |
| Style layer id | `building-3d` (`fill-extrusion`, `minzoom: 14`) |
| Height property | `render_height` (metres; OpenMapTiles render field) |
| Base property | `render_min_height` |
| Exclusion filter | features with `hide_3d` are omitted |

Liberty already defines `building-3d`. CivicLens **refines** that layer’s paint (limestone colour, opacity, coalesce for missing heights) and only **adds** the layer if it is absent — never duplicates.

Missing height handling: `coalesce(to-number(render_height), 0)` / same for `render_min_height`. Zero height means no invented storeys.

A pitched camera (`pitch` ≈ 58°, `bearing` ≈ −28°) makes extrusions readable. Flat `building` fill in the style only runs through zoom 14; extrusions take over from zoom 14+.

## Current limitations

- No backend, auth, AI, or municipal business data layers.
- No decision markers or analysis panels yet.
- Building heights exist only where OpenMapTiles provides `render_height` (derived from OSM height / levels where available). Many footprints may be low or zero.
- Tile availability depends on the public OpenFreeMap service.
