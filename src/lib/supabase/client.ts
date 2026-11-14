import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

export type CivicSupabaseClient = SupabaseClient<Database>

/**
 * Browser / public client using the anon key only.
 * Never import or embed the service-role key in frontend code.
 *
 * Returns null when env vars are unset so the existing static-map app
 * keeps working until Supabase is configured.
 */
export function createBrowserSupabaseClient(): CivicSupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (typeof url !== 'string' || !url.trim()) return null
  if (typeof anonKey !== 'string' || !anonKey.trim()) return null

  return createClient<Database>(url.trim(), anonKey.trim(), {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}
