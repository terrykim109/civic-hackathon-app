import type { MunicipalRecord } from '../../types/municipalRecord'
import type { CivicSupabaseClient } from '../supabase/client'
import {
  municipalRecordToRow,
  rowToMunicipalRecord,
} from '../supabase/municipalRecordMapper'
import type { MunicipalRecordRow, PublicationStatus } from '../supabase/types'
import { validateProposal } from './validateProposal'

export interface ProposalListItem {
  id: string
  title: string
  municipality: string
  publicationStatus: PublicationStatus
  updatedAt: string
  participationAvailability: string
  categoryKind: string
}

export interface ProposalDetail {
  record: MunicipalRecord
  publicationStatus: PublicationStatus
  createdAt: string
  updatedAt: string
}

export type ProposalApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

function mapListItem(row: MunicipalRecordRow): ProposalListItem {
  return {
    id: row.id,
    title: row.title,
    municipality: row.municipality,
    publicationStatus: row.publication_status,
    updatedAt: row.updated_at,
    participationAvailability: row.participation_availability,
    categoryKind: row.category_kind,
  }
}

export async function listProposals(
  client: CivicSupabaseClient,
): Promise<ProposalApiResult<ProposalListItem[]>> {
  const { data, error } = await client
    .from('municipal_records')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    return {
      ok: false,
      error: error.message || 'Could not load proposals.',
    }
  }

  return {
    ok: true,
    data: (data as MunicipalRecordRow[]).map(mapListItem),
  }
}

export async function getProposal(
  client: CivicSupabaseClient,
  id: string,
): Promise<ProposalApiResult<ProposalDetail>> {
  const { data, error } = await client
    .from('municipal_records')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return { ok: false, error: error.message || 'Could not load proposal.' }
  }
  if (!data) {
    return { ok: false, error: 'Proposal not found.' }
  }

  const row = data as MunicipalRecordRow
  return {
    ok: true,
    data: {
      record: rowToMunicipalRecord(row),
      publicationStatus: row.publication_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  }
}

export async function saveProposal(
  client: CivicSupabaseClient,
  record: MunicipalRecord,
  publicationStatus: PublicationStatus,
  actorUserId: string | null,
): Promise<ProposalApiResult<ProposalDetail>> {
  const validation = validateProposal(record, { publicationStatus })
  if (!validation.ok) {
    return { ok: false, error: validation.errors.join(' ') }
  }

  const payload = {
    ...municipalRecordToRow(record, publicationStatus),
    updated_by: actorUserId,
  }

  const { data: existing, error: existingError } = await client
    .from('municipal_records')
    .select('id, created_by')
    .eq('id', record.id)
    .maybeSingle()

  if (existingError) {
    return {
      ok: false,
      error: existingError.message || 'Could not check existing proposal.',
    }
  }

  if (!existing) {
    const insertPayload = {
      ...payload,
      created_by: actorUserId,
    }
    // Cast: hand-written Database typings are not full Supabase codegen output.
    const { data, error } = await client
      .from('municipal_records')
      .insert(insertPayload as never)
      .select('*')
      .single()

    if (error) {
      return {
        ok: false,
        error: error.message || 'Could not create proposal (check admin RLS).',
      }
    }

    const row = data as MunicipalRecordRow
    return {
      ok: true,
      data: {
        record: rowToMunicipalRecord(row),
        publicationStatus: row.publication_status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    }
  }

  const { data, error } = await client
    .from('municipal_records')
    .update(payload as never)
    .eq('id', record.id)
    .select('*')
    .single()

  if (error) {
    return {
      ok: false,
      error: error.message || 'Could not update proposal (check admin RLS).',
    }
  }

  const row = data as MunicipalRecordRow
  return {
    ok: true,
    data: {
      record: rowToMunicipalRecord(row),
      publicationStatus: row.publication_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  }
}

export async function setProposalPublicationStatus(
  client: CivicSupabaseClient,
  id: string,
  publicationStatus: PublicationStatus,
  actorUserId: string | null,
): Promise<ProposalApiResult<ProposalDetail>> {
  const loaded = await getProposal(client, id)
  if (!loaded.ok) return loaded
  return saveProposal(
    client,
    loaded.data.record,
    publicationStatus,
    actorUserId,
  )
}
