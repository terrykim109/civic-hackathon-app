import { useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { resolveAdminGate } from '../auth/adminGate'
import { validateLoginInput } from '../auth/loginValidation'
import { useAuth } from '../auth/useAuth'
import styles from '../components/auth/AdminChrome.module.css'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const {
    clientConfigured,
    authLoading,
    adminLoading,
    session,
    isAdmin,
    signInWithPassword,
    authError,
  } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const gate = resolveAdminGate({
    clientConfigured,
    authLoading,
    adminLoading,
    hasSession: Boolean(session),
    isAdmin,
  })

  const queryError = useMemo(() => {
    const code = params.get('error')
    if (code === 'forbidden') {
      return 'This account is signed in but is not authorized as an administrator.'
    }
    if (code === 'unavailable') {
      return 'Supabase is not configured in this environment.'
    }
    return null
  }, [params])

  if (gate === 'allowed') {
    return <Navigate to="/admin" replace />
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLocalError(null)
    const invalid = validateLoginInput(email, password)
    if (invalid) {
      setLocalError(invalid)
      return
    }

    setSubmitting(true)
    const result = await signInWithPassword(email, password)
    setSubmitting(false)

    if (result.error) {
      setLocalError(result.error)
      return
    }

    navigate('/admin', { replace: true })
  }

  const errorMessage = localError ?? authError ?? queryError

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.card} aria-labelledby="admin-login-title">
          <div>
            <p className={styles.eyebrow}>CivicSync administrators</p>
            <h1 id="admin-login-title" className={styles.title}>
              Admin login
            </h1>
            <p className={styles.lede}>
              Sign in with a project-provisioned administrator account. Public
              registration is disabled.
            </p>
          </div>

          {!clientConfigured ? (
            <p className={styles.error} role="alert">
              Supabase is not configured. Set{' '}
              <code>VITE_SUPABASE_URL</code> and{' '}
              <code>VITE_SUPABASE_ANON_KEY</code> to enable admin login.
            </p>
          ) : null}

          {errorMessage ? (
            <p className={styles.error} role="alert">
              {errorMessage}
            </p>
          ) : null}

          <form className={styles.form} onSubmit={(event) => void onSubmit(event)}>
            <label className={styles.label} htmlFor="admin-email">
              Email
              <input
                id="admin-email"
                className={styles.input}
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={!clientConfigured || submitting}
                required
              />
            </label>

            <label className={styles.label} htmlFor="admin-password">
              Password
              <input
                id="admin-password"
                className={styles.input}
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={!clientConfigured || submitting}
                required
                minLength={8}
              />
            </label>

            <div className={styles.actions}>
              <button
                type="submit"
                className={styles.primary}
                disabled={!clientConfigured || submitting || authLoading}
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
              <Link className={styles.secondary} to="/">
                Back to map
              </Link>
            </div>
          </form>

          <p className={styles.meta}>
            Administrator privileges are verified with the database{' '}
            <code>is_admin()</code> check against <code>admin_users</code>. Accounts
            cannot grant themselves admin access from this app.
          </p>
        </section>
      </div>
    </div>
  )
}
