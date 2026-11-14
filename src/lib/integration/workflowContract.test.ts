import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Lightweight integration contract: ensures the three Commit 7 workflows remain
 * wired together in source. Live browser/DB E2E still requires configured
 * Supabase + an admin account (see docs/DEPLOYMENT.md).
 */
describe('End-to-end workflow wiring contract', () => {
  it('routes admin proposal, feedback inbox, and public map surfaces', () => {
    const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
    expect(app).toMatch(/path="\/"/)
    expect(app).toMatch(/path="\/admin"/)
    expect(app).toMatch(/path="\/admin\/feedback"/)
    expect(app).toMatch(/path="\/admin\/proposals\/:proposalId"/)
    expect(app).toMatch(/AdminRoute/)
  })

  it('keeps map merge + resident form + admin inbox modules present', () => {
    const mapHook = readFileSync(
      resolve(process.cwd(), 'src/data/useMapMunicipalRecords.ts'),
      'utf8',
    )
    const form = readFileSync(
      resolve(process.cwd(), 'src/components/records/ResidentFeedbackForm.tsx'),
      'utf8',
    )
    const inbox = readFileSync(
      resolve(process.cwd(), 'src/pages/AdminFeedbackPage.tsx'),
      'utf8',
    )

    expect(mapHook).toMatch(/mergeStaticAndPublishedRecords/)
    expect(form).toMatch(/submitResidentFeedback/)
    expect(form).toMatch(/not official municipal[\s\S]*consultation/i)
    expect(inbox).toMatch(/listFeedbackSubmissions/)
    expect(inbox).toMatch(/Export CSV/)
    expect(inbox).toMatch(/updateFeedbackReviewStatus/)
  })

  it('documents that frontend env may only expose the anon key', () => {
    const example = readFileSync(resolve(process.cwd(), '.env.example'), 'utf8')
    const client = readFileSync(
      resolve(process.cwd(), 'src/lib/supabase/client.ts'),
      'utf8',
    )
    expect(example).toMatch(/VITE_SUPABASE_ANON_KEY/)
    expect(example).toMatch(/Do NOT prefix with VITE_/i)
    expect(client).toMatch(/VITE_SUPABASE_ANON_KEY/)
    expect(client).not.toMatch(/SERVICE_ROLE/)
  })
})
