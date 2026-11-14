import { ExternalLink, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { MunicipalRecord } from '../../types/municipalRecord'
import { ResidentFeedbackForm } from './ResidentFeedbackForm'
import { buildRecordPreviewSections } from './recordPreview'
import styles from './SelectedRecordPreview.module.css'

interface SelectedRecordPreviewProps {
  record: MunicipalRecord
  onClose: () => void
  /** Whether feedback can be persisted (published Supabase row exists). */
  canPersistFeedback?: boolean
}

export function SelectedRecordPreview({
  record,
  onClose,
  canPersistFeedback = false,
}: SelectedRecordPreviewProps) {
  const preview = buildRecordPreviewSections(record)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <aside
      className={styles.panel}
      role="dialog"
      aria-modal="false"
      aria-labelledby={`record-preview-title-${record.id}`}
      // Keyed by record id in the parent so content never goes stale on switch.
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            {record.dataOrigin === 'open_data'
              ? 'Park & recreation facility project'
              : 'Selected municipal record'}
          </p>
          <h2 id={`record-preview-title-${record.id}`} className={styles.title}>
            {preview.title}
          </h2>
        </div>
        <button
          ref={closeRef}
          type="button"
          className={styles.close}
          aria-label="Close record preview"
          onClick={onClose}
        >
          <X size={16} strokeWidth={2.25} aria-hidden="true" />
        </button>
      </header>

      <div className={styles.body}>
        <div className={styles.metaRow}>
          <span className={styles.chip}>{preview.categoryLabel}</span>
          <span className={styles.chip}>{preview.recordTypeLabel}</span>
        </div>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Location</h3>
          <p className={styles.sectionBody}>{preview.municipality}</p>
          {preview.affectedArea ? (
            <p className={styles.sectionBody}>{preview.affectedArea}</p>
          ) : null}
        </section>

        <div className={styles.split}>
          <div className={styles.statusCard}>
            <p className={styles.statusLabel}>Municipal status</p>
            <p className={styles.statusValue}>{preview.projectStatusLabel}</p>
            {preview.decisionStatusLabel ? (
              <p className={styles.note}>
                Decision outcome: {preview.decisionStatusLabel}
              </p>
            ) : null}
          </div>
          <div className={styles.statusCard}>
            <p className={styles.statusLabel}>Public feedback</p>
            <p className={styles.statusValue}>{preview.participationLabel}</p>
            {preview.participationDeadline ? (
              <p className={styles.note}>
                Verified deadline: {preview.participationDeadline}
              </p>
            ) : null}
            {preview.participationVerifiedOn ? (
              <p className={styles.note}>
                Participation info verified: {preview.participationVerifiedOn}
              </p>
            ) : null}
          </div>
        </div>

        {preview.summary ? (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Summary</h3>
            <p className={styles.sectionBody}>{preview.summary}</p>
          </section>
        ) : null}

        {preview.sourceStatedImpacts.length > 0 ? (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Documented impacts</h3>
            <ul className={styles.list}>
              {preview.sourceStatedImpacts.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {preview.otherImpacts.length > 0 ? (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Other noted impacts</h3>
            <ul className={styles.list}>
              {preview.otherImpacts.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {preview.uncertainties.length > 0 ? (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Uncertainties</h3>
            <ul className={styles.list}>
              {preview.uncertainties.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {record.sources.length > 0 ? (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Sources</h3>
            <ul className={styles.sourceList}>
              {record.sources.map((source) => (
                <li key={`${source.label}-${source.href}`}>
                  <a
                    className={styles.sourceLink}
                    href={source.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.label}
                    <ExternalLink
                      size={15}
                      strokeWidth={2.25}
                      aria-hidden="true"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : preview.officialSourceUrl ? (
          <a
            className={styles.sourceLink}
            href={preview.officialSourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            View official source
            <ExternalLink size={15} strokeWidth={2.25} aria-hidden="true" />
          </a>
        ) : null}

        {preview.lastVerified ? (
          <p className={styles.footerMeta}>
            Record last verified: {preview.lastVerified}
          </p>
        ) : record.dataOrigin === 'open_data' ? (
          <p className={styles.footerMeta}>
            Source: City of Toronto Open Data extract (not a live feed).
          </p>
        ) : null}

        <ResidentFeedbackForm
          record={record}
          canPersistFeedback={canPersistFeedback}
        />
      </div>
    </aside>
  )
}
