/**
 * Pure admin-route gate used by the protected /admin UI.
 * Frontend gating is UX only — RLS remains the authorization boundary.
 */

export type AdminGateState =
  | 'loading'
  | 'unauthenticated'
  | 'forbidden'
  | 'allowed'
  | 'unavailable'

export interface AdminGateInput {
  /** True while session restore / initial auth check is in flight. */
  authLoading: boolean
  /** True while is_admin() is being verified for a signed-in user. */
  adminLoading: boolean
  /** Whether a Supabase browser client is configured. */
  clientConfigured: boolean
  hasSession: boolean
  /**
   * Result of SECURITY DEFINER public.is_admin() (admin_users allow-list).
   * null = not yet known / not checked.
   */
  isAdmin: boolean | null
}

export function resolveAdminGate(input: AdminGateInput): AdminGateState {
  if (!input.clientConfigured) return 'unavailable'
  if (input.authLoading) return 'loading'
  if (!input.hasSession) return 'unauthenticated'
  if (input.adminLoading || input.isAdmin === null) return 'loading'
  if (!input.isAdmin) return 'forbidden'
  return 'allowed'
}

export function adminGateRedirectPath(state: AdminGateState): string | null {
  switch (state) {
    case 'unauthenticated':
      return '/admin/login'
    case 'forbidden':
      return '/admin/login?error=forbidden'
    case 'unavailable':
      return '/admin/login?error=unavailable'
    default:
      return null
  }
}
