# CivicSync

Map-first municipal decision explorer — browse proposals on a 3D map, see nearby notices, leave feedback, and ask an evidence-grounded explorer assistant. Civic Hackathon a team of four: yunxi, aryan, aadya, terry

## Technology

| Package | Version | License |
| --- | --- | --- |
| React | 19.3.1 | MIT |
| React DOM | 19.3.1 | MIT |
| MapLibre GL JS | 6.18.0 | BSD-3-Clause |
| Lucide React | 1.72.0 | ISC |
| React Router | 7.x | MIT |
| @supabase/supabase-js | 2.x | MIT |
| Vite | 8.3.8 | MIT |
| TypeScript | 5.9.3 | Apache-2.0 |
| `@vitejs/plugin-react` | 6.3.0 | MIT |
| ESLint | 9.39.5 | MIT |
| Vitest | 3.2.7 | MIT |

Map style: [OpenFreeMap Liberty](https://tiles.openfreemap.org/styles/liberty).

## Setup

```bash
npm install
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`).

Optional backend (Supabase) env vars are listed in [`.env.example`](.env.example). Without them the static map still works. See [`docs/SUPABASE.md`](docs/SUPABASE.md) and [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Typecheck and create a production build |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | Run TypeScript project references |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest unit tests |

## Limitations

- 3D buildings use OpenMapTiles `render_height` only where present; missing heights are treated as 0 (not invented).
- Municipal markers load from the static `src/data/municipalRecords.json` FeatureCollection, merged with published Supabase `municipal_records` when configured.
- Toronto ward boundaries load from `src/data/wards.geojson` as navigation polygons (not impact areas).
- Record locations are representative points, not surveyed parcels or impact boundaries.
- Home camera uses browser geolocation when allowed; otherwise the Kennedy/Danforth case-study focus.
- Map tiles require network access to OpenFreeMap.
- Supabase RLS gates published public reads and admin writes; drafts/archived stay private. Resident feedback and the admin inbox require configured Supabase + provisioned admins.
- The guided research assistant requires a deployed `municipal-research-assistant` Edge Function plus server-side `OPENROUTER_API_KEY` (never a `VITE_*` variable).

## Documentation

| Doc | Purpose |
| --- | --- |
| [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) | Functional/non-functional requirements + IDs |
| [`docs/UML.md`](docs/UML.md) | Use-case, component, class, and sequence diagrams |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Architecture and technology trade-offs |
| [`docs/SCALABILITY.md`](docs/SCALABILITY.md) | Scale scenarios and bottlenecks |
| [`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md) | Component responsibilities vs proposed work |
| [`docs/TRACEABILITY.md`](docs/TRACEABILITY.md) | Requirements traceability matrix |
| [`docs/VALIDATION.md`](docs/VALIDATION.md) | Debugging/validation evidence |
| [`docs/REFERENCES.md`](docs/REFERENCES.md) | Dependencies, licences, AI disclosure |
| [`docs/DATA_METHODOLOGY.md`](docs/DATA_METHODOLOGY.md) | Pointer to Toronto data methodology handoff |
| [`docs/SOURCES.md`](docs/SOURCES.md) | Attribution |
| [`docs/SUPABASE.md`](docs/SUPABASE.md) | Backend operator notes |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Deployment checklist |
