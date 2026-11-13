import { MapPinned } from 'lucide-react'
import styles from './TopNav.module.css'

interface TopNavProps {
  locationLabel: string
}

export function TopNav({ locationLabel }: TopNavProps) {
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

      <div className={styles.place} aria-label="Focused neighbourhood">
        <MapPinned size={14} strokeWidth={2.25} aria-hidden="true" />
        <span>{locationLabel}</span>
      </div>
    </header>
  )
}
