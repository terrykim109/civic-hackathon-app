import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Contract tests over the SQL migration text.
 * These verify that the intended RLS posture is encoded in the migration.
 *
 * Live Postgres RLS behaviour requires local Supabase — see docs/SUPABASE.md
 * and supabase/tests/rls_security.sql (not executed in default `npm test`).
 */
const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20261114000000_backend_foundation.sql',
)

const sql = readFileSync(migrationPath, 'utf8')

describe('RLS policy contract (migration source)', () => {
  it('enables RLS on all sensitive tables', () => {
    expect(sql).toMatch(/alter table public\.admin_users enable row level security/i)
    expect(sql).toMatch(
      /alter table public\.municipal_records enable row level security/i,
    )
    expect(sql).toMatch(
      /alter table public\.feedback_submissions enable row level security/i,
    )
  })

  it('publishes only published municipal records to the public', () => {
    expect(sql).toMatch(/publication_status = 'published'/i)
    expect(sql).toMatch(/municipal_records_public_read_published/i)
  })

  it('requires is_admin for municipal record writes', () => {
    expect(sql).toMatch(/municipal_records_admin_insert/i)
    expect(sql).toMatch(/municipal_records_admin_update/i)
    expect(sql).toMatch(/with check \(public\.is_admin\(\)\)/i)
  })

  it('keeps feedback private to admins and denies anon access', () => {
    expect(sql).toMatch(/feedback_submissions_admin_select/i)
    expect(sql).toMatch(/feedback_submissions_anon_no_select/i)
    expect(sql).toMatch(/feedback_submissions_anon_no_insert/i)
  })

  it('prevents client self-assignment of administrator privileges', () => {
    expect(sql).toMatch(/admin_users_no_insert/i)
    expect(sql).toMatch(/admin_users_no_update/i)
    expect(sql).toMatch(/admin_users_no_delete/i)
    expect(sql).toMatch(/admin_users_no_select/i)
  })

  it('defines publication_status separately from decision fields', () => {
    expect(sql).toMatch(
      /create type public\.publication_status as enum \('draft', 'published', 'archived'\)/i,
    )
    expect(sql).toMatch(/decision_status text not null/i)
    expect(sql).toMatch(/publication_status public\.publication_status/i)
  })
})
