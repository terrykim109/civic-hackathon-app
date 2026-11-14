# CivicSync

Map-first municipal decision explorer.

## Technology

| Package | Version | License |
| --- | --- | --- |
| React | 19.3.1 | MIT |
| React DOM | 19.3.1 | MIT |
| MapLibre GL JS | 6.18.0 | BSD-3-Clause |
| Lucide React | 1.72.0 | ISC |
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

Optional backend (Supabase) env vars are listed in [`.env.example`](.env.example). The map UI does not require them yet. See [`docs/SUPABASE.md`](docs/SUPABASE.md).

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
- Municipal markers load from the static `src/data/municipalRecords.json` FeatureCollection (not a live feed); the detail panel is a preview only.
- Toronto ward boundaries load from `src/data/wards.geojson` as navigation polygons (not impact areas).
- Record locations are representative points, not surveyed parcels or impact boundaries.
- Home camera uses browser geolocation when allowed; otherwise the Kennedy/Danforth case-study focus.
- Map tiles require network access to OpenFreeMap.
- Supabase migrations define RLS for published records and private feedback; the public app is not yet wired to Supabase reads/writes.

## Data Documentation

See [Data Methodology](docs/DATA_METHODOLOGY.md)
for data sources, processing, field definitions,
validation results, and participation status checks.
## Attribution

See [`docs/SOURCES.md`](docs/SOURCES.md). Architecture notes: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Backend: [`docs/SUPABASE.md`](docs/SUPABASE.md).
