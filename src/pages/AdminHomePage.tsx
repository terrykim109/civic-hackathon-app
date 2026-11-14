import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import styles from '../components/auth/AdminChrome.module.css'
import {
  listProposals,
  type ProposalListItem,
} from '../lib/proposals/proposalApi'
import type { PublicationStatus } from '../lib/supabase/types'
import listStyles from './AdminHomePage.module.css'

const FILTERS: Array<PublicationStatus | 'all'> = [
  'all',
  'draft',
  'published',
  'archived',
]

export function AdminHomePage() {
  const { user, signOut, adminLoading, client, clientConfigured } = useAuth()
  const [items, setItems] = useState<ProposalListItem[]>([])
  const [filter, setFilter] = useState<PublicationStatus | 'all'>('all')
  const [loading, setLoading] = useState(() => Boolean(client))
  const [error, setError] = useState<string | null>(() =>
    client
      ? null
      : clientConfigured
        ? 'Could not create Supabase client.'
        : 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  )

  useEffect(() => {
    if (!client) return

    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      const result = await listProposals(client)
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

  const visible = useMemo(() => {
    if (filter === 'all') return items
    return items.filter((item) => item.publicationStatus === filter)
  }, [filter, items])

  const counts = useMemo(() => {
    return {
      all: items.length,
      draft: items.filter((item) => item.publicationStatus === 'draft').length,
      published: items.filter((item) => item.publicationStatus === 'published')
        .length,
      archived: items.filter((item) => item.publicationStatus === 'archived')
        .length,
    }
  }, [items])

  return (
    <div className={styles.page}>
      <div className={`${styles.shell} ${listStyles.shellWide}`}>
        <section className={styles.card} aria-labelledby="admin-home-title">
          <div className={listStyles.headerRow}>
            <div>
              <p className={styles.eyebrow}>Protected admin area</p>
              <h1 id="admin-home-title" className={styles.title}>
                Municipal proposals
              </h1>
              <p className={styles.lede}>
                Create and manage CivicLens proposals. Drafts and archived
                records stay private under RLS; only published rows are public.
              </p>
            </div>
            <div className={styles.actions}>
              <Link className={styles.primary} to="/admin/proposals/new">
                New proposal
              </Link>
              <Link className={styles.secondary} to="/admin/feedback">
                Feedback inbox
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

          <div className={listStyles.filters} role="tablist" aria-label="Publication filter">
            {FILTERS.map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filter === value}
                className={`${listStyles.filter}${
                  filter === value ? ` ${listStyles.filterActive}` : ''
                }`}
                onClick={() => setFilter(value)}
              >
                {value} ({counts[value]})
              </button>
            ))}
          </div>

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className={styles.meta} role="status">
              Loading proposals…
            </p>
          ) : null}

          {!loading && !error && visible.length === 0 ? (
            <p className={styles.meta}>
              No proposals in this filter. Create a draft to get started.
            </p>
          ) : null}

          {!loading && visible.length > 0 ? (
            <ul className={listStyles.list}>
              {visible.map((item) => (
                <li key={item.id}>
                  <Link
                    className={listStyles.item}
                    to={`/admin/proposals/${item.id}`}
                  >
                    <div className={listStyles.itemTop}>
                      <span className={listStyles.itemTitle}>{item.title}</span>
                      <span
                        className={`${listStyles.badge} ${
                          item.publicationStatus === 'published'
                            ? listStyles.badge_published
                            : item.publicationStatus === 'archived'
                              ? listStyles.badge_archived
                              : listStyles.badge_draft
                        }`}
                      >
                        {item.publicationStatus}
                      </span>
                    </div>
                    <span className={listStyles.itemMeta}>
                      {item.municipality} · {item.categoryKind} · participation{' '}
                      {item.participationAvailability}
                    </span>
                    <span className={listStyles.itemMeta}>
                      Updated {new Date(item.updatedAt).toLocaleString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </div>
  )
}
