# Sources and attribution

## Map data

| Source | Role | Notes |
| --- | --- | --- |
| [OpenFreeMap](https://openfreemap.org/) | Hosted Liberty vector style | Style URL: `https://tiles.openfreemap.org/styles/liberty` |
| [OpenMapTiles](https://openmaptiles.org/) | Vector tile schema used by the style | Attribution required by the style |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | Underlying geographic data | © OpenStreetMap contributors |
| [MapLibre GL JS](https://maplibre.org/) | Map rendering engine | BSD-3-Clause |

MapLibre’s on-map attribution control is enabled and includes OpenFreeMap / OpenMapTiles / OpenStreetMap credit.

## Geographic focus

- **Home camera:** prefers browser geolocation; falls back to the Kennedy/Danforth case-study centre in `src/data/mapLocation.ts`.
- **Decision marker:** uses the same indicative address midpoint for the Toronto rental demolition record. **Not** a surveyed property boundary.
- Place names in the nav chip come from OpenMapTiles `place` features near the map centre (not a geocoding API).

## Municipal record dataset (static)

Primary source file: [`src/data/municipalRecords.json`](../src/data/municipalRecords.json) — a manually supplied GeoJSON FeatureCollection, **not** a live municipal API.

Each feature carries its own `official_source_url`, `evidence[]`, `last_verified`, and participation fields. Curated enrichments for notice 8007 (unit metrics / related zoning vs demolition) live in `src/data/decisions/torontoKennedyDanforth.ts` and merge by the GeoJSON id `toronto-notice-8007-rental-demolition`.

| Example official pages referenced in the dataset | Role |
| --- | --- |
| https://secure.toronto.ca/nm/api/individual/notice/8007.do | Rental demolition public notice |
| https://www.toronto.ca/legdocs/mmis/2021/sc/bgrd/backgroundfile-165240.pdf | Preliminary planning report (curated enrichment) |
| Wychwood / Apted project pages linked in GeoJSON properties | Park consultation sources |
| https://open.toronto.ca/dataset/park-and-recreation-facility-projects/ | Geometry / GIS project metadata |

Participation availability comes from each feature’s `participation_status` (and options), not from `status` or `source_gis_status`.

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
