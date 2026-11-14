import { describe, expect, it } from 'vitest'
import { validateLoginInput } from './loginValidation'

describe('validateLoginInput', () => {
  it('requires email and password', () => {
    expect(validateLoginInput('', 'password1')).toMatch(/email/i)
    expect(validateLoginInput('admin@example.com', '')).toMatch(/password/i)
  })

  it('rejects short passwords', () => {
    expect(validateLoginInput('admin@example.com', 'short')).toMatch(/8/)
  })

  it('accepts plausible credentials', () => {
    expect(validateLoginInput('admin@example.com', 'password1')).toBeNull()
  })
})
