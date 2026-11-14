import { describe, expect, it, vi } from 'vitest'
import { verifyAdminAccess } from './verifyAdmin'
import type { CivicSupabaseClient } from '../lib/supabase/client'

function mockClient(rpcImpl: () => Promise<{ data: unknown; error: unknown }>) {
  return {
    rpc: vi.fn().mockImplementation(rpcImpl),
  } as unknown as CivicSupabaseClient
}

describe('verifyAdminAccess', () => {
  it('returns isAdmin true only when is_admin RPC returns true', async () => {
    const client = mockClient(async () => ({ data: true, error: null }))
    await expect(verifyAdminAccess(client)).resolves.toEqual({
      ok: true,
      isAdmin: true,
    })
    expect(client.rpc).toHaveBeenCalledWith('is_admin')
  })

  it('returns isAdmin false for non-admin RPC results', async () => {
    const client = mockClient(async () => ({ data: false, error: null }))
    await expect(verifyAdminAccess(client)).resolves.toEqual({
      ok: true,
      isAdmin: false,
    })
  })

  it('does not treat RPC errors as admin access', async () => {
    const client = mockClient(async () => ({
      data: null,
      error: { message: 'boom' },
    }))
    await expect(verifyAdminAccess(client)).resolves.toEqual({
      ok: false,
      isAdmin: false,
      error: 'boom',
    })
  })
})
