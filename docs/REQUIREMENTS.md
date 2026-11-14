# Requirements — CivicSync / CivicLens

Requirements are derived from the implemented product surface (map explorer, Supabase persistence, feedback, research assistant) as of the current repository. Each ID is stable for traceability in [`TRACEABILITY.md`](./TRACEABILITY.md).

**Legend:** F = functional, N = non-functional. Priority: M = must (implemented or partially implemented), S = should (partial), C = could (future).

## 1. Functional requirements

### Map exploration

| ID | Requirement | Acceptance criteria | Edge cases |
| --- | --- | --- | --- |
| **F-MAP-01** | Residents can view a MapLibre map of Toronto using OpenFreeMap Liberty tiles. | `/` loads a map canvas; style URL resolves to OpenFreeMap Liberty; pan/zoom/pitch/bearing work. | Tile network failure shows map error/load handling without crashing the SPA. |
| **F-MAP-02** | 3D building extrusions use OpenMapTiles height fields only. | Extrusion layer uses `render_height` / `render_min_height` with coalesce to 0; missing heights are not invented. | Features with `hide_3d` remain excluded. |
| **F-MAP-03** | Municipal decision/project markers render from normalized `MunicipalRecord` data. | Markers appear for `MUNICIPAL_RECORDS` (static + published merge); selecting a marker opens the record preview. | Invalid coordinates are skipped by nearby/map helpers; empty description fields are omitted in preview. |
| **F-MAP-04** | Ward polygons are selectable navigation boundaries. | Clicking a ward opens `SelectedWardPanel`; associations use exact `decisionIds` only; UI states wards are not impact areas. | Wards with empty `decisionIds` show empty associated-record lists without inventing links. |
| **F-MAP-05** | Location search geocodes Canadian places and flies the camera. | Debounced Photon suggestions; selecting a result flies the map; results are CA-filtered. | Empty/invalid queries are rejected by `validateQuery`; Photon failure surfaces without blocking the map. |
| **F-MAP-06** | Nearby proposals list records within a selectable radius of a search origin. | After search, panel lists Haversine-filtered records (default 3 km; slider 0.5–5 km, 500 m steps); proximity disclaimer is visible. | Zero results show empty state; selecting a nearby item focuses the record without claiming impact. |
| **F-MAP-07** | Park facility projects from Open Data render separately and list by ward number. | Circle layer loads park GeoJSON; ward panel lists projects by `ward_number`; overlaps with curated `globalid`s are skipped. | Missing/unknown participation stays unknown; listing ≠ impact confirmation. |

### Proposals and feedback

| ID | Requirement | Acceptance criteria | Edge cases |
| --- | --- | --- | --- |
| **F-ADM-01** | Administrators can sign in and access admin routes only if listed in `admin_users`. | `/admin/*` behind `AdminRoute` + `is_admin()`; non-admins denied/signed out. | Public signup disabled; clients cannot self-insert into `admin_users`. |
| **F-ADM-02** | Administrators can create, edit, preview, publish, and archive municipal proposals. | Draft/publish/archive via `municipal_records.publication_status`; published rows merge onto public map. | Drafts remain private under RLS; archive removes from public merge. |
| **F-FB-01** | Residents can submit feedback only when participation fields indicate open intake and the record is published. | Form gated by `feedbackAvailability`; RPC `submit_resident_feedback` enforces published + open rules server-side. | Unpublished/static-only ids reject persistence; closed/unknown participation hides or rejects submit. |
| **F-FB-02** | Feedback submissions are private to administrators. | Anon cannot SELECT feedback rows; admins manage inbox at `/admin/feedback` with status updates + CSV export. | Rate limits: per-record 40/hour and per-client/record soft throttle (see migrations). |
| **F-PUB-01** | Public map merges static curated records with published Supabase records. | `useMapMunicipalRecords` merges; static ids win on collision; Supabase failure leaves static map available. | Missing env vars → static-only mode. |

### Research assistant

| ID | Requirement | Acceptance criteria | Edge cases |
| --- | --- | --- | --- |
| **F-AI-01** | Residents can open a guided research assistant for a selected ward or nearby search area. | “Explore this area” opens `ResearchAssistantPanel` with context from `buildResearchContext`. | Map remains usable; existing ward/nearby/record interactions preserved. |
| **F-AI-02** | Assistant calls OpenRouter only through a Supabase Edge Function; API key never ships in the browser. | Frontend uses `functions.invoke('municipal-research-assistant')`; no `VITE_OPENROUTER_*`; secrets documented as server-side. | Missing `OPENROUTER_API_KEY` → HTTP 503 with safe error message. |
| **F-AI-03** | Assistant answers use supplied municipal records and allowlisted official document retrieval only. | Evidence fetch limited to approved host suffixes; SSRF blocks private IPs/localhost; keyword passage ranking (no vector DB). | Unsupported/oversized/timeout docs → partial/unavailable evidence status without inventing content. |
| **F-AI-04** | Responses are structured and validated before UI use. | JSON includes message, options, citations, evidenceStatus; client/server validators drop invented citation hrefs. | Malformed model JSON → 502 / client error; conversation history truncated (max 16 turns). |
| **F-AI-05** | Residents can generate an evidence-based research brief and continue asking free-text follow-ups. | `mode: research_brief` returns validated `researchBrief` sections; conversation stays open; free-text is primary. | Empty brief payload falls back to uncertainties note; unsupported documented facts demoted. |
| **F-AI-06** | Residents can select a supported response language and concise/detailed answers. | Language codes `en|fr|zh|es|pt|ta|pa|ar`; glossary + detailedExplanation supported; official excerpts marked original. | Unknown language normalizes to `en`; comparison without evidence sets `comparisonNote`. |

## 2. Non-functional requirements

| ID | Requirement | Acceptance criteria | Measurable notes |
| --- | --- | --- | --- |
| **N-SEC-01** | Secrets stay server-side. | No service-role or OpenRouter keys in `VITE_*` or production JS bundle. | Verified by code review + bundle string scan practice in AI commits. |
| **N-SEC-02** | Public write paths are abuse-resistant. | Feedback honeypot + rate limits; assistant in-memory rate limit 12 req / 60s / client+IP key. | Limits are best-effort (Edge memory is per-isolate; not a global distributed limiter). |
| **N-SEC-03** | Data access is RLS-enforced. | Policies on `municipal_records`, `feedback_submissions`, `admin_users`; contract tests in `rlsPolicyContract.test.ts`. | Live SQL RLS suite is manual (`supabase/tests/rls_security.sql`). |
| **N-REL-01** | Static map works without Supabase. | App boots and shows static wards/records when env unset. | Published sync and assistant require configuration. |
| **N-PERF-01** | Large GeoJSON assets are not inlined into the main JS bundle. | Wards and park projects loaded via Vite `?url` asset URLs. | Observed build emits separate `.geojson` assets under `dist/assets/`. |
| **N-PERF-02** | Assistant document fetch has size/timeout bounds. | Max 4 docs/turn, 1.5 MB/doc, 8 s timeout, 40-entry TTL cache (30 min). | Values from `evidence.ts` constants. |
| **N-QA-01** | Automated unit tests and production build are runnable locally. | `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` succeed on a clean tree. | Results recorded in [`VALIDATION.md`](./VALIDATION.md). |
| **N-ACC-01** | Map UI panels expose accessible labels/status for key actions. | Dialogs use `aria-*`; live regions announce selection/assistant status on `MapPage`. | Not a full WCAG audit; limited to implemented attributes. |
| **N-I18N-01** | Assistant responses honor selected language from a fixed supported set. | `normalizeAssistantLanguage` + Edge prompt; UI language select. | Full UI chrome remains English. |

## 3. Out of scope (explicit non-goals in current code)

- Unrestricted web crawling / general search RAG / vector databases.
- Separate Express/Node API server.
- Multilingual translation of the entire SPA chrome.
- Guaranteeing that nearby/ward-associated proposals affect a resident.
- Live municipal API sync replacing static GeoJSON.
- Distributed rate limiting across all Edge isolates.

## 4. Traceability

See [`TRACEABILITY.md`](./TRACEABILITY.md) for requirement → design → code → test mapping.
