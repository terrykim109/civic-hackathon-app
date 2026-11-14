# Supabase backend foundation

CivicSync uses **Supabase PostgreSQL + Auth + RLS** for persistent municipal records and private resident feedback. There is no Express server.

The public map still reads static GeoJSON in this increment. Wiring published rows into MapLibre is a later step.

## Tables

| Table | Purpose |
| --- | --- |
| `municipal_records` | Municipal proposals/notices. `publication_status` is CivicLens visibility (`draft` / `published` / `archived`). Nested MunicipalRecord fields live in JSONB (`record` is canonical). |
| `feedback_submissions` | Resident comments linked to a municipal record. Admin-only. |
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
