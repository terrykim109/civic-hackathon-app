# Architecture — CivicSync

## Chosen approach

CivicSync is a **Vite + React + TypeScript** app. The geographic surface is **MapLibre GL JS** rendering the **OpenFreeMap Liberty** vector style. Persistent municipal records and private feedback use **Supabase (PostgreSQL + Auth + RLS)** — no separate Express API. The research assistant uses a **Supabase Edge Function + OpenRouter**. The map still loads static GeoJSON (plus published Supabase rows when configured).

Related docs: [`REQUIREMENTS.md`](./REQUIREMENTS.md), [`UML.md`](./UML.md), [`SCALABILITY.md`](./SCALABILITY.md), [`IMPLEMENTATION.md`](./IMPLEMENTATION.md), [`TRACEABILITY.md`](./TRACEABILITY.md).

### Why MapLibre + OpenFreeMap

- **MapLibre** is an open-source WebGL map engine with first-class vector tiles, pan/zoom, and native `fill-extrusion` 3D buildings (no Three.js).
- **OpenFreeMap** provides a free, attribution-friendly hosted style (`/styles/liberty`) so we do not need a tile server or API key for the hackathon foundation.

### Alternatives considered (map)

| Option | Trade-offs vs chosen approach | Why not now |
| --- | --- | --- |
| Mapbox GL JS | Strong tooling; proprietary token/licence cost | Token/licence friction for a civic hackathon demo. |
| Leaflet + raster tiles | Simpler 2D; weaker extrusion story | Poor fit for pitch/3D building requirement already met by MapLibre. |
| Google Maps | Familiar DX; closed ecosystem / billing | Compliance and billing surface outweigh benefits here. |
| Three.js building meshes | Full 3D control; high complexity | Duplicates MapLibre extrusion; risks inventing geometry. |
| Self-hosted tiles | Control; ops cost | Unnecessary for current scope and traffic assumptions. |

### Backend / assistant trade-offs

| Choice | Maintainability | Testability | Scalability | Complexity | Requirements fit |
| --- | --- | --- | --- | --- | --- |
| **Supabase + RLS + RPC (chosen)** | One managed backend; SQL policies colocated | Unit contract tests + manual RLS SQL | Scales with Supabase plan; write caps in RPC | Medium (SQL + client wrappers) | Matches private feedback + admin auth without custom server |
| Custom Express/Nest API | Full control | Easy local mocks | You own horizontal scale | Higher ops + auth duplication | Rejected: duplicates Auth/RLS and expands attack surface |
| **Edge Function + OpenRouter (chosen)** | Keeps LLM key off browser; one function | Pure TS validators unit-tested; live LLM manual | Bound by OpenRouter + doc fetch; soft in-memory rate limit | Medium | Satisfies F-AI-02/03 without a second LLM stack |
| Browser-direct OpenRouter | Simple | Hard to protect key | Key abuse risk | Low | Violates N-SEC-01 |
| Full vector RAG | Stronger retrieval at scale | Heavier fixtures | Needs index infra | High | Explicitly deferred; allowlisted fetch + keywords suffice for current records |

For this application (map-first civic explorer with a small curated record set), the selected stack optimizes **time-to-correctness** and **secret handling** over premature distributed infrastructure.

### Module boundaries

```
src/
  components/layout/   # chrome that is not the map canvas
  components/map/      # MapLibre lifecycle, extrusions, map chrome styles
  data/                # static location / config (no network geocoding)
  styles/              # design tokens + global resets
  types/               # shared TypeScript contracts
```

`MapView` owns map create/destroy and load/error state. Camera constants live in `data/mapLocation.ts`. Building extrusion setup lives in `components/map/buildingExtrusion.ts`. Navigation handler wiring lives in `components/map/cameraNavigation.ts`.

The floating location chip updates from OpenMapTiles `place` features near the map centre (`placeLabel.ts`) on `moveend` — no separate geocoding API. Coverage depends on what OSM/OpenMapTiles includes for that area.

## Municipal records (Commits 05 / 05.5)

| Concern | Location |
| --- | --- |
| Generalized types | `src/types/municipalRecord.ts` |
| Static GeoJSON source | `src/data/municipalRecords.json` (not a live feed) |
| Adapter + validation report | `src/data/geojson/adaptMunicipalGeoJson.ts` |
| Collection + curated merge-by-id | `src/data/decisions/index.ts` |
| Marker rendering | `src/components/map/DecisionMarkerLayer.tsx` |
| Selection state | `MapPage` (`selectedRecord`, ward, nearby, assistant) |
| Selected-record preview panel | `src/components/records/SelectedRecordPreview.tsx` |

The preview panel is data-driven from `MunicipalRecord` via `buildRecordPreviewSections` — no city-specific copy in the component. Empty fields are omitted; impacts and uncertainties stay separate; municipal `projectStatus` is shown apart from participation availability.

## Toronto wards (Commit 05.6)

| Concern | Location |
| --- | --- |
| Source GeoJSON (25 MultiPolygons) | `src/data/wards.geojson` |
| Static asset URL (not inlined in JS) | `src/data/wards/wardsAsset.ts` (`?url`) |
| Association resolver (exact decision IDs) | `src/data/wards/resolveWardRecords.ts` |
| MapLibre source/layers + feature-state | `src/components/map/wardLayers.ts`, `WardLayer.tsx` |
| Ward selection panel | `src/components/wards/SelectedWardPanel.tsx` |

Ward polygons use `role: navigation_boundary_not_impact_area`. They are discovery boundaries only — never project impact areas. Associations use exact `decision_ids` ↔ municipal record ids (Ward 7 → Apted, Ward 12 → Wychwood; others empty).

Status fields stay separate: `decisionStatus`, `projectStatus` (source `status`), `decisionStage`, `participationAvailability`, and `gisSourceStatus`. Participation is never inferred from pending decisions or GIS “Complete”.

Markers iterate `MUNICIPAL_RECORDS` (HTML markers; fine for the current static set). To add another dataset, place a FeatureCollection JSON under `src/data/`, run it through `adaptMunicipalFeatureCollection`, and merge into the collection — do not hardcode features in the marker layer. Locations are representative points only.

## Additional Open Data (Commit 05.8)

| Concern | Location |
| --- | --- |
| Park facility projects adapter | `src/data/parks/adaptParkFacilityProjects.ts` |
| Projects GeoJSON asset URL | `src/data/parks/parkProjectsAsset.ts` |
| MapLibre circle layer | `src/components/map/ParkProjectLayer.tsx`, `parkProjectLayers.ts` |
| Ward Open Data name meta | `src/data/wardOfficialMeta.json`, `wardOfficialMeta.ts` |
| Notice 8007 local snapshot | `src/data/notice8007.html` (linked from curated enrichment) |

Park projects reuse `MunicipalRecord` with `dataOrigin: 'open_data'` and `recordType: park_facility_project`. They are not merged into `MUNICIPAL_RECORDS` HTML markers; the map loads them separately and skips `globalid` overlaps with existing municipal evidence.

## Elevated camera and navigation (Commit 03)

MapLibre camera terms:

| Property | Meaning |
| --- | --- |
| `center` | Lon/lat the camera looks toward |
| `zoom` | Scale level |
| `pitch` | Tilt in degrees (0 = top-down; higher = more horizon) |
| `bearing` | Rotation in degrees clockwise from north |

Home framing (pitch/bearing/zoom/limits) is centralized in `MAP_VIEWPORT`. After map load, `requestBrowserLngLat` may replace the home **centre** with the device location; reset uses that home. If geolocation is denied or unavailable, home stays at the Kennedy/Danforth case-study centre (`CASE_STUDY_CENTER`).

`configureMapNavigation` enables pan, scroll zoom, drag-rotate, keyboard, touch zoom/rotate, and `touchPitch` once per map instance. Floating `CameraControls` call `MapCameraApi` (`easeZoomBy` / `easeToHomeCamera`) on the same instance. Gesture rotate/pitch remain available on the canvas.

## Location search

| Concern | Location |
| --- | --- |
| Query validation | `src/data/geocoding/validateQuery.ts` |
| Photon client + cache | `src/data/geocoding/photon.ts` |
| Search UI (combobox) | `src/components/layout/LocationSearch.tsx` |
| Camera fly-to | `MapCameraApi.flyToLocation` → `flyToLocation` in `cameraNavigation.ts` |

Search uses the existing MapLibre instance only. Debounced typing (and Enter / Search) fetches Canadian-biased suggestions; selecting a result calls `flyTo` with elevated pitch/bearing preserved.

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

Liberty already defines `building-3d`. CivicSync **refines** that layer’s paint (limestone colour, opacity, coalesce for missing heights) and only **adds** the layer if it is absent — never duplicates.

Missing height handling: `coalesce(to-number(render_height), 0)` / same for `render_min_height`. Zero height means no invented storeys.

Extrusions remain geographically aligned during pitch/bearing changes because they are MapLibre `fill-extrusion` layers on the vector tile footprints. Flat `building` fill in the style only runs through zoom 14; extrusions take over from zoom 14+.

## Supabase foundation

| Concern | Location |
| --- | --- |
| SQL migration + RLS | `supabase/migrations/20261114000000_backend_foundation.sql` |
| Resident feedback RPC | `supabase/migrations/20261114010000_resident_feedback_submission.sql` |
| Browser client (anon key) | `src/lib/supabase/client.ts` |
| Row ↔ MunicipalRecord mapping | `src/lib/supabase/municipalRecordMapper.ts` |
| Feedback form gating rule | `src/lib/feedback/feedbackAvailability.ts` |
| Resident feedback form | `src/components/records/ResidentFeedbackForm.tsx` |
| Admin feedback inbox | `src/pages/AdminFeedbackPage.tsx` |
| Operator docs | `docs/SUPABASE.md` |

Admin privileges live in `admin_users` and are checked via `is_admin()`. Clients cannot self-assign admin. Feedback rows stay private; public intake uses `submit_resident_feedback` (SECURITY DEFINER) rather than direct table inserts. Administrators manage submissions at `/admin/feedback` under the same RLS policies.

Routing uses `react-router-dom`. Public map is `/`. Admin login is `/admin/login`. `/admin` lists proposals; `/admin/feedback` is the inbox; `/admin/proposals/new` and `/admin/proposals/:id` edit proposals. All `/admin/*` management routes are wrapped by `AdminRoute` (session + `is_admin()`). Writes go through `municipal_records` / `feedback_submissions` and remain subject to RLS.

## Municipal research assistant (AI Commit 1)

Guided “Explore this area” research uses **OpenRouter via a Supabase Edge Function** — not a separate Express backend and not browser-held API keys.

| Concern | Location |
| --- | --- |
| Area context pack (ward + nearby reuse) | `src/lib/assistant/buildResearchContext.ts` |
| Response validation + history trim | `src/lib/assistant/validateAssistantResponse.ts` |
| Official URL allowlist (SSRF) | `src/lib/assistant/allowedSourceUrl.ts` |
| Lightweight passage ranking | `src/lib/assistant/rankPassages.ts` |
| Frontend invoke helper | `src/lib/assistant/assistantApi.ts` |
| Edge Function + evidence fetch | `supabase/functions/municipal-research-assistant/` |
| Map panel UX | `src/components/assistant/ResearchAssistantPanel.tsx` |
| Entry points | Ward panel + Nearby panel → `MapPage` |

Conversation history stays in **client session state** for this version. The Edge Function retrieves **only allowlisted official source URLs** already associated with selected municipal records (HTML + best-effort text PDFs), ranks passages with keyword scoring, and supplies them to the existing OpenRouter call. Residents can ask free-text follow-ups, choose a response language, request concise/detailed answers, and generate a structured **research brief** (`mode: research_brief`). Suggested prompts are optional. Comparisons are allowed only when evidence exists; otherwise `comparisonNote` explains the gap. There is still no unrestricted crawling, embeddings, or vector DB. Proximity is never treated as proof of impact. Server secrets: `OPENROUTER_API_KEY` (required), `OPENROUTER_MODEL` (optional).

## Current limitations

- Admin login, proposal draft/publish, published map sync, resident feedback submission, and the administrator feedback inbox exist. Live production smoke tests and Docker-backed RLS scripts are manual (see `docs/DEPLOYMENT.md`).
- Evidence retrieval is allowlisted-host + keyword ranking only; scanned PDFs, oversized files, and non-approved hosts are skipped rather than crawled.
- Research briefs omit unsupported sections and demote uncited “documented facts”.
- Multilingual answers are limited to the supported language list; official excerpts stay in their original wording when cited.
- Building heights exist only where OpenMapTiles provides `render_height`. Many footprints may be low or zero.
- Tile availability depends on the public OpenFreeMap service.
- Live Postgres RLS scripts require local Supabase and are not part of default `npm test`.
