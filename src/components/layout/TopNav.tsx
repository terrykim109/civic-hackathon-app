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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 16V8l7-4 7 4v8l-7 4-7-4Z"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <circle cx="12" cy="11" r="2" fill="currentColor" />
          </svg>
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
