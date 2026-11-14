import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { adminGateRedirectPath, resolveAdminGate } from '../../auth/adminGate'
import { useAuth } from '../../auth/useAuth'
import styles from './AdminChrome.module.css'

interface AdminRouteProps {
  children: ReactNode
}

/**
 * Client-side route gate for /admin.
 * Authorization still depends on Supabase Auth + is_admin() / RLS.
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const location = useLocation()
  const {
    clientConfigured,
    authLoading,
    adminLoading,
    session,
    isAdmin,
  } = useAuth()

  const gate = resolveAdminGate({
    clientConfigured,
    authLoading,
    adminLoading,
    hasSession: Boolean(session),
    isAdmin,
  })

  const redirect = adminGateRedirectPath(gate)
  if (redirect) {
    return (
      <Navigate
        to={redirect}
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  if (gate === 'loading') {
    return (
      <div className={styles.page}>
        <p className={styles.status} role="status">
          Checking administrator access…
        </p>
      </div>
    )
  }

  return children
}
