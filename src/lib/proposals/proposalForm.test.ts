import { describe, expect, it } from 'vitest'
import {
  createEmptyProposalForm,
  formStateToMunicipalRecord,
  municipalRecordToFormState,
} from './proposalForm'

describe('proposalForm mapping', () => {
  it('round-trips core MunicipalRecord fields through the form model', () => {
    const form = createEmptyProposalForm('Sample proposal')
    form.id = 'sample-proposal'
    form.title = 'Sample proposal'
    form.description = 'Description text'
    form.categoryRaw = 'parks'
    form.categoryKind = 'parks'
    form.recordType = 'project_consultation'
    form.projectStatus = 'design_consultation'
    form.decisionStatus = 'pending'
    form.decisionStage = 'public_consultation'
    form.participationAvailability = 'not_open'
    form.canParticipateNow = 'false'
    form.longitude = '-79.4'
    form.latitude = '43.7'
    form.impactsText = 'source_stated|Tree removal\nNoise during construction'
    form.uncertaintiesText = 'Final design may change'
    form.sourcesText = 'Project page|https://example.com/project|2026-11-14'
    form.eventsText = 'open_house|2026-12-01|Community room'

    const record = formStateToMunicipalRecord(form)
    expect(record.id).toBe('sample-proposal')
    expect(record.location.coordinates).toEqual([-79.4, 43.7])
    expect(record.canParticipateNow).toBe(false)
    expect(record.potentialImpacts).toEqual([
      { kind: 'source_stated', text: 'Tree removal' },
      { text: 'Noise during construction' },
    ])
    expect(record.sources[0]?.href).toBe('https://example.com/project')

    const back = municipalRecordToFormState(record)
    expect(formStateToMunicipalRecord(back)).toEqual(record)
  })
})
