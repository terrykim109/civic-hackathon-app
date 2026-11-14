import { describe, expect, it, vi } from 'vitest'
import type { CivicSupabaseClient } from '../supabase/client'
import { submitResidentFeedback } from './submitResidentFeedback'

function mockClient(rpcImpl: ReturnType<typeof vi.fn>): CivicSupabaseClient {
  return {
    rpc: rpcImpl,
  } as unknown as CivicSupabaseClient
}

describe('submitResidentFeedback', () => {
  it('blocks invalid input before calling the RPC', async () => {
    const rpc = vi.fn()
    const result = await submitResidentFeedback(mockClient(rpc), {
      municipalRecordId: 'rec-1',
      comment: '',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/required/i)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('returns the submission id on success', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { ok: true, id: 'fb-123', reviewStatus: 'new' },
      error: null,
    })
    const result = await submitResidentFeedback(mockClient(rpc), {
      municipalRecordId: 'rec-1',
      comment: 'Support this project',
      perspective: 'parks',
      contactEmail: 'resident@example.com',
    })
    expect(result).toEqual({ ok: true, id: 'fb-123' })
    expect(rpc).toHaveBeenCalledWith(
      'submit_resident_feedback',
      expect.objectContaining({
        p_municipal_record_id: 'rec-1',
        p_comment: 'Support this project',
        p_perspective: 'parks',
        p_contact_email: 'resident@example.com',
      }),
    )
  })

  it('surfaces closed-window and unpublished errors from the RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        ok: false,
        error:
          'This proposal is not published in CivicLens or is not accepting feedback.',
      },
      error: null,
    })
    const result = await submitResidentFeedback(mockClient(rpc), {
      municipalRecordId: 'draft-1',
      comment: 'Please reconsider',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/not published|not accepting/i)
    }
  })

  it('maps network/RPC transport failures', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch' },
    })
    const result = await submitResidentFeedback(mockClient(rpc), {
      municipalRecordId: 'rec-1',
      comment: 'Hello',
    })
    expect(result).toEqual({ ok: false, error: 'Failed to fetch' })
  })
})
