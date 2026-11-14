import type { CivicSupabaseClient } from '../lib/supabase/client'

export type VerifyAdminResult =
  | { ok: true; isAdmin: true }
  | { ok: true; isAdmin: false }
  | { ok: false; isAdmin: false; error: string }

/**
 * Verify administrator privileges via the database `is_admin()` RPC.
 *
 * This reads the server-side `admin_users` allow-list through a SECURITY DEFINER
 * function. It does not trust JWT app_metadata / user_metadata for roles.
 * Clients cannot insert into `admin_users` (RLS deny-all for anon/authenticated).
 */
export async function verifyAdminAccess(
  client: CivicSupabaseClient,
): Promise<VerifyAdminResult> {
  const { data, error } = await client.rpc('is_admin')

  if (error) {
    return {
      ok: false,
      isAdmin: false,
      error: error.message || 'Could not verify administrator access.',
    }
  }

  return {
    ok: true,
    isAdmin: data === true,
  }
}
