# Sources and attribution

## Map data

| Source | Role | Notes |
| --- | --- | --- |
| [OpenFreeMap](https://openfreemap.org/) | Hosted Liberty vector style | Style URL: `https://tiles.openfreemap.org/styles/liberty` |
| [OpenMapTiles](https://openmaptiles.org/) | Vector tile schema used by the style | Attribution required by the style |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | Underlying geographic data | © OpenStreetMap contributors |
| [MapLibre GL JS](https://maplibre.org/) | Map rendering engine | BSD-3-Clause |

MapLibre’s on-map attribution control is enabled and includes OpenFreeMap / OpenMapTiles / OpenStreetMap credit.

## Geographic focus (static)

Neighbourhood camera centre is derived from address points near Kennedy Road and Danforth Road, Scarborough (Clairlea-Birchmount), verified via OpenStreetMap Nominatim and **baked into** `src/data/mapLocation.ts`. The app does **not** perform runtime geocoding.

These coordinates are a neighbourhood focus only — **not** a surveyed property boundary.

## Official Toronto case-study references (for later commits)

These sources will support municipal decision content in later increments. They are listed now for traceability; Commit 01 does not display decision claims.

| Source | URL |
| --- | --- |
| City of Toronto public notice | https://secure.toronto.ca/nm/api/individual/notice/8007.do |
| Preliminary planning report (2021) | https://www.toronto.ca/legdocs/mmis/2021/sc/bgrd/backgroundfile-165240.pdf |

## Dependency licenses (installed versions)

Recorded from `node_modules/*/package.json` at Commit 01 setup:

| Package | Version | License |
| --- | --- | --- |
| react | 19.3.1 | MIT |
| react-dom | 19.3.1 | MIT |
| maplibre-gl | 6.18.0 | BSD-3-Clause |
| lucide-react | 1.72.0 | ISC |
| vite | 8.3.8 | MIT |
| typescript | 5.9.3 | Apache-2.0 |
| @vitejs/plugin-react | 6.3.0 | MIT |
| eslint | 9.39.5 | MIT |
| vitest | 3.2.7 | MIT |

## AI tooling

Implementation assistance: Cursor agent (Composer). Generated code was reviewed against MapLibre docs, OpenFreeMap style usage, and local typecheck / lint / build / unit tests before acceptance.
