import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/useAuth'
import {
  evaluateFeedbackAvailability,
} from '../../lib/feedback/feedbackAvailability'
import { submitResidentFeedback } from '../../lib/feedback/submitResidentFeedback'
import type { MunicipalRecord } from '../../types/municipalRecord'
import styles from './ResidentFeedbackForm.module.css'

interface ResidentFeedbackFormProps {
  record: MunicipalRecord
  /**
   * True when this id exists as a published Supabase municipal_records row.
   * Static-only map records can look "open" but cannot persist feedback yet.
   */
  canPersistFeedback?: boolean
}

export function ResidentFeedbackForm({
  record,
  canPersistFeedback = false,
}: ResidentFeedbackFormProps) {
  const { client, clientConfigured } = useAuth()
  const availability = evaluateFeedbackAvailability(record)
  const noticeId = useId()
  const successHeadingRef = useRef<HTMLHeadingElement>(null)

  const [comment, setComment] = useState('')
  const [perspective, setPerspective] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittedId, setSubmittedId] = useState<string | null>(null)

  useEffect(() => {
    if (submittedId) {
      successHeadingRef.current?.focus()
    }
  }, [submittedId])

  if (!availability.available) {
    return null
  }

  if (!canPersistFeedback) {
    return (
      <section className={styles.section} aria-label="Feedback not available yet">
        <h3 className={styles.title}>Feedback not open in CivicLens yet</h3>
        <p className={styles.notice}>
          This notice shows open municipal participation, but it is not published
          as a CivicLens proposal in Supabase yet. Publish it from the admin
          area (same record id) to accept resident submissions here.
        </p>
      </section>
    )
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!client) {
      setError(
        clientConfigured
          ? 'Feedback service is unavailable.'
          : 'Supabase is not configured, so feedback cannot be submitted yet.',
      )
      return
    }

    setSubmitting(true)
    const result = await submitResidentFeedback(client, {
      municipalRecordId: record.id,
      comment,
      perspective,
      contactName,
      contactEmail,
      website,
    })
    setSubmitting(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setSubmittedId(result.id)
    setComment('')
    setPerspective('')
    setContactName('')
    setContactEmail('')
    setWebsite('')
  }

  if (submittedId) {
    return (
      <section className={styles.section} aria-label="Feedback submitted">
        <h3
          ref={successHeadingRef}
          className={styles.title}
          tabIndex={-1}
        >
          Feedback received
        </h3>
        <p className={styles.body}>
          Thank you. CivicLens administrators can review your submission. It was
          not sent automatically to the municipality and is not an official
          municipal consultation submission.
        </p>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => setSubmittedId(null)}
        >
          Submit more feedback
        </button>
      </section>
    )
  }

  return (
    <section className={styles.section} aria-labelledby={`feedback-title-${record.id}`}>
      <h3 id={`feedback-title-${record.id}`} className={styles.title}>
        Share feedback with CivicLens
      </h3>
      <div id={noticeId} className={styles.notices}>
        <p className={styles.notice}>
          Submissions are received by CivicLens administrators. They are not
          automatically sent to the municipality and are not official municipal
          consultation submissions.
        </p>
        <p className={styles.notice}>{availability.collectionNote}</p>
        <p className={styles.notice}>
          Optional contact details are used only if administrators need to follow
          up about this submission. Feedback and personal information are not
          shown publicly.
        </p>
      </div>

      <form
        className={styles.form}
        onSubmit={(event) => void onSubmit(event)}
        aria-describedby={noticeId}
      >
        <label className={styles.label} htmlFor={`feedback-comment-${record.id}`}>
          Feedback
          <textarea
            id={`feedback-comment-${record.id}`}
            className={styles.textarea}
            required
            aria-required="true"
            maxLength={10000}
            rows={4}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            disabled={submitting}
          />
        </label>

        <label
          className={styles.label}
          htmlFor={`feedback-perspective-${record.id}`}
        >
          Perspective or concern (optional)
          <input
            id={`feedback-perspective-${record.id}`}
            className={styles.input}
            maxLength={2000}
            value={perspective}
            onChange={(event) => setPerspective(event.target.value)}
            disabled={submitting}
            placeholder="e.g. housing, traffic, parks"
          />
        </label>

        <label className={styles.label} htmlFor={`feedback-name-${record.id}`}>
          Contact name (optional)
          <input
            id={`feedback-name-${record.id}`}
            className={styles.input}
            maxLength={200}
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
            disabled={submitting}
            autoComplete="name"
          />
        </label>

        <label className={styles.label} htmlFor={`feedback-email-${record.id}`}>
          Contact email (optional)
          <input
            id={`feedback-email-${record.id}`}
            className={styles.input}
            type="email"
            maxLength={320}
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            disabled={submitting}
            autoComplete="email"
          />
        </label>

        {/* Honeypot — hidden from people, checked server-side. */}
        <div className={styles.honeypot} aria-hidden="true">
          <label htmlFor={`feedback-website-${record.id}`}>Website</label>
          <input
            id={`feedback-website-${record.id}`}
            className={styles.input}
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit feedback'}
        </button>
      </form>
    </section>
  )
}
