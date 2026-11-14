import { describe, expect, it } from 'vitest'
import type { MunicipalRecord } from '../../types/municipalRecord'
import {
  evaluateFeedbackAvailability,
  isFeedbackFormAvailable,
} from './feedbackAvailability'

function base(
  overrides: Partial<MunicipalRecord> = {},
): Pick<
  MunicipalRecord,
  | 'participationAvailability'
  | 'canParticipateNow'
  | 'participationDeadline'
  | 'participationOptions'
> {
  return {
    participationAvailability: 'open',
    canParticipateNow: true,
    participationDeadline: '2099-12-31',
    participationOptions: [],
    ...overrides,
  }
}

describe('evaluateFeedbackAvailability', () => {
  const now = new Date('2026-11-14T12:00:00.000Z')

  it('allows feedback only when explicitly open and confirmed', () => {
    const result = evaluateFeedbackAvailability(base(), now)
    expect(result.available).toBe(true)
    expect(result.reason).toBe('available')
    expect(result.collectionNote).toMatch(/CivicLens/i)
  })

  it('blocks unknown / closed / not_open availability', () => {
    expect(
      evaluateFeedbackAvailability(base({ participationAvailability: 'unknown' }), now)
        .reason,
    ).toBe('participation_unknown')
    expect(
      evaluateFeedbackAvailability(base({ participationAvailability: 'closed' }), now)
        .reason,
    ).toBe('participation_closed')
    expect(
      evaluateFeedbackAvailability(base({ participationAvailability: 'not_open' }), now)
        .reason,
    ).toBe('participation_not_open')
  })

  it('does not treat null canParticipateNow as permission', () => {
    const result = evaluateFeedbackAvailability(
      base({ canParticipateNow: null }),
      now,
    )
    expect(result.available).toBe(false)
    expect(result.reason).toBe('can_participate_not_confirmed')
  })

  it('blocks when canParticipateNow is false even if availability is open', () => {
    expect(
      isFeedbackFormAvailable(base({ canParticipateNow: false }), now),
    ).toBe(false)
  })

  it('blocks after a passed deadline', () => {
    const result = evaluateFeedbackAvailability(
      base({ participationDeadline: '2020-01-01' }),
      now,
    )
    expect(result.available).toBe(false)
    expect(result.reason).toBe('deadline_passed')
  })

  it('blocks ambiguous deadlines instead of assuming open', () => {
    const result = evaluateFeedbackAvailability(
      base({ participationDeadline: 'not-a-date' }),
      now,
    )
    expect(result.available).toBe(false)
    expect(result.reason).toBe('deadline_passed')
  })

  it('respects participation option opensOn and deadlines', () => {
    expect(
      evaluateFeedbackAvailability(
        base({
          participationOptions: [
            {
              method: 'email',
              availability: 'open',
              opensOn: '2099-01-01',
            },
          ],
        }),
        now,
      ).reason,
    ).toBe('window_not_yet_open')

    expect(
      evaluateFeedbackAvailability(
        base({
          participationOptions: [
            {
              method: 'email',
              availability: 'open',
              opensOn: '2020-01-01',
              deadline: '2020-06-01',
            },
          ],
        }),
        now,
      ).reason,
    ).toBe('deadline_passed')
  })

  it('ignores closed options when evaluating windows', () => {
    const result = evaluateFeedbackAvailability(
      base({
        participationOptions: [
          {
            method: 'past hearing',
            availability: 'closed',
            deadline: '2020-01-01',
          },
        ],
      }),
      now,
    )
    expect(result.available).toBe(true)
  })
})
