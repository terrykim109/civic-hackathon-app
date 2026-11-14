import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ProposalEditorForm } from '../components/admin/ProposalEditorForm'
import { ProposalPreview } from '../components/admin/ProposalPreview'
import styles from '../components/auth/AdminChrome.module.css'
import {
  createEmptyProposalForm,
  formStateToMunicipalRecord,
  municipalRecordToFormState,
  type ProposalFormState,
} from '../lib/proposals/proposalForm'
import {
  getProposal,
  saveProposal,
} from '../lib/proposals/proposalApi'
import { validateProposal } from '../lib/proposals/validateProposal'
import type { PublicationStatus } from '../lib/supabase/types'
import editorPageStyles from './AdminProposalEditorPage.module.css'

export function AdminProposalEditorPage() {
  const { proposalId } = useParams<{ proposalId: string }>()
  const isNew = !proposalId || proposalId === 'new'
  const navigate = useNavigate()
  const { client, user } = useAuth()

  const [form, setForm] = useState<ProposalFormState>(() =>
    createEmptyProposalForm(),
  )
  const [publicationStatus, setPublicationStatus] =
    useState<PublicationStatus>('draft')
  const [idLocked, setIdLocked] = useState(!isNew)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNew || !client || !proposalId) return

    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      const result = await getProposal(client, proposalId)
      if (cancelled) return
      if (!result.ok) {
        setError(result.error)
        setLoading(false)
        return
      }
      setForm(municipalRecordToFormState(result.data.record))
      setPublicationStatus(result.data.publicationStatus)
      setIdLocked(true)
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [client, isNew, proposalId])

  const record = useMemo(() => formStateToMunicipalRecord(form), [form])

  const patchForm = (patch: Partial<ProposalFormState>) => {
    setForm((current) => ({ ...current, ...patch }))
    setMessage(null)
  }

  const persist = async (nextStatus: PublicationStatus) => {
    if (!client) {
      setError('Supabase is not configured.')
      return
    }

    const validation = validateProposal(record, {
      publicationStatus: nextStatus,
    })
    if (!validation.ok) {
      setError(validation.errors.join(' '))
      setShowPreview(true)
      return
    }

    setSaving(true)
    setError(null)
    const result = await saveProposal(
      client,
      record,
      nextStatus,
      user?.id ?? null,
      { createOnly: isNew },
    )
    setSaving(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setPublicationStatus(result.data.publicationStatus)
    setIdLocked(true)
    setMessage(
      nextStatus === 'published'
        ? 'Proposal published.'
        : nextStatus === 'archived'
          ? 'Proposal archived.'
          : 'Draft saved.',
    )
    if (isNew) {
      navigate(`/admin/proposals/${result.data.record.id}`, { replace: true })
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.status} role="status">
          Loading proposal…
        </p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.shell} ${editorPageStyles.shellWide}`}>
        <section className={styles.card}>
          <div className={editorPageStyles.headerRow}>
            <div>
              <p className={styles.eyebrow}>Proposal editor</p>
              <h1 className={styles.title}>
                {isNew ? 'New proposal' : 'Edit proposal'}
              </h1>
              <p className={styles.lede}>
                CivicLens publication status:{' '}
                <strong>{publicationStatus}</strong>. Municipal decision fields
                stay separate from draft/publish.
              </p>
            </div>
            <div className={styles.actions}>
              {!isNew && proposalId ? (
                <Link
                  className={styles.secondary}
                  to={`/admin/feedback?proposal=${encodeURIComponent(proposalId)}`}
                >
                  View feedback
                </Link>
              ) : null}
              <Link className={styles.secondary} to="/admin">
                Back to list
              </Link>
            </div>
          </div>

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className={editorPageStyles.success} role="status">
              {message}
            </p>
          ) : null}

          <ProposalEditorForm
            form={form}
            idLocked={idLocked}
            onChange={patchForm}
          />

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              disabled={saving}
              onClick={() => setShowPreview((value) => !value)}
            >
              {showPreview ? 'Hide preview' : 'Preview'}
            </button>
            <button
              type="button"
              className={styles.secondary}
              disabled={saving}
              onClick={() => void persist('draft')}
            >
              {saving ? 'Saving…' : 'Save draft'}
            </button>
            <button
              type="button"
              className={styles.primary}
              disabled={saving}
              onClick={() => {
                setShowPreview(true)
                void persist('published')
              }}
            >
              Publish
            </button>
            {!isNew ? (
              <button
                type="button"
                className={styles.secondary}
                disabled={saving || publicationStatus === 'archived'}
                onClick={() => void persist('archived')}
              >
                Archive
              </button>
            ) : null}
          </div>

          {showPreview ? (
            <ProposalPreview
              record={record}
              publicationStatus={publicationStatus}
            />
          ) : null}
        </section>
      </div>
    </div>
  )
}
