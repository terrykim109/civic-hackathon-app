-- Live RLS security checks for local Supabase.
--
-- Prerequisites (see docs/SUPABASE.md):
--   1. supabase start
--   2. supabase db reset   (applies migrations)
--   3. Create two auth users (admin + regular) via Studio or Auth API
--   4. Insert only the admin into public.admin_users using the service role
--   5. Replace the placeholder UUIDs below, then run:
--        psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/tests/rls_security.sql
--
-- These statements are NOT run by `npm test`.

\set ON_ERROR_STOP on

-- Replace before running:
--   :'admin_uid'   -> auth.users id listed in admin_users
--   :'user_uid'    -> authenticated non-admin auth.users id

-- Seed a draft + published record as service role (bypasses RLS)
begin;

delete from public.feedback_submissions;
delete from public.municipal_records where id in ('test-draft-1', 'test-published-1');

insert into public.municipal_records (
  id, publication_status, title, description, municipality,
  category_raw, category_kind, record_type, project_status,
  decision_status, decision_stage, participation_availability,
  can_participate_now, location_lng, location_lat, location,
  data_origin, record
) values
(
  'test-draft-1', 'draft', 'Draft Only', 'Should stay private', 'Toronto',
  'housing', 'housing', 'notice', 'pending',
  'pending', 'proposal', 'unknown',
  null, -79.38, 43.65,
  '{"coordinates":[-79.38,43.65],"precision":"approximate","locationRole":"test","note":"test"}'::jsonb,
  'curated',
  '{"id":"test-draft-1","title":"Draft Only","description":"Should stay private","municipality":"Toronto","categoryRaw":"housing","categoryKind":"housing","recordType":"notice","projectStatus":"pending","gisSourceStatus":null,"decisionStatus":"pending","decisionStage":"proposal","participationAvailability":"unknown","canParticipateNow":null,"participationOptions":[],"events":[],"potentialImpacts":[],"uncertainties":[],"location":{"coordinates":[-79.38,43.65],"precision":"approximate","locationRole":"test","note":"test"},"sources":[],"evidence":[],"relatedProcesses":[],"metrics":[],"dataOrigin":"curated"}'::jsonb
),
(
  'test-published-1', 'published', 'Published Record', 'Visible to public', 'Toronto',
  'housing', 'housing', 'notice', 'pending',
  'pending', 'public_consultation', 'open',
  true, -79.39, 43.66,
  '{"coordinates":[-79.39,43.66],"precision":"approximate","locationRole":"test","note":"test"}'::jsonb,
  'curated',
  '{"id":"test-published-1","title":"Published Record","description":"Visible to public","municipality":"Toronto","categoryRaw":"housing","categoryKind":"housing","recordType":"notice","projectStatus":"pending","gisSourceStatus":null,"decisionStatus":"pending","decisionStage":"public_consultation","participationAvailability":"open","canParticipateNow":true,"participationOptions":[],"events":[],"potentialImpacts":[],"uncertainties":[],"location":{"coordinates":[-79.39,43.66],"precision":"approximate","locationRole":"test","note":"test"},"sources":[],"evidence":[],"relatedProcesses":[],"metrics":[],"dataOrigin":"curated"}'::jsonb
);

insert into public.feedback_submissions (municipal_record_id, comment, perspective)
values ('test-published-1', 'Private resident comment', 'housing');

commit;

-- 1) Anonymous: published readable, draft hidden, feedback hidden, no writes
begin;
set local role anon;
set local request.jwt.claim.role = 'anon';

do $$
declare
  published_count int;
  draft_count int;
  feedback_count int;
begin
  select count(*) into published_count from public.municipal_records where id = 'test-published-1';
  select count(*) into draft_count from public.municipal_records where id = 'test-draft-1';
  select count(*) into feedback_count from public.feedback_submissions;

  if published_count <> 1 then
    raise exception 'anon should read published records';
  end if;
  if draft_count <> 0 then
    raise exception 'anon must not read draft records';
  end if;
  if feedback_count <> 0 then
    raise exception 'anon must not read feedback';
  end if;

  begin
    insert into public.municipal_records (
      id, publication_status, title, description, municipality,
      category_raw, category_kind, record_type, project_status,
      decision_status, decision_stage, participation_availability,
      location_lng, location_lat, location, data_origin, record
    ) values (
      'test-anon-write', 'published', 'x', 'x', 'Toronto',
      'housing', 'housing', 'notice', 'pending',
      'unknown', 'unknown', 'unknown',
      -79.3, 43.7,
      '{"coordinates":[-79.3,43.7],"precision":"unknown","locationRole":"t","note":"t"}'::jsonb,
      'curated',
      '{"id":"test-anon-write","title":"x","description":"x","municipality":"Toronto","categoryRaw":"housing","categoryKind":"housing","recordType":"notice","projectStatus":"pending","gisSourceStatus":null,"decisionStatus":"unknown","decisionStage":"unknown","participationAvailability":"unknown","canParticipateNow":null,"participationOptions":[],"events":[],"potentialImpacts":[],"uncertainties":[],"location":{"coordinates":[-79.3,43.7],"precision":"unknown","locationRole":"t","note":"t"},"sources":[],"evidence":[],"relatedProcesses":[],"metrics":[],"dataOrigin":"curated"}'::jsonb
    );
    raise exception 'anon must not insert municipal records';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm = 'anon must not insert municipal records' then raise;
      end if;
      -- RLS / privilege failures are expected
      null;
  end;
end $$;
rollback;

-- 2) Authenticated non-admin: cannot publish / cannot read feedback / cannot self-admin
-- Uncomment and set JWT claims after creating a non-admin user:
-- begin;
-- set local role authenticated;
-- set local request.jwt.claim.role = 'authenticated';
-- set local request.jwt.claim.sub = '<user_uid>';
-- ... assert update publication_status fails, feedback count = 0,
--     insert into admin_users fails
-- rollback;

-- 3) Admin: can read drafts, update publication, read feedback
-- begin;
-- set local role authenticated;
-- set local request.jwt.claim.role = 'authenticated';
-- set local request.jwt.claim.sub = '<admin_uid>';
-- ... assert draft visible, feedback visible, update to published works
-- rollback;

-- 4a) Anonymous may submit via RPC when published + open; must not read rows back
begin;
set local role anon;
set local request.jwt.claim.role = 'anon';

do $$
declare
  ok_result jsonb;
  draft_result jsonb;
  feedback_count int;
begin
  ok_result := public.submit_resident_feedback(
    'test-published-1',
    'Anon resident comment via RPC',
    'parks',
    null,
    null,
    'rls-test-client',
    null
  );
  if coalesce((ok_result->>'ok')::boolean, false) is not true then
    raise exception 'anon RPC submit should succeed for published open record: %', ok_result;
  end if;

  draft_result := public.submit_resident_feedback(
    'test-draft-1',
    'Should fail against draft',
    null, null, null, 'rls-test-client-2', null
  );
  if coalesce((draft_result->>'ok')::boolean, true) is not false then
    raise exception 'anon RPC must reject draft records';
  end if;

  select count(*) into feedback_count from public.feedback_submissions;
  if feedback_count <> 0 then
    raise exception 'anon must still be unable to SELECT feedback_submissions';
  end if;
end $$;
rollback;

-- 4b) Close participation as service role, then confirm anon RPC rejects
begin;
update public.municipal_records
set participation_availability = 'closed', can_participate_now = false
where id = 'test-published-1';

set local role anon;
set local request.jwt.claim.role = 'anon';

do $$
declare
  closed_result jsonb;
begin
  closed_result := public.submit_resident_feedback(
    'test-published-1',
    'Should fail when closed',
    null, null, null, 'rls-test-client-3', null
  );
  if coalesce((closed_result->>'ok')::boolean, true) is not false then
    raise exception 'anon RPC must reject closed participation windows';
  end if;
end $$;
rollback;

-- 5) Optional: after applying 20261114020000_feedback_rate_limit_hardening.sql,
--    verify that rotating p_client_key cannot exceed the per-record hourly cap.
--    (Requires a published open record and repeated RPC calls in a loop.)

select 'rls_security.sql seed + anon checks completed (admin/user blocks require UUID placeholders)' as status;
