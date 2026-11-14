import type { MapRecordsLoadState } from '../../data/useMapMunicipalRecords'
import styles from './MapRecordsStatus.module.css'

interface MapRecordsStatusProps {
  loadState: MapRecordsLoadState
  publishedCount: number
  errorMessage: string | null
}

/**
 * Non-blocking status for published-proposal sync. Never replaces the map.
 */
export function MapRecordsStatus({
  loadState,
  publishedCount,
  errorMessage,
}: MapRecordsStatusProps) {
  if (loadState === 'static_only') return null

  if (loadState === 'loading') {
    return (
      <div className={styles.banner} role="status">
        Loading published proposals…
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className={`${styles.banner} ${styles.error}`} role="status">
        Could not refresh published proposals
        {errorMessage ? `: ${errorMessage}` : '.'} Showing bundled records.
      </div>
    )
  }

  if (publishedCount === 0) {
    return (
      <div className={styles.banner} role="status">
        No published admin proposals yet — showing bundled records.
      </div>
    )
  }

  return (
    <div className={styles.banner} role="status">
      Showing {publishedCount} published proposal
      {publishedCount === 1 ? '' : 's'} from CivicLens.
    </div>
  )
}
