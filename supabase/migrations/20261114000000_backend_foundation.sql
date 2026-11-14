-- CivicSync / CivicLens backend foundation
-- Municipal records + feedback storage + admin authorization + RLS
--
-- Publication status (draft | published | archived) is CivicLens CMS state.
-- It is independent of municipal decisionStatus / projectStatus.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.publication_status as enum ('draft', 'published', 'archived');

create type public.feedback_review_status as enum (
  'new',
  'under_review',
  'reviewed'
);

-- ---------------------------------------------------------------------------
-- Administrator registry
-- Privileges are granted only via a trusted process (service role / SQL).
-- Authenticated users cannot insert or update their own admin row.
-- ---------------------------------------------------------------------------

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users (id) on delete set null,
  note text null,
  constraint admin_users_note_length check (note is null or char_length(note) <= 500)
);

comment on table public.admin_users is
  'Allow-list of Supabase Auth users who may manage municipal records and feedback. Provisioned only by the project team (service role).';

create index admin_users_created_at_idx on public.admin_users (created_at desc);

-- ---------------------------------------------------------------------------
-- Helper: is the current JWT subject an administrator?
-- SECURITY DEFINER so RLS on admin_users does not recurse.
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Municipal records
-- Canonical payload lives in `record` (MunicipalRecord JSON).
-- Scalar columns support indexing / filters without losing nested structure.
-- ---------------------------------------------------------------------------

create table public.municipal_records (
  id text primary key,
  publication_status public.publication_status not null default 'draft',

  title text not null,
  description text not null,
  municipality text not null,
  ward_id text null,
  category_raw text not null,
  category_kind text not null,
  record_type text not null,
  project_status text not null,
  gis_source_status text null,
  decision_status text not null,
  decision_stage text not null,

  participation_availability text not null,
  can_participate_now boolean null,
  participation_deadline text null,
  participation_method text null,
  participation_url text null,

  location_lng double precision not null,
  location_lat double precision not null,
  location jsonb not null,

  participation_options jsonb not null default '[]'::jsonb,
  events jsonb not null default '[]'::jsonb,
  potential_impacts jsonb not null default '[]'::jsonb,
  uncertainties jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  data_confidence jsonb null,
  related_processes jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '[]'::jsonb,

  last_verified text null,
  verification_method text null,
  official_source_url text null,
  geometry_source_url text null,
  geometry_source_record text null,
  gis_project_name text null,
  decision_body text null,
  agenda_item_id text null,
  published_date text null,
  decision_date text null,
  source_modified_date text null,
  source_feature_id text null,
  data_origin text not null,

  -- Full MunicipalRecord document for round-trip fidelity
  record jsonb not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references auth.users (id) on delete set null,
  updated_by uuid null references auth.users (id) on delete set null,

  constraint municipal_records_title_not_blank check (char_length(trim(title)) > 0),
  constraint municipal_records_lng_range check (location_lng between -180 and 180),
  constraint municipal_records_lat_range check (location_lat between -90 and 90),
  constraint municipal_records_record_is_object check (jsonb_typeof(record) = 'object'),
  constraint municipal_records_record_id_matches check (record->>'id' = id)
);

comment on table public.municipal_records is
  'Municipal proposals / notices. publication_status is CivicLens visibility; decision_* fields are municipal process metadata.';

comment on column public.municipal_records.record is
  'Complete MunicipalRecord JSON (canonical application contract).';

comment on column public.municipal_records.publication_status is
  'CivicLens publication state: draft | published | archived. Not the municipal decision outcome.';

create index municipal_records_publication_status_idx
  on public.municipal_records (publication_status);

create index municipal_records_municipality_idx
  on public.municipal_records (municipality);

create index municipal_records_category_kind_idx
  on public.municipal_records (category_kind);

create index municipal_records_location_idx
  on public.municipal_records (location_lng, location_lat);

create index municipal_records_updated_at_idx
  on public.municipal_records (updated_at desc);

create or replace function public.set_municipal_records_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger municipal_records_set_updated_at
  before update on public.municipal_records
  for each row
  execute function public.set_municipal_records_updated_at();

-- ---------------------------------------------------------------------------
-- Resident feedback (private to administrators)
-- ---------------------------------------------------------------------------

create table public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  municipal_record_id text not null
    references public.municipal_records (id) on delete cascade,
  comment text not null,
  perspective text null,
  contact_name text null,
  contact_email text null,
  review_status public.feedback_review_status not null default 'new',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  reviewed_by uuid null references auth.users (id) on delete set null,

  constraint feedback_submissions_comment_not_blank
    check (char_length(trim(comment)) > 0),
  constraint feedback_submissions_comment_length
    check (char_length(comment) <= 10000),
  constraint feedback_submissions_perspective_length
    check (perspective is null or char_length(perspective) <= 2000),
  constraint feedback_submissions_contact_name_length
    check (contact_name is null or char_length(contact_name) <= 200),
  constraint feedback_submissions_contact_email_length
    check (contact_email is null or char_length(contact_email) <= 320)
);

comment on table public.feedback_submissions is
  'Resident feedback collected by CivicLens. Private to admins. Not part of the municipal record document.';

create index feedback_submissions_record_idx
  on public.feedback_submissions (municipal_record_id);

create index feedback_submissions_review_status_idx
  on public.feedback_submissions (review_status);

create index feedback_submissions_created_at_idx
  on public.feedback_submissions (created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.admin_users enable row level security;
alter table public.municipal_records enable row level security;
alter table public.feedback_submissions enable row level security;

-- admin_users: no client reads/writes. Service role bypasses RLS for provisioning.
-- Authenticated users must not SELECT (prevents probing) or mutate privileges.

create policy admin_users_no_select
  on public.admin_users
  for select
  to anon, authenticated
  using (false);

create policy admin_users_no_insert
  on public.admin_users
  for insert
  to anon, authenticated
  with check (false);

create policy admin_users_no_update
  on public.admin_users
  for update
  to anon, authenticated
  using (false)
  with check (false);

create policy admin_users_no_delete
  on public.admin_users
  for delete
  to anon, authenticated
  using (false);

-- municipal_records: public may read published only

create policy municipal_records_public_read_published
  on public.municipal_records
  for select
  to anon, authenticated
  using (
    publication_status = 'published'
    or public.is_admin()
  );

create policy municipal_records_admin_insert
  on public.municipal_records
  for insert
  to authenticated
  with check (public.is_admin());

create policy municipal_records_admin_update
  on public.municipal_records
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy municipal_records_admin_delete
  on public.municipal_records
  for delete
  to authenticated
  using (public.is_admin());

-- Anonymous cannot mutate municipal records (explicit deny via missing policies;
-- also block authenticated non-admins via with check above).

-- feedback_submissions: admins only. No public insert yet (later increment).

create policy feedback_submissions_admin_select
  on public.feedback_submissions
  for select
  to authenticated
  using (public.is_admin());

create policy feedback_submissions_admin_insert
  on public.feedback_submissions
  for insert
  to authenticated
  with check (public.is_admin());

create policy feedback_submissions_admin_update
  on public.feedback_submissions
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy feedback_submissions_admin_delete
  on public.feedback_submissions
  for delete
  to authenticated
  using (public.is_admin());

create policy feedback_submissions_anon_no_select
  on public.feedback_submissions
  for select
  to anon
  using (false);

create policy feedback_submissions_anon_no_insert
  on public.feedback_submissions
  for insert
  to anon
  with check (false);

create policy feedback_submissions_anon_no_update
  on public.feedback_submissions
  for update
  to anon
  using (false)
  with check (false);

create policy feedback_submissions_anon_no_delete
  on public.feedback_submissions
  for delete
  to anon
  using (false);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on table public.municipal_records to anon, authenticated;
grant insert, update, delete on table public.municipal_records to authenticated;

grant select, insert, update, delete on table public.feedback_submissions to authenticated;
-- anon: no table grants on feedback beyond what policies allow; revoke defaults
revoke all on table public.feedback_submissions from anon;

revoke all on table public.admin_users from anon, authenticated;
-- service_role retains full access (Supabase default bypass RLS)
