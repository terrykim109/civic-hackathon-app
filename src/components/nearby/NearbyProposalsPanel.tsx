import { ChevronDown, ChevronUp, X } from 'lucide-react'
import type { NearbyProposalResult } from '../../lib/nearby/findNearbyProposals'
import {
  formatNearbyDistance,
  formatNearbyRadiusLabel,
  NEARBY_RADIUS_MAX_M,
  NEARBY_RADIUS_MIN_M,
  NEARBY_RADIUS_STEP_M,
} from '../../lib/nearby/nearbyRadius'
import { humanizeToken } from '../records/recordPreview'
import type { MunicipalRecord } from '../../types/municipalRecord'
import styles from './NearbyProposalsPanel.module.css'

interface NearbyProposalsPanelProps {
  searchLabel: string
  radiusMeters: number
  results: readonly NearbyProposalResult[]
  collapsed: boolean
  selectedRecordId: string | null
  onRadiusChange: (meters: number) => void
  onToggleCollapsed: () => void
  onClose: () => void
  onSelect: (record: MunicipalRecord) => void
  onExploreArea?: () => void
}

export function NearbyProposalsPanel({
  searchLabel,
  radiusMeters,
  results,
  collapsed,
  selectedRecordId,
  onRadiusChange,
  onToggleCollapsed,
  onClose,
  onSelect,
  onExploreArea,
}: NearbyProposalsPanelProps) {
  const radiusLabel = formatNearbyRadiusLabel(radiusMeters)
  const count = results.length

  return (
    <aside
      className={`${styles.panel}${collapsed ? ` ${styles.collapsed}` : ''}`}
      aria-label="Nearby municipal proposals"
    >
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>Nearby proposals</p>
          <h2 className={styles.title}>
            {count === 1 ? '1 proposal' : `${count} proposals`} within{' '}
            <span className={styles.radiusHighlight}>{radiusLabel}</span>
          </h2>
          <p className={styles.searchLabel}>{searchLabel}</p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.iconButton}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand nearby proposals' : 'Collapse nearby proposals'}
            onClick={onToggleCollapsed}
          >
            {collapsed ? (
              <ChevronUp size={16} strokeWidth={2.25} aria-hidden="true" />
            ) : (
              <ChevronDown size={16} strokeWidth={2.25} aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Close nearby proposals"
            onClick={onClose}
          >
            <X size={16} strokeWidth={2.25} aria-hidden="true" />
          </button>
        </div>
      </header>

      {!collapsed ? (
        <div className={styles.body}>
          {onExploreArea ? (
            <button
              type="button"
              className={styles.explore}
              onClick={onExploreArea}
            >
              Explore this area
            </button>
          ) : null}
          <div className={styles.sliderBlock}>
            <div className={styles.sliderTop}>
              <label className={styles.sliderLabel} htmlFor="nearby-radius-slider">
                Search radius
              </label>
              <p className={styles.sliderValue} aria-live="polite">
                {radiusLabel}
              </p>
            </div>
            <input
              id="nearby-radius-slider"
              className={styles.slider}
              type="range"
              min={NEARBY_RADIUS_MIN_M}
              max={NEARBY_RADIUS_MAX_M}
              step={NEARBY_RADIUS_STEP_M}
              value={radiusMeters}
              onChange={(event) =>
                onRadiusChange(Number(event.currentTarget.value))
              }
            />
            <div className={styles.sliderEnds}>
              <span>{formatNearbyDistance(NEARBY_RADIUS_MIN_M)}</span>
              <span>{formatNearbyDistance(NEARBY_RADIUS_MAX_M)}</span>
            </div>
            <p className={styles.disclaimer}>
              Distances are straight-line from the searched location, not walking
              or driving routes. Proximity does not mean you are affected by a
              proposal. Points are representative record locations.
            </p>
          </div>

          {count === 0 ? (
            <p className={styles.empty} role="status">
              No municipal proposals found within {radiusLabel} of this search.
              Try increasing the radius.
            </p>
          ) : (
            <ul className={styles.list}>
              {results.map(({ record, distanceMeters }) => {
                const active = selectedRecordId === record.id
                return (
                  <li key={record.id}>
                    <button
                      type="button"
                      className={`${styles.item}${
                        active ? ` ${styles.itemActive}` : ''
                      }`}
                      onClick={() => onSelect(record)}
                      aria-current={active ? 'true' : undefined}
                    >
                      <div className={styles.itemTop}>
                        <span className={styles.itemTitle}>{record.title}</span>
                        <span className={styles.distance}>
                          {formatNearbyDistance(distanceMeters)}
                        </span>
                      </div>
                      <span className={styles.itemMeta}>
                        {humanizeToken(record.categoryRaw)} ·{' '}
                        {humanizeToken(record.projectStatus)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : (
        <p className={styles.collapsedHint}>
          Tap expand to browse nearby results again.
        </p>
      )}
    </aside>
  )
}
