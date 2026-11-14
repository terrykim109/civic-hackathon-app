import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import styles from './AuthNav.module.css'

interface AuthNavProps {
  /** `inline` sits inside TopNav; `floating` is a standalone map control. */
  variant?: 'floating' | 'inline'
}

/**
 * Auth navigation for the public map chrome.
 * Visibility is UX only — /admin remains protected by AdminRoute + RLS.
 */
export function AuthNav({ variant = 'floating' }: AuthNavProps) {
  const { authLoading, adminLoading, isAdmin, user, signOut } = useAuth()
  const busy = authLoading || adminLoading
  const rootClass =
    variant === 'inline' ? `${styles.root} ${styles.inline}` : styles.root

  if (busy) {
    return (
      <div className={rootClass} aria-busy="true">
        <span className={styles.muted}>Checking access…</span>
      </div>
    )
  }

  if (isAdmin && user) {
    return (
      <div className={rootClass}>
        <Link className={styles.link} to="/admin">
          Admin
        </Link>
        <button
          type="button"
          className={styles.button}
          onClick={() => {
            void signOut()
          }}
        >
          Log out
        </button>
      </div>
    )
  }

  return (
    <div className={rootClass}>
      <Link className={styles.login} to="/admin/login">
        Admin Login
      </Link>
    </div>
  )
}
