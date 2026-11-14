# Implementation notes

This document explains **what exists today** versus **proposed improvements**. It follows the repository structure rather than an assumed ideal layout.

## 1. Runtime topology (existing)

| Component | Responsibility | Key dependencies | Limitations |
| --- | --- | --- | --- |
| `src/App.tsx` | Routes + `AuthProvider` | `react-router-dom` | Admin routes only; public map is `/`. |
| `src/pages/MapPage.tsx` | Public map UX state: selection, nearby, assistant | MapView, panels, `useMapMunicipalRecords`, `buildResearchContext` | Conversation/assistant state is page-local. |
| `src/components/map/*` | MapLibre lifecycle, wards, markers, parks, camera | `maplibre-gl`, static assets | Tile/network dependent. |
| `src/data/*` | Static datasets, adapters, geocoding client | Photon HTTP, GeoJSON assets | Not a live municipal sync pipeline. |
| `src/lib/proposals/*` | Admin CRUD + published fetch/adapt | Supabase client | Requires configured project. |
| `src/lib/feedback/*` | Availability gating, submit, admin inbox, CSV | RPC + RLS | Server rules must stay aligned with UI. |
| `src/lib/assistant/*` | Context pack, validation, language, ranking helpers | Supabase `functions.invoke` | No browser-side OpenRouter key. |
| `supabase/functions/municipal-research-assistant/` | Auth gate, evidence fetch, OpenRouter, response grounding | Deno, OpenRouter, allowlisted HTTPS | In-memory rate limit/cache per isolate. |
| `supabase/migrations/*` | Schema, RLS, feedback RPC, rate-limit hardening | Postgres | Live RLS SQL tests are manual. |

## 2. Important implementation choices (existing)

### No Express backend
Persistent and privileged operations go through Supabase (PostgREST + RPC + Edge Functions). Chosen to reduce ops surface for a map-first civic demo while keeping secrets off the client.

### Status fields stay separate
`MunicipalRecord` keeps `decisionStatus`, `projectStatus`, `decisionStage`, `participationAvailability`, and `gisSourceStatus` distinct. Participation is never inferred from GIS “Complete” or pending decisions (`feedbackAvailability.ts`, adapters).

### Geography is discovery, not impact
Wards are `navigation_boundary_not_impact_area`. Nearby distances are straight-line Haversine (`lib/geo/haversine.ts`) with explicit disclaimers in UI (`NearbyProposalsPanel`, assistant proximity note).

### Assistant evidence is allowlisted, not RAG-indexed
Evidence URLs come from record `sources` / `evidence` / related processes. Server fetch uses host allowlist + SSRF checks; ranking is keyword-based (`rankPassages.ts` / Edge `evidence.ts`). No embeddings/vector store.

### Dual validation for assistant JSON
Edge Function validates/grounds citations against retrieved hrefs; client `validateAssistantResponse` re-checks structure. Research briefs demote uncited “documented facts”.

## 3. Existing vs proposed

| Area | Existing | Proposed (not implemented) |
| --- | --- | --- |
| Map data | Static GeoJSON + published merge | Live municipal API sync / incremental tile-hosted features |
| Feedback abuse controls | RPC rate limits + honeypot | Distributed rate limiting / CAPTCHA |
| Assistant memory | Client session history | Durable conversation store (optional, privacy-reviewed) |
| Assistant retrieval | Allowlisted fetch + keyword passages | Embeddings / vector RAG (explicitly deferred) |
| Edge abuse controls | Per-isolate Map rate buckets | Shared Redis/Upstash style limiter |
| Ward geometry | Full 25-ward GeoJSON asset | Simplified boundaries / on-demand load |
| i18n | Assistant response languages | Full SPA localization |

## 4. Dependency direction (existing)

```
pages → components → lib/data/types
components/map → maplibre + data assets
lib/assistant → types + nearby/ward helpers → functions.invoke
Edge Function → OpenRouter + official HTTPS (not the Vite bundle)
```

Circular imports between map UI and assistant are avoided: `MapPage` constructs context and mounts the panel.

## 5. Known implementation caveats

- `docs/ARCHITECTURE.md` historically referred to selection state in `App`; selection now lives in `MapPage` (corrected in architecture updates).
- Bundled notice HTML (`notice8007.html`) is a local snapshot link, not fetchable by the Edge Function (filtered as non-https/local asset in context collection).
- Park projects can appear in ward lists without enabling resident feedback unless participation fields are open **and** the record is a published Supabase row.
