import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { CivicSupabaseClient } from '../lib/supabase/client'

export interface AuthContextValue {
  client: CivicSupabaseClient | null
  clientConfigured: boolean
  session: Session | null
  user: User | null
  isAdmin: boolean | null
  authLoading: boolean
  adminLoading: boolean
  authError: string | null
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>
  signOut: () => Promise<{ error: string | null }>
  refreshAdminStatus: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
