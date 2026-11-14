# References, licences, and AI disclosure

## 1. Runtime and build dependencies

Versions recorded from `npm ls --depth=0` in this workspace:

| Package | Version | Licence | Role |
| --- | --- | --- | --- |
| react | 19.3.1 | MIT | UI |
| react-dom | 19.3.1 | MIT | DOM renderer |
| react-router-dom | 7.18.5 | MIT | SPA routing |
| maplibre-gl | 6.18.0 | BSD-3-Clause | Map engine |
| lucide-react | 1.72.0 | ISC | Icons |
| @supabase/supabase-js | 2.119.0 | MIT | Supabase client |
| vite | 8.3.8 | MIT | Bundler / dev server |
| typescript | 5.9.3 | Apache-2.0 | Types |
| @vitejs/plugin-react | 6.3.0 | MIT | React plugin |
| eslint | 9.39.5 | MIT | Lint |
| vitest | 3.2.7 | MIT | Unit tests |
| typescript-eslint | 8.72.2 | MIT | TS lint rules |

Exact installed versions can drift with lockfile updates; re-run `npm ls` before release notes.

## 2. External services and data sources

| Resource | URL | Use in product |
| --- | --- | --- |
| OpenFreeMap Liberty style | https://tiles.openfreemap.org/styles/liberty | Base map style |
| OpenMapTiles | https://openmaptiles.org/ | Vector schema / building heights |
| OpenStreetMap | https://www.openstreetmap.org/copyright | Underlying geographic data |
| MapLibre | https://maplibre.org/ | Rendering engine docs / licence |
| Photon (Komoot) | https://github.com/komoot/photon | Forward geocoding |
| City of Toronto Open Data | https://open.toronto.ca/ | Wards meta, park facility projects |
| Open Government Licence – Toronto | https://open.toronto.ca/open-data-licence/ | Open Data licence |
| Toronto public notices | https://secure.toronto.ca/nm/ | Notice sources in curated records |
| Supabase | https://supabase.com/docs | Auth, Postgres, RLS, Edge Functions |
| OpenRouter | https://openrouter.ai/docs | LLM provider for research assistant |
| Mermaid | https://mermaid.js.org/ | Diagram syntax in `docs/UML.md` |

Additional attribution and dataset notes: [`SOURCES.md`](./SOURCES.md), [`DATA_METHODOLOGY.md`](./DATA_METHODOLOGY.md).

## 3. Significant adaptations of external assets/code

| Item | Adaptation |
| --- | --- |
| OpenFreeMap Liberty `building-3d` | Paint refined locally; layer added only if missing (`buildingExtrusion.ts`) |
| City wards / park projects GeoJSON | Adapted into `MunicipalRecord` / ward meta; not rehosted as an API |
| Notice 8007 | Live URL retained; bundled HTML snapshot for offline verification |
| Supabase JS client patterns | Thin wrappers in `src/lib/supabase` and domain libs; RLS/RPC authored in SQL migrations |
| OpenRouter chat completions API | Called only from Edge Function with JSON-object responses + local validation |

No GPL map engine was adopted; MapLibre’s BSD-3-Clause licence is retained with on-map attribution enabled.

## 4. AI disclosure

Significant implementation and documentation assistance used **Cursor** agent tooling (Composer / Auto). Typical contributions:

- Scaffolding and iterative feature work (map layers, Supabase flows, research assistant, tests).
- Drafting and revising project documentation under `docs/`.

**Human review / validation applied:** generated and adapted code was checked against repository conventions, MapLibre/Supabase/OpenRouter constraints, and local `typecheck` / `lint` / `test` / `build` runs before acceptance. AI output was not treated as authoritative for licences, traffic benchmarks, or unverified municipal facts. Requirements and diagrams in this docs set were cross-checked against the current codebase rather than invented from prompts alone.

## 5. Related internal docs

| Doc | Contents |
| --- | --- |
| [`REQUIREMENTS.md`](./REQUIREMENTS.md) | Requirement IDs + acceptance criteria |
| [`UML.md`](./UML.md) | Design diagrams |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Architecture + trade-offs |
| [`SCALABILITY.md`](./SCALABILITY.md) | Scale scenarios + bottlenecks |
| [`IMPLEMENTATION.md`](./IMPLEMENTATION.md) | Component responsibilities |
| [`TRACEABILITY.md`](./TRACEABILITY.md) | RTM |
| [`VALIDATION.md`](./VALIDATION.md) | Debugging / test evidence |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Deploy checklist |
| [`SUPABASE.md`](./SUPABASE.md) | Backend operator notes |
