# Deployment readiness

CivicSync ships as a static Vite app on **Vercel** with **Supabase** for Auth, Postgres, and RLS. There is no Express server.

## Frontend (Vercel)

| Setting | Value |
| --- | --- |
| Framework | Vite (`vercel.json`) |
| Build | `npm run build` |
| Output | `dist` |
| SPA rewrites | `/(.*) → /index.html` |

### Environment variables (Vercel project)

Set **only**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Do **not** add `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, or any other server secret as a `VITE_*` variable. Those must never ship in the browser bundle.

## Supabase

1. Apply migrations in order under `supabase/migrations/` (`supabase db push` or hosted migration flow).
2. Confirm RLS is enabled on `municipal_records`, `feedback_submissions`, `admin_users`, and `feedback_rate_buckets`.
3. Create Auth users for administrators; insert their `auth.users.id` into `admin_users` with the service role (see `supabase/seed_admin.example.sql`).
4. Keep public signup disabled for production (`auth.email.enable_signup` / equivalent).
5. Auth redirect / site URL: set the Supabase Auth **Site URL** and **Redirect URLs** to the Vercel production origin (and preview origins if used). Email/password admin login uses the SPA origin; no OAuth redirect is required for the current flow.
6. Research assistant: set Edge Function secrets `OPENROUTER_API_KEY` (required) and optional `OPENROUTER_MODEL`, then deploy `municipal-research-assistant` (see `docs/SUPABASE.md`).

## Post-deploy smoke checklist (manual)

- [ ] `/` loads static wards + municipal markers.
- [ ] Admin can sign in at `/admin/login` and reach `/admin`.
- [ ] Non-admin Auth user is signed out / denied.
- [ ] Create draft → preview → publish; published marker appears on the public map.
- [ ] Archive removes the proposal from the public map merge (RLS + client filter).
- [ ] Resident feedback form appears only when participation fields say open.
- [ ] Feedback submit succeeds for a published open proposal; fails for draft/closed.
- [ ] `/admin/feedback` lists the submission; status update + CSV export work.
- [ ] Anonymous PostgREST SELECT on `feedback_submissions` returns empty/denied.
- [ ] “Explore this area” opens the research assistant; a guided turn returns without exposing OpenRouter keys in the network payload.
- [ ] Assistant citations resolve to allowlisted official municipal URLs associated with the selected records; invented links do not appear.

## Local live RLS

`supabase/tests/rls_security.sql` is **not** part of `npm test`. Run it against local Supabase after seeding admin/non-admin UUIDs (see comments in that file).
