import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import styles from './AuthNav.module.css'

/**
 * Top-right auth navigation for the public map chrome.
 * Visibility is UX only — /admin remains protected by AdminRoute + RLS.
 */
export function AuthNav() {
  const { authLoading, adminLoading, isAdmin, user, signOut } = useAuth()
  const busy = authLoading || adminLoading

  if (busy) {
    return (
      <div className={styles.root} aria-busy="true">
        <span className={styles.muted}>Checking access…</span>
      </div>
    )
  }

  if (isAdmin && user) {
    return (
      <div className={styles.root}>
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
    <div className={styles.root}>
      <Link className={styles.link} to="/admin/login">
        Admin Login
      </Link>
    </div>
  )
}
