import { describe, expect, it } from 'vitest'
import type { MunicipalRecord } from '../../types/municipalRecord'
import { createEmptyProposalForm, formStateToMunicipalRecord } from './proposalForm'
import { slugifyProposalId, validateProposal } from './validateProposal'

function validRecord(): MunicipalRecord {
  const form = createEmptyProposalForm('Kennedy rental notice')
  form.id = 'toronto-notice-example'
  form.title = 'Kennedy rental notice'
  form.description = 'A plain-language summary.'
  form.categoryRaw = 'rental_housing'
  form.categoryKind = 'housing'
  form.recordType = 'public_meeting_notice'
  form.projectStatus = 'public_meeting_scheduled'
  form.decisionStatus = 'pending'
  form.decisionStage = 'committee_review'
  form.participationAvailability = 'open'
  form.canParticipateNow = 'true'
  form.sourcesText =
    'City notice|https://example.com/notice|2026-11-14'
  return formStateToMunicipalRecord(form)
}

describe('validateProposal', () => {
  it('accepts a complete proposal', () => {
    const result = validateProposal(validRecord(), {
      publicationStatus: 'draft',
    })
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects missing required fields and bad coordinates', () => {
    const record = validRecord()
    record.title = ''
    record.location.coordinates = [200, 100]
    const result = validateProposal(record)
    expect(result.ok).toBe(false)
    expect(result.errors.some((error) => /Title/i.test(error))).toBe(true)
    expect(result.errors.some((error) => /Longitude/i.test(error))).toBe(true)
  })

  it('rejects invalid source URLs', () => {
    const record = validRecord()
    record.sources = [
      { label: 'Bad', href: 'notaurl', verifiedOn: '2026-11-14' },
    ]
    const result = validateProposal(record)
    expect(result.ok).toBe(false)
    expect(result.errors.some((error) => /URL/i.test(error))).toBe(true)
  })

  it('requires explicit canParticipateNow when publishing an open record', () => {
    const record = validRecord()
    record.canParticipateNow = null
    const draft = validateProposal(record, { publicationStatus: 'draft' })
    const published = validateProposal(record, {
      publicationStatus: 'published',
    })
    expect(draft.ok).toBe(true)
    expect(published.ok).toBe(false)
  })
})

describe('slugifyProposalId', () => {
  it('creates a stable lowercase slug', () => {
    expect(slugifyProposalId('Kennedy–Danforth Notice!')).toBe(
      'kennedy-danforth-notice',
    )
  })
})
