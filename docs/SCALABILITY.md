# Scalability analysis

This analysis uses **codebase evidence** and **stated assumptions**. Unless labeled **measured**, numbers are **estimates**, not load-test results. No production traffic metrics are available in-repo.

## 1. Current deployment shape

| Layer | Actual shape | Evidence |
| --- | --- | --- |
| Frontend | Static SPA (Vite → `dist/`) on Vercel-style hosting | `docs/DEPLOYMENT.md`, `npm run build` |
| Data (map) | Large static GeoJSON assets + small curated JSON | Build emits `wards-*.geojson` (~2.5 MB) and park projects (~265 KB) as separate assets |
| Backend | Supabase Postgres + Auth + RLS; Edge Function for assistant | `supabase/migrations/*`, `supabase/functions/municipal-research-assistant/` |
| External | OpenFreeMap tiles, Photon, OpenRouter, official municipal HTTPS | `docs/SOURCES.md`, Edge `evidence.ts` |

Assumption: single Supabase project; Edge Function scales by isolate; no custom CDN rules beyond host defaults.

## 2. Scenario A — More concurrent map viewers

**Scenario:** Public interest spike; many residents open `/` simultaneously.

| Concern | Cause in code | Likely bottleneck | Mitigation (existing / proposed) |
| --- | --- | --- | --- |
| Tile traffic | Every client loads OpenFreeMap Liberty / OpenMapTiles | External tile CDN capacity / rate limits | **Existing:** rely on OpenFreeMap CDN. **Proposed:** monitor attribution/usage; cache headers are host-controlled. |
| Initial asset download | Ward GeoJSON ~2.5 MB asset | Bandwidth for first paint of wards | **Existing:** separate asset URL (not inlined in JS). **Proposed:** simplify/compress ward geometry or progressive load. |
| Client CPU | MapLibre WebGL + markers + ward layers | Low-end devices | **Existing:** HTML markers for small curated set; park projects as circle layer. **Proposed:** cluster markers if record count grows large. |

**Estimate (not measured):** Tens to low hundreds of concurrent viewers is plausible for a static SPA + public tile CDN. Thousands concurrent would stress tile quotas and ward GeoJSON download more than Supabase, because the default public map path can run **without** Supabase (`N-REL-01`).

## 3. Scenario B — More published proposals + feedback

**Scenario:** Administrators publish many proposals; residents submit feedback.

| Concern | Cause in code | Likely bottleneck | Mitigation |
| --- | --- | --- | --- |
| Public read of `municipal_records` | Anon SELECT of published rows merged in `useMapMunicipalRecords` | Postgres row count + payload size | **Existing:** RLS filters publication status. **Proposed:** pagination/spatial query if records grow beyond “small curated + published” set. |
| Feedback writes | `submit_resident_feedback` SECURITY DEFINER | RPC + rate-limit table contention | **Existing:** per-record cap 40/hour; per-client/record soft throttle; honeypot (`20261114020000_feedback_rate_limit_hardening.sql`). |
| Admin inbox | Authenticated admin SELECT/UPDATE | Acceptable at hackathon scale | **Proposed:** indexes already implied by FKs; add list filters (already in UI) before sharding. |

**Estimate (not measured):** Feedback rate limits intentionally cap write bursts. They are **application-level**, not a guarantee against distributed attackers rotating IPs.

## 4. Scenario C — Research assistant usage grows

**Scenario:** Many residents click “Explore this area” and ask multi-turn questions.

| Concern | Cause in code | Likely bottleneck | Mitigation |
| --- | --- | --- | --- |
| OpenRouter cost/latency | Every turn calls chat completions | Provider rate/cost | **Existing:** history trim (16), user message max 1200 chars, temperature low. **Proposed:** stronger quotas, auth for heavy use. |
| Official document fetch | Up to 4 HTTPS fetches/turn, 1.5 MB, 8 s | Upstream municipal sites + Edge wall time | **Existing:** in-memory cache (40 entries, 30 min TTL), allowlist, redirect limits (`evidence.ts`). |
| Edge rate limit | `RATE_MAX = 12` / `RATE_WINDOW_MS = 60_000` in isolate memory | Soft abuse control only | **Existing:** per `clientKey` + `x-forwarded-for`. **Limitation:** not global across isolates; restart clears buckets. |
| Conversation storage | Client session state only | No server conversation DB growth | **Existing:** avoids DB scale for history. **Limitation:** no cross-device continuity. |

**Estimate (not measured):** Assistant throughput is dominated by OpenRouter latency and official-site fetch time, not by MapLibre. Cache helps repeat URLs within one isolate lifetime.

## 5. Bottleneck summary

1. **Largest static asset:** Toronto wards GeoJSON download on first ward render path.
2. **Assistant path:** OpenRouter + official document I/O + per-isolate rate limit weakness under multi-instance load.
3. **Feedback path:** Intentionally write-capped; DB scale is secondary at current data volume.
4. **Not a current bottleneck:** Express/Node app servers (none exist by design).

## 6. Distinguishing evidence types

| Claim type | Examples in this doc |
| --- | --- |
| **Measured / observed in repo** | Asset sizes from production build output; constants in `evidence.ts` / Edge index; feedback rate constants in SQL migration; test counts in `VALIDATION.md`. |
| **Estimated** | Concurrent viewer capacity; attacker bypass of soft rate limits; OpenRouter cost under viral load. |
| **Not available** | Production APM, p95 latency, real user metrics. |
