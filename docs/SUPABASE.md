# Supabase backend foundation

CivicSync uses **Supabase PostgreSQL + Auth + RLS** for persistent municipal records and private resident feedback. There is no Express server.

## Tables

| Table | Purpose |
| --- | --- |
| `municipal_records` | Municipal proposals/notices. `publication_status` is CivicLens visibility (`draft` / `published` / `archived`). Nested MunicipalRecord fields live in JSONB (`record` is canonical). |
| `feedback_submissions` | Resident comments linked to a municipal record. Direct table access is admin-only. |
| `feedback_rate_buckets` | Private spam-throttle counters for the submit RPC. No client access. |
| `admin_users` | Allow-list of Auth user IDs with administrator privileges. |

Relationships: `feedback_submissions.municipal_record_id → municipal_records.id`. `admin_users.user_id → auth.users.id`.

## Environment

Copy [`.env.example`](../.env.example) to `.env.local`:

- `VITE_SUPABASE_URL` — project URL  
- `VITE_SUPABASE_ANON_KEY` — **anon** key only  

Never put the **service role** key in `VITE_*` variables or frontend bundles.

## Local setup

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli).
2. From the repo root:

```bash
npx supabase start
npx supabase db reset
```

3. Create an Auth user in Studio (`http://localhost:54323`).
4. Grant admin (service role / SQL editor) using [`supabase/seed_admin.example.sql`](../supabase/seed_admin.example.sql).

## Feedback availability (application rule)

Do **not** add an `enable_feedback` column. Use `src/lib/feedback/feedbackAvailability.ts`:

- `participationAvailability === 'open'`
- `canParticipateNow === true`
- deadlines / `opensOn` respected when present
- missing or ambiguous participation data → form **unavailable**

CivicLens collection is distinct from official municipal consultation.

## Tests

| Suite | Command | Requires |
| --- | --- | --- |
| Unit + RLS contract | `npm test` | Node only |
| Live RLS SQL | `psql … -f supabase/tests/rls_security.sql` | Local Supabase + seeded Auth UUIDs |

Default CI / `npm test` does **not** start Postgres. Do not treat live RLS SQL as passed unless you ran it locally.

## Admin provisioning

Administrators cannot self-register. Insert into `admin_users` only with the service role. Client RLS denies all `admin_users` mutations for `anon` / `authenticated`.

## Administrator authentication (Commit 2)

| Concern | Location |
| --- | --- |
| Auth context + session | `src/auth/AuthProvider.tsx` |
| Admin check (`is_admin` RPC → `admin_users`) | `src/auth/verifyAdmin.ts` |
| Route gate helper | `src/auth/adminGate.ts` |
| Login page | `/admin/login` → `src/pages/AdminLoginPage.tsx` |
| Protected landing | `/admin` → `src/pages/AdminHomePage.tsx` |
| Top-right nav | `src/components/auth/AuthNav.tsx` |

There is no `user_roles` table in this project. Administrator membership is the `admin_users` allow-list, exposed to the client only through `public.is_admin()` (SECURITY DEFINER). JWT metadata is never trusted for privileges.

Public signup remains disabled (`auth.email.enable_signup = false`). Email/password sign-in is enabled for provisioned accounts only.

## Proposal management (Commit 3)

| Concern | Location |
| --- | --- |
| List + filters | `/admin` → `src/pages/AdminHomePage.tsx` |
| Create / edit / preview / publish | `/admin/proposals/new`, `/admin/proposals/:id` |
| Form ↔ MunicipalRecord | `src/lib/proposals/proposalForm.ts` |
| Validation | `src/lib/proposals/validateProposal.ts` |
| Supabase CRUD | `src/lib/proposals/proposalApi.ts` |

New proposals default to `publication_status = draft`. Publishing writes `published` on the same `municipal_records` row. There is no second proposal model and no separate feedback-enable toggle — participation fields on `MunicipalRecord` remain authoritative.

## Public map sync (Commit 4)

| Concern | Location |
| --- | --- |
| Fetch published rows (anon client) | `src/lib/proposals/fetchPublishedRecords.ts` |
| Safe row → MunicipalRecord adapter | `src/lib/proposals/adaptPublishedRecord.ts` |
| Map data hook | `src/data/useMapMunicipalRecords.ts` |
| Map data hook status | Surfaced via `MapPage` / screen-reader status (dedicated banner removed) |

The public map merges bundled `MUNICIPAL_RECORDS` with published Supabase rows. Static ids win on collision. Draft/archived rows are filtered client-side and blocked by RLS. If Supabase is unset or the request fails, the static map remains available and failures are surfaced (not treated as an empty success).

## Resident feedback submission (Commit 5)

| Concern | Location |
| --- | --- |
| UI gating from participation fields | `src/lib/feedback/feedbackAvailability.ts` |
| Form in selected-record panel | `src/components/records/ResidentFeedbackForm.tsx` |
| Client validation + RPC wrapper | `src/lib/feedback/validateFeedbackSubmission.ts`, `submitResidentFeedback.ts` |
| Server validation / insert | `public.submit_resident_feedback` in `supabase/migrations/20261114010000_resident_feedback_submission.sql` |

Public clients never insert into `feedback_submissions` directly. Submissions go through the SECURITY DEFINER RPC, which:

1. Validates comment / optional fields server-side (length + email format).
2. Requires a **published** municipal record that currently accepts feedback (same participation rules as the UI).
3. Applies a honeypot + per-client/record rate limit (5 / hour).
4. Stores `review_status = 'new'` with `created_at` timestamps.

RLS still denies anon SELECT/UPDATE/DELETE on `feedback_submissions`. Authenticated non-admins are blocked by `is_admin()` policies. Public intake remains the SECURITY DEFINER RPC only.

## Administrator feedback management (Commit 6)

| Concern | Location |
| --- | --- |
| Inbox UI | `/admin/feedback` → `src/pages/AdminFeedbackPage.tsx` |
| List / status update API | `src/lib/feedback/feedbackAdminApi.ts` |
| CSV export | `src/lib/feedback/exportFeedbackCsv.ts` |

Administrators load and update `feedback_submissions` through the authenticated Supabase client. Access depends on existing RLS (`feedback_submissions_admin_select` / `_update` + `is_admin()`), not a second auth system. The inbox can filter by proposal id and review status, open the linked proposal editor, and export the filtered rows as CSV (with formula-injection escaping). Contact fields stay private to the admin UI.

## Rate limiting

`submit_resident_feedback` applies:

1. **Per-record** cap (40 / hour) — not bypassable by rotating `p_client_key`.
2. **Per-client/record** soft throttle (5 / hour) — best-effort against casual repeats.
3. Honeypot field rejection.

See `supabase/migrations/20261114020000_feedback_rate_limit_hardening.sql`. Deployment steps: [`docs/DEPLOYMENT.md`](./DEPLOYMENT.md).

## Municipal research assistant (OpenRouter)

| Concern | Location |
| --- | --- |
| Edge Function | `supabase/functions/municipal-research-assistant/` |
| Browser invoke | `src/lib/assistant/assistantApi.ts` → `functions.invoke` |
| Context construction | `src/lib/assistant/buildResearchContext.ts` |

There is still **no Express backend**. The OpenRouter API key is a **Supabase secret**, never a `VITE_*` value.

### Configure secrets

```bash
npx supabase secrets set OPENROUTER_API_KEY=sk-or-...
npx supabase secrets set OPENROUTER_MODEL=openai/gpt-4.1-mini
```

`OPENROUTER_MODEL` is optional (defaults to `openai/gpt-4.1-mini` in the function).

### Deploy the function

```bash
npx supabase functions deploy municipal-research-assistant
```

`config.toml` sets `verify_jwt = false` so unauthenticated map visitors can call with the project anon key. The function still requires an `Authorization` bearer token (anon JWT or user session), applies an in-memory per-client rate limit, validates request size/history length, and validates model JSON before returning it.

Conversation history is **client session state** only for this version — no assistant conversation table.

### Evidence retrieval (AI Commit 2)

The same Edge Function fetches official documents server-side from URLs already present on selected municipal records (`sources`, `evidence`, `relatedProcesses`, `officialSourceUrl`).

Guards:

- HTTPS only on approved municipal host suffixes (`toronto.ca`, `ontario.ca`, `gov.on.ca`, `canada.ca`, `gc.ca`)
- SSRF blocks for localhost / private IPs / credentialed URLs / raw IPs
- Document size, timeout, and content-type limits; in-memory response cache
- Manual single-hop redirects only when the target remains allowlisted
- Model citations are filtered to retrieved/allowlisted hrefs (no invented links)

Unsupported / inaccessible documents are reported in the evidence pack as partial/unavailable rather than failing the whole turn when OpenRouter still responds.

### Research briefs (AI Commit 3)

Request body may include `mode: "research_brief"`. The function reuses the same evidence retrieval + OpenRouter path and returns a validated `researchBrief` object with sectioned findings (`documented_fact` / `potential_impact` / `hypothetical` / `uncertainty`). Citations are filtered to retrieved/allowlisted hrefs. Incomplete model briefs fall back to an uncertainties section rather than inventing content. `conversationComplete` stays false after a brief so residents can ask follow-up questions.

### Interactive / multilingual turns (AI Commit 4)

Request body also accepts:

- `language` — supported codes: `en`, `fr`, `zh`, `es`, `pt`, `ta`, `pa`, `ar`
- `detailLevel` — `concise` (default) or `detailed`

Responses may include `glossary`, `detailedExplanation`, and `comparisonNote`. Free-text questions are first-class; `options` remain optional suggestions only.
