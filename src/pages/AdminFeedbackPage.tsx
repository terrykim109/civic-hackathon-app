import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import styles from '../components/auth/AdminChrome.module.css'
import {
  buildFeedbackCsv,
  feedbackCsvFilename,
} from '../lib/feedback/exportFeedbackCsv'
import {
  filterFeedbackItems,
  listFeedbackProposalOptions,
  listFeedbackSubmissions,
  updateFeedbackReviewStatus,
  type FeedbackInboxItem,
} from '../lib/feedback/feedbackAdminApi'
import type { FeedbackReviewStatus } from '../lib/supabase/types'
import pageStyles from './AdminFeedbackPage.module.css'

const STATUS_FILTERS: Array<FeedbackReviewStatus | 'all'> = [
  'all',
  'new',
  'under_review',
  'reviewed',
]

const STATUS_LABELS: Record<FeedbackReviewStatus | 'all', string> = {
  all: 'All statuses',
  new: 'New',
  under_review: 'Under review',
  reviewed: 'Reviewed',
}

function statusBadgeClass(status: FeedbackReviewStatus): string {
  if (status === 'under_review') return pageStyles.badge_under_review
  if (status === 'reviewed') return pageStyles.badge_reviewed
  return pageStyles.badge_new
}

function downloadCsv(items: FeedbackInboxItem[]) {
  const csv = buildFeedbackCsv(items)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = feedbackCsvFilename()
  anchor.click()
  URL.revokeObjectURL(url)
}

export function AdminFeedbackPage() {
  const { user, signOut, adminLoading, client, clientConfigured } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const proposalFilter = searchParams.get('proposal')?.trim() || 'all'
  const statusParam = searchParams.get('status')?.trim() || 'all'
  const reviewFilter: FeedbackReviewStatus | 'all' =
    statusParam === 'new' ||
    statusParam === 'under_review' ||
    statusParam === 'reviewed'
      ? statusParam
      : 'all'

  const [items, setItems] = useState<FeedbackInboxItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(() => Boolean(client))
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(() =>
    client
      ? null
      : clientConfigured
        ? 'Could not create Supabase client.'
        : 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  )
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!client) return

    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      const result = await listFeedbackSubmissions(client)
      if (cancelled) return
      if (!result.ok) {
        setError(result.error)
        setItems([])
      } else {
        setItems(result.data)
      }
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [client])

  const visible = useMemo(
    () =>
      filterFeedbackItems(items, {
        proposalId: proposalFilter,
        reviewStatus: reviewFilter,
      }),
    [items, proposalFilter, reviewFilter],
  )

  const proposalOptions = useMemo(
    () => listFeedbackProposalOptions(items),
    [items],
  )

  const selected = useMemo(() => {
    if (!selectedId) return null
    return visible.find((item) => item.id === selectedId) ?? null
  }, [selectedId, visible])

  const setProposalFilter = (value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value === 'all') next.delete('proposal')
    else next.set('proposal', value)
    setSelectedId(null)
    setActionError(null)
    setSearchParams(next, { replace: true })
  }

  const setReviewFilter = (value: FeedbackReviewStatus | 'all') => {
    const next = new URLSearchParams(searchParams)
    if (value === 'all') next.delete('status')
    else next.set('status', value)
    setSelectedId(null)
    setActionError(null)
    setSearchParams(next, { replace: true })
  }

  const onUpdateStatus = async (status: FeedbackReviewStatus) => {
    if (!client || !selected) return
    setUpdating(true)
    setActionError(null)
    const result = await updateFeedbackReviewStatus(
      client,
      selected.id,
      status,
      user?.id ?? null,
    )
    setUpdating(false)
    if (!result.ok) {
      setActionError(result.error)
      return
    }
    setItems((current) =>
      current.map((item) => (item.id === result.data.id ? result.data : item)),
    )
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.shell} ${pageStyles.shellWide}`}>
        <section className={styles.card} aria-labelledby="admin-feedback-title">
          <div className={pageStyles.headerRow}>
            <div>
              <p className={styles.eyebrow}>Protected admin area</p>
              <h1 id="admin-feedback-title" className={styles.title}>
                Feedback inbox
              </h1>
              <p className={styles.lede}>
                Review resident submissions privately. Feedback is never shown
                on the public map and remains subject to administrator RLS.
              </p>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primary}
                disabled={loading || Boolean(error) || visible.length === 0}
                onClick={() => downloadCsv(visible)}
              >
                Export CSV
              </button>
              <Link className={styles.secondary} to="/admin">
                Proposals
              </Link>
              <Link className={styles.secondary} to="/">
                Public map
              </Link>
              <button
                type="button"
                className={styles.secondary}
                disabled={adminLoading}
                onClick={() => {
                  void signOut()
                }}
              >
                Log out
              </button>
            </div>
          </div>

          <p className={styles.meta}>
            Signed in as <strong>{user?.email ?? 'unknown account'}</strong>
          </p>

          <div className={pageStyles.filters}>
            <label className={pageStyles.filterLabel} htmlFor="feedback-proposal-filter">
              Proposal
              <select
                id="feedback-proposal-filter"
                className={pageStyles.select}
                value={proposalFilter}
                onChange={(event) => setProposalFilter(event.target.value)}
              >
                <option value="all">All proposals</option>
                {proposalOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.title}
                  </option>
                ))}
              </select>
            </label>

            <label className={pageStyles.filterLabel} htmlFor="feedback-status-filter">
              Review status
              <select
                id="feedback-status-filter"
                className={pageStyles.select}
                value={reviewFilter}
                onChange={(event) =>
                  setReviewFilter(event.target.value as FeedbackReviewStatus | 'all')
                }
              >
                {STATUS_FILTERS.map((value) => (
                  <option key={value} value={value}>
                    {STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className={styles.meta} role="status">
              Loading feedback…
            </p>
          ) : null}

          {!loading && !error && visible.length === 0 ? (
            <p className={styles.meta}>
              No feedback matches these filters.
              {items.length === 0
                ? ' The inbox is empty until residents submit comments on open proposals.'
                : ''}
            </p>
          ) : null}

          {!loading && visible.length > 0 ? (
            <div className={pageStyles.layout}>
              <ul className={pageStyles.list}>
                {visible.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`${pageStyles.item}${
                        selectedId === item.id ? ` ${pageStyles.itemActive}` : ''
                      }`}
                      onClick={() => {
                        setSelectedId(item.id)
                        setActionError(null)
                      }}
                    >
                      <div className={pageStyles.itemTop}>
                        <span className={pageStyles.itemTitle}>
                          {item.proposalTitle}
                        </span>
                        <span
                          className={`${pageStyles.badge} ${statusBadgeClass(
                            item.reviewStatus,
                          )}`}
                        >
                          {STATUS_LABELS[item.reviewStatus]}
                        </span>
                      </div>
                      <span className={pageStyles.itemMeta}>
                        {new Date(item.createdAt).toLocaleString()} ·{' '}
                        {item.municipalRecordId}
                      </span>
                      <span className={pageStyles.itemSnippet}>
                        {item.comment.length > 140
                          ? `${item.comment.slice(0, 140)}…`
                          : item.comment}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              <aside className={pageStyles.detail} aria-live="polite">
                {selected ? (
                  <>
                    <h2 className={pageStyles.detailTitle}>Submission detail</h2>

                    <div className={pageStyles.detailBlock}>
                      <p className={pageStyles.detailLabel}>Proposal</p>
                      <p className={pageStyles.detailBody}>
                        {selected.proposalTitle}
                        {selected.proposalMunicipality
                          ? ` · ${selected.proposalMunicipality}`
                          : ''}
                      </p>
                      <div className={pageStyles.detailActions}>
                        <Link
                          className={styles.secondary}
                          to={`/admin/proposals/${selected.municipalRecordId}`}
                        >
                          Open proposal
                        </Link>
                      </div>
                    </div>

                    <div className={pageStyles.detailBlock}>
                      <p className={pageStyles.detailLabel}>Submitted</p>
                      <p className={pageStyles.detailBody}>
                        {new Date(selected.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className={pageStyles.detailBlock}>
                      <p className={pageStyles.detailLabel}>Review status</p>
                      <p className={pageStyles.detailBody}>
                        {STATUS_LABELS[selected.reviewStatus]}
                        {selected.reviewedAt
                          ? ` · updated ${new Date(selected.reviewedAt).toLocaleString()}`
                          : ''}
                      </p>
                      <div className={pageStyles.detailActions}>
                        {(['new', 'under_review', 'reviewed'] as const).map(
                          (status) => (
                            <button
                              key={status}
                              type="button"
                              className={
                                selected.reviewStatus === status
                                  ? styles.primary
                                  : styles.secondary
                              }
                              disabled={
                                updating || selected.reviewStatus === status
                              }
                              onClick={() => {
                                void onUpdateStatus(status)
                              }}
                            >
                              {STATUS_LABELS[status]}
                            </button>
                          ),
                        )}
                      </div>
                    </div>

                    <div className={pageStyles.detailBlock}>
                      <p className={pageStyles.detailLabel}>Feedback</p>
                      <p className={pageStyles.detailBody}>{selected.comment}</p>
                    </div>

                    {selected.perspective ? (
                      <div className={pageStyles.detailBlock}>
                        <p className={pageStyles.detailLabel}>
                          Perspective or concern
                        </p>
                        <p className={pageStyles.detailBody}>
                          {selected.perspective}
                        </p>
                      </div>
                    ) : null}

                    <div className={pageStyles.detailBlock}>
                      <p className={pageStyles.detailLabel}>Contact</p>
                      <p className={pageStyles.detailBody}>
                        {selected.contactName || selected.contactEmail
                          ? [
                              selected.contactName,
                              selected.contactEmail,
                            ]
                              .filter(Boolean)
                              .join(' · ')
                          : 'No contact information provided.'}
                      </p>
                    </div>

                    {actionError ? (
                      <p className={styles.error} role="alert">
                        {actionError}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className={styles.meta}>
                    Select a submission to view details and update its review
                    status.
                  </p>
                )}
              </aside>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
