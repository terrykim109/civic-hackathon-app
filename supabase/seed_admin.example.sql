-- Example: grant administrator privileges (service role / SQL editor only).
-- Never run this from the browser client.
--
-- 1. Create the Auth user in Supabase Dashboard (Email auth) or Auth Admin API.
-- 2. Copy their user UUID from Authentication → Users.
-- 3. Run as postgres / service_role:

-- insert into public.admin_users (user_id, note)
-- values ('00000000-0000-0000-0000-000000000000', 'Initial CivicLens admin');

-- Verify (service role):
-- select * from public.admin_users;
