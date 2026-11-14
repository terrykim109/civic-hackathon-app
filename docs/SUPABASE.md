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
| Status banner | `src/components/map/MapRecordsStatus.tsx` |

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
