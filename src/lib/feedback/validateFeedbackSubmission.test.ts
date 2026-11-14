import { describe, expect, it } from 'vitest'
import { validateFeedbackSubmission } from './validateFeedbackSubmission'

describe('validateFeedbackSubmission', () => {
  it('accepts a minimal valid payload', () => {
    const result = validateFeedbackSubmission({
      municipalRecordId: 'rec-1',
      comment: '  Please keep the playground.  ',
    })
    expect(result.ok).toBe(true)
    expect(result.cleaned).toEqual({
      municipalRecordId: 'rec-1',
      comment: 'Please keep the playground.',
      perspective: null,
      contactName: null,
      contactEmail: null,
    })
  })

  it('requires comment and record id', () => {
    const result = validateFeedbackSubmission({
      municipalRecordId: '  ',
      comment: '',
    })
    expect(result.ok).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Municipal record id is required.',
        'Feedback comment is required.',
      ]),
    )
  })

  it('rejects invalid email and overlong fields', () => {
    const result = validateFeedbackSubmission({
      municipalRecordId: 'rec-1',
      comment: 'ok',
      contactEmail: 'not-an-email',
      perspective: 'x'.repeat(2001),
      contactName: 'y'.repeat(201),
    })
    expect(result.ok).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(3)
  })

  it('rejects honeypot fills without revealing the trap', () => {
    const result = validateFeedbackSubmission({
      municipalRecordId: 'rec-1',
      comment: 'Looks fine',
      website: 'https://spam.example',
    })
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatch(/Unable to submit/i)
  })
})
