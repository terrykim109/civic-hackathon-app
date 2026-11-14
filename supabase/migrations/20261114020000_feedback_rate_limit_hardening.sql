-- Harden resident feedback rate limiting.
-- Client-supplied p_client_key alone is not trusted for throttling:
-- enforce a per-record cap in addition to the per-client/record bucket.

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
  client_bucket_key text;
  record_bucket_key text;
  client_bucket public.feedback_rate_buckets%rowtype;
  record_bucket public.feedback_rate_buckets%rowtype;
  new_id uuid;
  window_seconds constant integer := 3600;
  max_per_client_window constant integer := 5;
  max_per_record_window constant integer := 40;
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

  -- Per-record cap (not spoofable via p_client_key rotation).
  record_bucket_key := 'record:' || record_row.id;

  select *
  into record_bucket
  from public.feedback_rate_buckets
  where feedback_rate_buckets.bucket_key = record_bucket_key
  for update;

  if found then
    if extract(epoch from (now() - record_bucket.window_started_at)) > window_seconds then
      update public.feedback_rate_buckets
      set window_started_at = now(),
          submission_count = 1
      where feedback_rate_buckets.bucket_key = record_bucket_key;
    elsif record_bucket.submission_count >= max_per_record_window then
      return jsonb_build_object(
        'ok', false,
        'error', 'Too many submissions for this proposal. Please try again later.'
      );
    else
      update public.feedback_rate_buckets
      set submission_count = submission_count + 1
      where feedback_rate_buckets.bucket_key = record_bucket_key;
    end if;
  else
    insert into public.feedback_rate_buckets (bucket_key, window_started_at, submission_count)
    values (record_bucket_key, now(), 1);
  end if;

  -- Per-client/record soft throttle (best-effort against casual repeats).
  client_bucket_key :=
    'record:'
    || record_row.id
    || '|client:'
    || left(coalesce(nullif(btrim(p_client_key), ''), 'anonymous'), 80);

  select *
  into client_bucket
  from public.feedback_rate_buckets
  where feedback_rate_buckets.bucket_key = client_bucket_key
  for update;

  if found then
    if extract(epoch from (now() - client_bucket.window_started_at)) > window_seconds then
      update public.feedback_rate_buckets
      set window_started_at = now(),
          submission_count = 1
      where feedback_rate_buckets.bucket_key = client_bucket_key;
    elsif client_bucket.submission_count >= max_per_client_window then
      return jsonb_build_object(
        'ok', false,
        'error', 'Too many submissions. Please wait before sending more feedback.'
      );
    else
      update public.feedback_rate_buckets
      set submission_count = submission_count + 1
      where feedback_rate_buckets.bucket_key = client_bucket_key;
    end if;
  else
    insert into public.feedback_rate_buckets (bucket_key, window_started_at, submission_count)
    values (client_bucket_key, now(), 1);
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

comment on function public.submit_resident_feedback(
  text, text, text, text, text, text, text
) is
  'Public resident feedback intake. Validates published + open participation, applies per-record and per-client rate limits, and inserts privately.';
