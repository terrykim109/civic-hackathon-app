import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const hardeningPath = resolve(
  process.cwd(),
  'supabase/migrations/20261114020000_feedback_rate_limit_hardening.sql',
)

const sql = readFileSync(hardeningPath, 'utf8')

describe('Feedback rate-limit hardening contract', () => {
  it('enforces a per-record cap independent of client key rotation', () => {
    expect(sql).toMatch(/max_per_record_window constant integer := 40/i)
    expect(sql).toMatch(/record_bucket_key := 'record:' \|\| record_row\.id/i)
    expect(sql).toMatch(
      /Too many submissions for this proposal\. Please try again later\./i,
    )
  })

  it('keeps the per-client soft throttle alongside the record cap', () => {
    expect(sql).toMatch(/max_per_client_window constant integer := 5/i)
    expect(sql).toMatch(/\|client:/i)
  })
})
