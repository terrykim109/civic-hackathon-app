# Debugging and validation

## 1. Independent review performed

While preparing the software-engineering documentation set, the repository was reviewed against the live tree (not prompt assumptions). Findings and actions:

| Finding | Action |
| --- | --- |
| README linked `docs/DATA_METHODOLOGY.md` but the handoff file lived at `src/data/DATA_METHODOLOGY .md` (filename includes a space). | Added `docs/DATA_METHODOLOGY.md` pointer; fixed README docs index. |
| `docs/ARCHITECTURE.md` still said selection state lived in `App`. | Corrected to `MapPage`. |
| `docs/SUPABASE.md` still referenced removed `MapRecordsStatus.tsx`. | Updated to match current status surfacing. |
| Rubric coverage gaps (requirements IDs, UML, scalability evidence, RTM, AI disclosure). | Added docs listed below — content derived from code/constants/migrations. |
| No failing unit tests observed on this pass. | No production-logic hotfix required for green CI scripts. |

AI-assisted patches from prior feature work remain subject to the same review rule: validators, allowlists, and RLS/RPC boundaries are treated as source of truth over model prose.

## 2. Commands run (this validation pass)

Executed on the local Windows workspace for this repository:

| Command | Exit code | Result |
| --- | --- | --- |
| `npm run typecheck` | **0** | TypeScript project build succeeded |
| `npm run lint` | **0** | ESLint reported no problems |
| `npm test` | **0** | Vitest: **45** files, **192** tests passed |
| `npm run build` | **0** | `tsc -b && vite build` succeeded; client bundle emitted under `dist/` |

Observed production build assets (evidence for N-PERF-01):

- `dist/assets/wards-Dagbxc9b.geojson` — **2,572.75 kB**
- `dist/assets/park-and-recreation-facility-projects-CjT41pX2.geojson` — **265.10 kB**
- Main JS chunk ~1.73 MB (minified; warning about >500 kB emitted by Vite)

## 3. What automated tests do and do not cover

**Covered (unit / contract):** adapters, haversine/nearby, feedback validation/RPC wrappers, proposal CRUD wrappers, RLS policy contract strings, assistant context/validation/ranking/SSRF URL rules, language normalization, workflow route contracts.

**Not covered by `npm test`:** live MapLibre rendering, live Photon/OpenFreeMap/OpenRouter network calls, deployed Edge Function integration, and `supabase/tests/rls_security.sql` against a running Postgres (manual).

## 4. Meaningful documentation modifications

Created/updated under `docs/`:

- `REQUIREMENTS.md`, `UML.md`, `SCALABILITY.md`, `IMPLEMENTATION.md`, `TRACEABILITY.md`, `REFERENCES.md`, `VALIDATION.md`, `DATA_METHODOLOGY.md`
- Updates to `ARCHITECTURE.md`, `SOURCES.md`, `SUPABASE.md`, and root `README.md`

No speculative “tests passed” claims are made beyond the command table above.

## 5. Remaining gaps / assumptions

- No production APM or load-test numbers — scalability conclusions marked estimate vs observed.
- Manual smoke still required after Edge Function deploy (`OPENROUTER_API_KEY` secret) and after remote `db push` of migrations.
- Accessibility is attribute-level only; no automated WCAG suite.
- Data methodology counts in the handoff file should be re-confirmed against committed GeoJSON if used for marking.
