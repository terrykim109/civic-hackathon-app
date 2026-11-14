import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { MUNICIPAL_RECORDS } from './decisions'
import {
  fetchPublishedMunicipalRecords,
  mergeStaticAndPublishedRecords,
} from '../lib/proposals/fetchPublishedRecords'
import type { MunicipalRecord } from '../types/municipalRecord'

export type MapRecordsLoadState =
  | 'static_only'
  | 'loading'
  | 'ready'
  | 'error'

export interface MapMunicipalRecordsState {
  records: readonly MunicipalRecord[]
  loadState: MapRecordsLoadState
  publishedCount: number
  errorMessage: string | null
}

/**
 * Public map record source: static GeoJSON/curated set plus published Supabase rows.
 * Falls back to static records when Supabase is unset or the request fails.
 */
export function useMapMunicipalRecords(): MapMunicipalRecordsState {
  const { client, clientConfigured } = useAuth()
  const [published, setPublished] = useState<MunicipalRecord[]>([])
  const [loadState, setLoadState] = useState<MapRecordsLoadState>(() =>
    clientConfigured && client ? 'loading' : 'static_only',
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!client) {
      return
    }

    let cancelled = false

    const load = async () => {
      setLoadState('loading')
      setErrorMessage(null)
      const result = await fetchPublishedMunicipalRecords(client)
      if (cancelled) return

      if (!result.ok) {
        setPublished([])
        setErrorMessage(result.error)
        setLoadState('error')
        return
      }

      setPublished(result.records)
      setLoadState('ready')
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [client])

  return {
    records: mergeStaticAndPublishedRecords(MUNICIPAL_RECORDS, published),
    loadState,
    publishedCount: published.length,
    errorMessage,
  }
}
