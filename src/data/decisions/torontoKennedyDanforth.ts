import type { MunicipalRecord } from '../../types/municipalRecord'
import notice8007SnapshotUrl from '../notice8007.html?url'

/**
 * Curated enrichments for the Kennedy–Danforth rental demolition notice.
 * Uses the same id as the GeoJSON feature so merge-by-id avoids duplicates.
 */
export const torontoKennedyDanforthEnrichment: MunicipalRecord = {
  id: 'toronto-notice-8007-rental-demolition',
  title: 'Kennedy–Danforth: rental demolition proposal',
  description:
    'A Rental Housing Demolition application proposes demolishing eight existing rental dwelling units at 636–646 Danforth Road and constructing a 23-storey mixed-use building with 276 residential units, including eight replacement rental units.',
  municipality: 'Toronto',
  categoryRaw: 'rental_housing',
  categoryKind: 'housing',
  recordType: 'public_meeting_notice',
  projectStatus: 'public_meeting_scheduled',
  gisSourceStatus: null,
  decisionStatus: 'pending',
  decisionStage: 'committee_review',
  participationAvailability: 'open',
  canParticipateNow: true,
  participationOptions: [],
  events: [],
  potentialImpacts: [],
  uncertainties: [],
  location: {
    coordinates: [-79.26078934, 43.715763632],
    precision: 'approximate',
    locationRole: 'official_representative_point_not_impact_boundary',
    affectedArea: '411–415 Kennedy Road and 636–646 Danforth Road',
    note: 'Representative point — not a surveyed property boundary.',
  },
  sources: [
    {
      label: 'City of Toronto public notice',
      href: 'https://secure.toronto.ca/nm/api/individual/notice/8007.do',
      verifiedOn: '2026-11-13',
    },
    {
      label: 'Local notice snapshot (bundled)',
      href: notice8007SnapshotUrl,
      verifiedOn: '2026-11-13',
    },
    {
      label: 'Preliminary planning report (2021)',
      href: 'https://www.toronto.ca/legdocs/mmis/2021/sc/bgrd/backgroundfile-165240.pdf',
      verifiedOn: '2026-11-13',
    },
  ],
  evidence: [],
  relatedProcesses: [
    {
      id: 'zoning-amendment-20-211279',
      label: 'Related zoning by-law amendment',
      status: 'approved',
      note: 'Zoning By-law Amendment for these lands has been approved by the Ontario Land Tribunal. Separate from the rental demolition permit.',
      sources: [
        {
          label: 'City of Toronto public notice',
          href: 'https://secure.toronto.ca/nm/api/individual/notice/8007.do',
          verifiedOn: '2026-11-13',
        },
      ],
    },
    {
      id: 'rental-demolition-20-211505',
      label: 'Rental housing demolition application',
      status: 'pending',
      note: 'Municipal approval still required for demolition of eight rental units.',
      sources: [
        {
          label: 'City of Toronto public notice',
          href: 'https://secure.toronto.ca/nm/api/individual/notice/8007.do',
          verifiedOn: '2026-11-13',
        },
      ],
    },
  ],
  metrics: [
    {
      label: 'Existing rental units',
      value: '8',
      detail: 'Proposed for demolition at 636–646 Danforth Road',
    },
    {
      label: 'Proposed residential units',
      value: '276',
      detail: '23-storey mixed-use building',
    },
    {
      label: 'Replacement rentals',
      value: '8',
      detail: 'Included in the proposed building',
    },
  ],
  dataOrigin: 'curated',
}

/** @deprecated Use torontoKennedyDanforthEnrichment — kept name for older imports. */
export const torontoKennedyDanforthRental = torontoKennedyDanforthEnrichment
