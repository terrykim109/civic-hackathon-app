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

## Location search (geocoding)

| Source | Role | Notes |
| --- | --- | --- |
| [Photon](https://github.com/komoot/photon) (Komoot public API) | Forward geocoding + suggestions | OSM-derived; Toronto `lat`/`lon` bias; client filters to `countrycode=CA` |

Implementation: `src/data/geocoding/photon.ts`. Suggestions use a 400ms debounce (not a request per keystroke). Enter / Search runs immediately. Results are cached in-memory per normalized query. Photon was chosen over public Nominatim because Nominatim forbids autocomplete and does not reliably resolve Canadian postal codes.

A geocoded point is an indicative map location only — not a property boundary or project impact area. Attribution appears in the suggestions panel alongside the existing map credit.

## Toronto ward boundaries (static)

Source file: [`src/data/wards.geojson`](../src/data/wards.geojson) — 25 MultiPolygon features with `ward_id`, `name`, `decision_ids`, and `role: navigation_boundary_not_impact_area`. Loaded by MapLibre via a Vite asset URL (not embedded in the JS bundle). Ward polygons are navigation aids only; they are not project impact areas.

Official ward name/description enrichment: [`src/data/wardOfficialMeta.json`](../src/data/wardOfficialMeta.json) — properties-only extract from City of Toronto [City Wards](https://open.toronto.ca/dataset/city-wards/) (`AREA_SHORT_CODE` / `AREA_NAME` / `AREA_DESC`). Polygon geometries from `city-wards.geojson` are **not** rendered a second time.

## Municipal record dataset (static)

Primary source file: [`src/data/municipalRecords.json`](../src/data/municipalRecords.json) — a manually supplied GeoJSON FeatureCollection, **not** a live municipal API.

Each feature carries its own `official_source_url`, `evidence[]`, `last_verified`, and participation fields. Curated enrichments for notice 8007 (unit metrics / related zoning vs demolition) live in `src/data/decisions/torontoKennedyDanforth.ts` and merge by the GeoJSON id `toronto-notice-8007-rental-demolition`. A bundled HTML snapshot of notice 8007 (`src/data/notice8007.html`) is linked as a local source for offline verification alongside the live City notice URL.

| Example official pages referenced in the dataset | Role |
| --- | --- |
| https://secure.toronto.ca/nm/api/individual/notice/8007.do | Rental demolition public notice |
| Bundled `notice8007.html` | Local snapshot of the same notice |
| https://www.toronto.ca/legdocs/mmis/2021/sc/bgrd/backgroundfile-165240.pdf | Preliminary planning report (curated enrichment) |
| Wychwood / Apted project pages linked in GeoJSON properties | Park consultation sources |
| https://open.toronto.ca/dataset/park-and-recreation-facility-projects/ | Geometry / GIS project metadata |

Participation availability comes from each feature’s `participation_status` (and options), not from `status` or `source_gis_status`.

## Park and recreation facility projects (Open Data)

Source file: [`src/data/park-and-recreation-facility-projects.geojson`](../src/data/park-and-recreation-facility-projects.geojson) — City of Toronto [Park and Recreation Facility Projects](https://open.toronto.ca/dataset/park-and-recreation-facility-projects/). Loaded by Vite asset URL + fetch; adapted in `src/data/parks/adaptParkFacilityProjects.ts`.

- Features already represented in `municipalRecords.json` via matching `globalid` (Wychwood, Apted) are **skipped** to avoid duplicate markers.
- Remaining projects render as MapLibre circle layers (not HTML decision markers).
- Ward panel lists use each feature’s own `ward_number` field (normalized), never map proximity.
- Participation and decision outcome stay `unknown` unless a separate verified source says otherwise.

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
