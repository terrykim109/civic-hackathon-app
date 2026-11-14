import { describe, expect, it } from 'vitest'
import { adminGateRedirectPath, resolveAdminGate } from './adminGate'

describe('resolveAdminGate', () => {
  it('reports unavailable when Supabase is not configured', () => {
    expect(
      resolveAdminGate({
        clientConfigured: false,
        authLoading: false,
        adminLoading: false,
        hasSession: false,
        isAdmin: false,
      }),
    ).toBe('unavailable')
  })

  it('waits while auth or admin verification is loading', () => {
    expect(
      resolveAdminGate({
        clientConfigured: true,
        authLoading: true,
        adminLoading: false,
        hasSession: false,
        isAdmin: null,
      }),
    ).toBe('loading')

    expect(
      resolveAdminGate({
        clientConfigured: true,
        authLoading: false,
        adminLoading: true,
        hasSession: true,
        isAdmin: null,
      }),
    ).toBe('loading')
  })

  it('requires a session before allowing admin', () => {
    expect(
      resolveAdminGate({
        clientConfigured: true,
        authLoading: false,
        adminLoading: false,
        hasSession: false,
        isAdmin: false,
      }),
    ).toBe('unauthenticated')
  })

  it('forbids signed-in non-admins', () => {
    expect(
      resolveAdminGate({
        clientConfigured: true,
        authLoading: false,
        adminLoading: false,
        hasSession: true,
        isAdmin: false,
      }),
    ).toBe('forbidden')
  })

  it('allows verified administrators', () => {
    expect(
      resolveAdminGate({
        clientConfigured: true,
        authLoading: false,
        adminLoading: false,
        hasSession: true,
        isAdmin: true,
      }),
    ).toBe('allowed')
  })
})

describe('adminGateRedirectPath', () => {
  it('sends unauthenticated and forbidden users to login', () => {
    expect(adminGateRedirectPath('unauthenticated')).toBe('/admin/login')
    expect(adminGateRedirectPath('forbidden')).toBe(
      '/admin/login?error=forbidden',
    )
    expect(adminGateRedirectPath('unavailable')).toBe(
      '/admin/login?error=unavailable',
    )
    expect(adminGateRedirectPath('allowed')).toBeNull()
    expect(adminGateRedirectPath('loading')).toBeNull()
  })
})
