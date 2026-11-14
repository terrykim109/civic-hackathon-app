-- Resident feedback submission via SECURITY DEFINER RPC.
-- Public clients never insert into feedback_submissions directly.
-- Eligibility is derived from municipal_records participation fields + publication_status.

create table if not exists public.feedback_rate_buckets (
  bucket_key text primary key,
  window_started_at timestamptz not null default now(),
  submission_count integer not null default 0,
  constraint feedback_rate_buckets_count_nonnegative check (submission_count >= 0)
);

comment on table public.feedback_rate_buckets is
  'Simple sliding-window counters for resident feedback spam throttling.';

alter table public.feedback_rate_buckets enable row level security;

create policy feedback_rate_buckets_no_client_access
  on public.feedback_rate_buckets
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.feedback_rate_buckets from anon, authenticated;

create or replace function public.municipal_record_accepts_feedback(
  p_row public.municipal_records
)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  option_row jsonb;
  option_availability text;
  opens_on text;
  option_deadline text;
  deadline_text text;
begin
  if p_row.publication_status is distinct from 'published' then
    return false;
  end if;

  if p_row.participation_availability is distinct from 'open' then
    return false;
  end if;

  if p_row.can_participate_now is distinct from true then
    return false;
  end if;

  deadline_text := nullif(btrim(coalesce(p_row.participation_deadline, '')), '');
  if deadline_text is not null then
    if deadline_text ~ '^\d{4}-\d{2}-\d{2}' then
      if (timezone('utc', now()))::date > substr(deadline_text, 1, 10)::date then
        return false;
      end if;
    else
      -- Ambiguous deadline never grants permission.
      return false;
    end if;
  end if;

  if p_row.participation_options is null
     or jsonb_typeof(p_row.participation_options) <> 'array' then
    return true;
  end if;

  for option_row in
    select value
    from jsonb_array_elements(p_row.participation_options) as t(value)
  loop
    option_availability := lower(coalesce(option_row->>'availability', ''));
    if option_availability not in ('open', 'available') then
      continue;
    end if;

    opens_on := nullif(btrim(coalesce(option_row->>'opensOn', option_row->>'opens_on', '')), '');
    if opens_on is not null then
      if opens_on ~ '^\d{4}-\d{2}-\d{2}' then
        if (timezone('utc', now()))::date < substr(opens_on, 1, 10)::date then
          return false;
        end if;
      else
        return false;
      end if;
    end if;

    option_deadline := nullif(
      btrim(coalesce(option_row->>'deadline', '')),
      ''
    );
    if option_deadline is not null then
      if option_deadline ~ '^\d{4}-\d{2}-\d{2}' then
        if (timezone('utc', now()))::date > substr(option_deadline, 1, 10)::date then
          return false;
        end if;
      else
        return false;
      end if;
    end if;
  end loop;

  return true;
end;
$$;

revoke all on function public.municipal_record_accepts_feedback(public.municipal_records)
  from public;
grant execute on function public.municipal_record_accepts_feedback(public.municipal_records)
  to service_role;

create or replace function public.submit_resident_feedback(
  p_municipal_record_id text,
  p_comment text,
  p_perspective text default null,
  p_contact_name text default null,
  p_contact_email text default null,
  p_client_key text default null,
  p_honeypot text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  record_row public.municipal_records;
  cleaned_comment text;
  cleaned_perspective text;
  cleaned_name text;
  cleaned_email text;
  bucket_key text;
  bucket public.feedback_rate_buckets%rowtype;
  new_id uuid;
  window_seconds constant integer := 3600;
  max_per_window constant integer := 5;
begin
  -- Honeypot: reject bot-like payloads without revealing the trap.
  if p_honeypot is not null and length(btrim(p_honeypot)) > 0 then
    return jsonb_build_object(
      'ok', false,
      'error', 'Unable to submit feedback right now.'
    );
  end if;

  cleaned_comment := btrim(coalesce(p_comment, ''));
  if cleaned_comment = '' then
    return jsonb_build_object('ok', false, 'error', 'Feedback comment is required.');
  end if;
  if char_length(cleaned_comment) > 10000 then
    return jsonb_build_object(
      'ok', false,
      'error', 'Feedback comment must be 10,000 characters or fewer.'
    );
  end if;

  cleaned_perspective := nullif(btrim(coalesce(p_perspective, '')), '');
  if cleaned_perspective is not null and char_length(cleaned_perspective) > 2000 then
    return jsonb_build_object(
      'ok', false,
      'error', 'Perspective must be 2,000 characters or fewer.'
    );
  end if;

  cleaned_name := nullif(btrim(coalesce(p_contact_name, '')), '');
  if cleaned_name is not null and char_length(cleaned_name) > 200 then
    return jsonb_build_object(
      'ok', false,
      'error', 'Contact name must be 200 characters or fewer.'
    );
  end if;

  cleaned_email := nullif(btrim(coalesce(p_contact_email, '')), '');
  if cleaned_email is not null then
    if char_length(cleaned_email) > 320 then
      return jsonb_build_object(
        'ok', false,
        'error', 'Contact email must be 320 characters or fewer.'
      );
    end if;
    if cleaned_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      return jsonb_build_object('ok', false, 'error', 'Enter a valid contact email or leave it blank.');
    end if;
  end if;

  if p_municipal_record_id is null or btrim(p_municipal_record_id) = '' then
    return jsonb_build_object('ok', false, 'error', 'Municipal record id is required.');
  end if;

  select *
  into record_row
  from public.municipal_records
  where id = btrim(p_municipal_record_id);

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error', 'This proposal is not published in CivicLens or is not accepting feedback.'
    );
  end if;

  if not public.municipal_record_accepts_feedback(record_row) then
    return jsonb_build_object(
      'ok', false,
      'error', 'This proposal is not published in CivicLens or is not accepting feedback.'
    );
  end if;

  bucket_key :=
    'record:'
    || record_row.id
    || '|client:'
    || left(coalesce(nullif(btrim(p_client_key), ''), 'anonymous'), 80);

  select *
  into bucket
  from public.feedback_rate_buckets
  where feedback_rate_buckets.bucket_key = bucket_key
  for update;

  if found then
    if extract(epoch from (now() - bucket.window_started_at)) > window_seconds then
      update public.feedback_rate_buckets
      set window_started_at = now(),
          submission_count = 1
      where feedback_rate_buckets.bucket_key = bucket_key;
    elsif bucket.submission_count >= max_per_window then
      return jsonb_build_object(
        'ok', false,
        'error', 'Too many submissions. Please wait before sending more feedback.'
      );
    else
      update public.feedback_rate_buckets
      set submission_count = submission_count + 1
      where feedback_rate_buckets.bucket_key = bucket_key;
    end if;
  else
    insert into public.feedback_rate_buckets (bucket_key, window_started_at, submission_count)
    values (bucket_key, now(), 1);
  end if;

  insert into public.feedback_submissions (
    municipal_record_id,
    comment,
    perspective,
    contact_name,
    contact_email,
    review_status
  )
  values (
    record_row.id,
    cleaned_comment,
    cleaned_perspective,
    cleaned_name,
    cleaned_email,
    'new'
  )
  returning id into new_id;

  return jsonb_build_object(
    'ok', true,
    'id', new_id,
    'reviewStatus', 'new'
  );
end;
$$;

revoke all on function public.submit_resident_feedback(
  text, text, text, text, text, text, text
) from public;

grant execute on function public.submit_resident_feedback(
  text, text, text, text, text, text, text
) to anon, authenticated, service_role;

comment on function public.submit_resident_feedback(
  text, text, text, text, text, text, text
) is
  'Public resident feedback intake. Validates published + open participation server-side, rate-limits, and inserts privately.';
