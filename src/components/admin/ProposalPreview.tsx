import type { MunicipalRecord } from '../../types/municipalRecord'
import { evaluateFeedbackAvailability } from '../../lib/feedback/feedbackAvailability'
import { buildRecordPreviewSections } from '../records/recordPreview'
import type { PublicationStatus } from '../../lib/supabase/types'
import styles from './ProposalPreview.module.css'

interface ProposalPreviewProps {
  record: MunicipalRecord
  publicationStatus: PublicationStatus
}

export function ProposalPreview({
  record,
  publicationStatus,
}: ProposalPreviewProps) {
  const preview = buildRecordPreviewSections(record)
  const feedback = evaluateFeedbackAvailability(record)

  return (
    <section className={styles.preview} aria-label="Proposal preview">
      <header className={styles.header}>
        <p className={styles.eyebrow}>
          Preview · CivicLens status: {publicationStatus}
        </p>
        <h2 className={styles.title}>{preview.title}</h2>
        <p className={styles.meta}>
          {preview.municipality}
          {preview.affectedArea ? ` · ${preview.affectedArea}` : ''}
        </p>
      </header>

      <div className={styles.chips}>
        <span className={styles.chip}>{preview.categoryLabel}</span>
        <span className={styles.chip}>{preview.recordTypeLabel}</span>
        <span className={styles.chip}>{preview.projectStatusLabel}</span>
      </div>

      {preview.summary ? <p className={styles.body}>{preview.summary}</p> : null}

      <div className={styles.grid}>
        <div>
          <h3 className={styles.sectionTitle}>Municipal decision</h3>
          <p className={styles.body}>
            {preview.decisionStatusLabel ?? 'Unknown'}
          </p>
        </div>
        <div>
          <h3 className={styles.sectionTitle}>Participation (source data)</h3>
          <p className={styles.body}>{preview.participationLabel}</p>
          {preview.participationDeadline ? (
            <p className={styles.note}>
              Deadline: {preview.participationDeadline}
            </p>
          ) : null}
        </div>
      </div>

      <div className={styles.callout}>
        <h3 className={styles.sectionTitle}>Future CivicLens feedback form</h3>
        <p className={styles.body}>
          {feedback.available
            ? 'Would be available based on participation fields and dates.'
            : `Would not be available (${feedback.reason.replaceAll('_', ' ')}).`}
        </p>
        <p className={styles.note}>{feedback.collectionNote}</p>
      </div>

      {preview.sourceStatedImpacts.length > 0 ? (
        <div>
          <h3 className={styles.sectionTitle}>Documented impacts</h3>
          <ul className={styles.list}>
            {preview.sourceStatedImpacts.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {preview.uncertainties.length > 0 ? (
        <div>
          <h3 className={styles.sectionTitle}>Uncertainties</h3>
          <ul className={styles.list}>
            {preview.uncertainties.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {record.sources.length > 0 ? (
        <div>
          <h3 className={styles.sectionTitle}>Sources</h3>
          <ul className={styles.list}>
            {record.sources.map((source) => (
              <li key={`${source.label}-${source.href}`}>
                {source.label}: {source.href}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className={styles.note}>{record.location.note}</p>
    </section>
  )
}
