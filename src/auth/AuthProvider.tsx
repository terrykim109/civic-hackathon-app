import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  createBrowserSupabaseClient,
  type CivicSupabaseClient,
} from '../lib/supabase/client'
import { AuthContext } from './authContext'
import { verifyAdminAccess } from './verifyAdmin'

async function resolveAdminFlag(
  client: CivicSupabaseClient,
  hasSession: boolean,
): Promise<boolean | null> {
  if (!hasSession) return false
  const result = await verifyAdminAccess(client)
  if (!result.ok) return false
  return result.isAdmin
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => createBrowserSupabaseClient())
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(() =>
    client ? null : false,
  )
  const [authLoading, setAuthLoading] = useState(() => Boolean(client))
  const [adminLoading, setAdminLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const refreshAdminStatus = useCallback(async () => {
    if (!client) {
      setIsAdmin(false)
      return
    }
    setAdminLoading(true)
    try {
      const {
        data: { session: current },
      } = await client.auth.getSession()
      const flag = await resolveAdminFlag(client, Boolean(current))
      setIsAdmin(flag)
    } finally {
      setAdminLoading(false)
    }
  }, [client])

  useEffect(() => {
    if (!client) return

    let cancelled = false

    const bootstrap = async () => {
      const {
        data: { session: current },
      } = await client.auth.getSession()
      if (cancelled) return
      setSession(current)
      setAdminLoading(true)
      const flag = await resolveAdminFlag(client, Boolean(current))
      if (cancelled) return
      setIsAdmin(flag)
      setAdminLoading(false)
      setAuthLoading(false)
    }

    void bootstrap()

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      void (async () => {
        setAdminLoading(true)
        const flag = await resolveAdminFlag(client, Boolean(nextSession))
        if (!cancelled) {
          setIsAdmin(flag)
          setAdminLoading(false)
        }
      })()
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [client])

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      setAuthError(null)
      if (!client) {
        const message =
          'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
        setAuthError(message)
        return { error: message }
      }

      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setAuthError(error.message)
        setIsAdmin(false)
        return { error: error.message }
      }

      setAdminLoading(true)
      const flag = await resolveAdminFlag(client, Boolean(data.session))
      setIsAdmin(flag)
      setAdminLoading(false)

      if (!flag) {
        const message =
          'Signed in, but this account is not an authorized administrator.'
        setAuthError(message)
        await client.auth.signOut()
        setSession(null)
        setIsAdmin(false)
        return { error: message }
      }

      return { error: null }
    },
    [client],
  )

  const signOut = useCallback(async () => {
    if (!client) return { error: null }
    const { error } = await client.auth.signOut()
    setSession(null)
    setIsAdmin(false)
    if (error) {
      setAuthError(error.message)
      return { error: error.message }
    }
    setAuthError(null)
    return { error: null }
  }, [client])

  const value = useMemo(
    () => ({
      client,
      clientConfigured: Boolean(client),
      session,
      user: session?.user ?? null,
      isAdmin,
      authLoading,
      adminLoading,
      authError,
      signInWithPassword,
      signOut,
      refreshAdminStatus,
    }),
    [
      client,
      session,
      isAdmin,
      authLoading,
      adminLoading,
      authError,
      signInWithPassword,
      signOut,
      refreshAdminStatus,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
