import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Contract tests over the resident-feedback migration.
 * Live RPC behaviour still requires local Supabase — see docs/SUPABASE.md.
 */
const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20261114010000_resident_feedback_submission.sql',
)

const sql = readFileSync(migrationPath, 'utf8')

describe('Resident feedback submission contract (migration source)', () => {
  it('exposes a SECURITY DEFINER submit RPC instead of public inserts', () => {
    expect(sql).toMatch(/create or replace function public\.submit_resident_feedback/i)
    expect(sql).toMatch(/security definer/i)
    expect(sql).toMatch(
      /grant execute on function public\.submit_resident_feedback[\s\S]*to anon, authenticated/i,
    )
  })

  it('requires published + open participation before insert', () => {
    expect(sql).toMatch(/municipal_record_accepts_feedback/i)
    expect(sql).toMatch(/publication_status is distinct from 'published'/i)
    expect(sql).toMatch(/participation_availability is distinct from 'open'/i)
    expect(sql).toMatch(/can_participate_now is distinct from true/i)
  })

  it('keeps rate buckets private and rate-limits submissions', () => {
    expect(sql).toMatch(/create table if not exists public\.feedback_rate_buckets/i)
    expect(sql).toMatch(/feedback_rate_buckets_no_client_access/i)
    expect(sql).toMatch(/max_per_window constant integer := 5/i)
  })

  it('stores review_status new and rejects honeypot fills', () => {
    expect(sql).toMatch(/'new'/i)
    expect(sql).toMatch(/p_honeypot/i)
    expect(sql).toMatch(/Unable to submit feedback right now\./i)
  })
})
