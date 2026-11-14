import { MapPinned } from 'lucide-react'
import type { MapCameraApi } from '../../types/map'
import { LocationSearch } from './LocationSearch'
import styles from './TopNav.module.css'

interface TopNavProps {
  locationLabel: string
  camera: MapCameraApi | null
  onSearchResolved?: (label: string) => void
}

export function TopNav({
  locationLabel,
  camera,
  onSearchResolved,
}: TopNavProps) {
  return (
    <header className={styles.nav} role="banner">
      <div className={styles.brandRow}>
        <div className={styles.mark} aria-hidden="true">
          <img
            className={styles.markImage}
            src="/favicon.png"
            alt=""
            width={28}
            height={28}
            decoding="async"
          />
        </div>
        <div className={styles.brandText}>
          <div className={styles.wordmark}>CivicSync</div>
          <div className={styles.tagline}>Municipal decision explorer</div>
        </div>
      </div>

      <LocationSearch camera={camera} onResolvedLabel={onSearchResolved} />

      <div className={styles.place} aria-label="Focused neighbourhood">
        <MapPinned size={14} strokeWidth={2.25} aria-hidden="true" />
        <span>{locationLabel}</span>
      </div>
    </header>
  )
}
