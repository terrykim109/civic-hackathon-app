import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { LoaderCircle, Search, X } from 'lucide-react'
import {
  precisionDisclaimer,
  searchLocations,
} from '../../data/geocoding/photon'
import type { GeocodeResult } from '../../data/geocoding/types'
import { validateLocationQuery } from '../../data/geocoding/validateQuery'
import type { LngLat, MapCameraApi } from '../../types/map'
import styles from './LocationSearch.module.css'

/** Debounce for Photon autocomplete — avoids a request on every keystroke. */
const SUGGEST_DEBOUNCE_MS = 400

export interface LocationSearchResolved {
  label: string
  coordinates: LngLat
  kind: GeocodeResult['kind']
}

interface LocationSearchProps {
  camera: MapCameraApi | null
  onResolvedLabel?: (label: string) => void
  /** Fired after a successful geocode selection (map already flies to centre). */
  onLocationResolved?: (result: LocationSearchResolved) => void
  /** Fired when the resident clears the search. */
  onLocationCleared?: () => void
}

type UiStatus =
  | 'idle'
  | 'invalid'
  | 'loading'
  | 'results'
  | 'empty'
  | 'error'
  | 'selected'

export function LocationSearch({
  camera,
  onResolvedLabel,
  onLocationResolved,
  onLocationCleared,
}: LocationSearchProps) {
  const listboxId = useId()
  const inputId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipDebounceRef = useRef(false)

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<UiStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [selected, setSelected] = useState<GeocodeResult | null>(null)
  const [listOpen, setListOpen] = useState(false)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setListOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const runSearch = async (raw: string, options: { fromDebounce?: boolean } = {}) => {
    const validation = validateLocationQuery(raw)
    if (!validation.ok) {
      if (!options.fromDebounce) {
        setStatus('invalid')
        setMessage(validation.reason)
        setResults([])
        setSelected(null)
        setListOpen(false)
        setActiveIndex(-1)
      } else {
        setStatus('idle')
        setMessage(null)
        setResults([])
        setListOpen(false)
        setActiveIndex(-1)
      }
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStatus('loading')
    setMessage(null)
    setListOpen(true)
    setActiveIndex(-1)

    const outcome = await searchLocations(validation.normalized, {
      signal: controller.signal,
    })

    if (controller.signal.aborted) return

    setResults(outcome.results)
    setMessage(outcome.message)
    setStatus(outcome.status)
    setListOpen(
      outcome.status === 'results' ||
        outcome.status === 'empty' ||
        outcome.status === 'error',
    )
    setActiveIndex(outcome.results.length > 0 ? 0 : -1)
  }

  const scheduleSuggest = (nextQuery: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void runSearch(nextQuery, { fromDebounce: true })
    }, SUGGEST_DEBOUNCE_MS)
  }

  const selectResult = (result: GeocodeResult) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    abortRef.current?.abort()
    skipDebounceRef.current = true
    setSelected(result)
    setStatus('selected')
    setQuery(result.label)
    setListOpen(false)
    setActiveIndex(-1)
    setMessage(null)
    onResolvedLabel?.(result.label)
    onLocationResolved?.({
      label: result.label,
      coordinates: result.coordinates,
      kind: result.kind,
    })

    camera?.flyToLocation({
      center: result.coordinates,
      zoom: result.suggestedZoom,
    })
  }

  const clearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    abortRef.current?.abort()
    setQuery('')
    setStatus('idle')
    setMessage(null)
    setResults([])
    setSelected(null)
    setListOpen(false)
    setActiveIndex(-1)
    onLocationCleared?.()
  }

  const submitNow = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    void runSearch(query)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      if (!listOpen && results.length > 0) {
        setListOpen(true)
        setActiveIndex(0)
        event.preventDefault()
        return
      }
      if (results.length === 0) return
      event.preventDefault()
      setListOpen(true)
      setActiveIndex((index) => (index + 1) % results.length)
      return
    }

    if (event.key === 'ArrowUp') {
      if (results.length === 0) return
      event.preventDefault()
      setListOpen(true)
      setActiveIndex((index) =>
        index <= 0 ? results.length - 1 : index - 1,
      )
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (listOpen && activeIndex >= 0 && results[activeIndex]) {
        selectResult(results[activeIndex])
        return
      }
      submitNow()
      return
    }

    if (event.key === 'Escape') {
      if (listOpen) {
        event.preventDefault()
        setListOpen(false)
        setActiveIndex(-1)
        return
      }
      if (query) {
        event.preventDefault()
        clearSearch()
      }
    }
  }

  const showStatus =
    status === 'invalid' ||
    status === 'empty' ||
    status === 'error' ||
    (status === 'loading' && listOpen)

  return (
    <div className={styles.root} ref={rootRef}>
      <label className={styles.srOnly} htmlFor={inputId}>
        Search an address or neighbourhood
      </label>
      <div className={styles.control}>
        <Search
          className={styles.icon}
          size={16}
          strokeWidth={2.25}
          aria-hidden="true"
        />
        <input
          id={inputId}
          className={styles.input}
          type="search"
          role="combobox"
          value={query}
          placeholder="Search an address or neighbourhood"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-expanded={listOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          aria-busy={status === 'loading'}
          onChange={(event) => {
            const next = event.target.value
            setQuery(next)
            if (skipDebounceRef.current) {
              skipDebounceRef.current = false
              return
            }
            setSelected(null)
            if (status === 'selected' || status === 'invalid') {
              setStatus('idle')
              setMessage(null)
            }
            scheduleSuggest(next)
          }}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (results.length > 0 || status === 'empty' || status === 'error') {
              setListOpen(true)
            }
          }}
        />
        {query ? (
          <button
            type="button"
            className={styles.clear}
            aria-label="Clear search"
            onClick={clearSearch}
          >
            <X size={14} strokeWidth={2.25} aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="button"
          className={styles.submit}
          onClick={submitNow}
          disabled={status === 'loading' || !camera}
          aria-label="Search location"
        >
          {status === 'loading' ? (
            <LoaderCircle
              className={styles.spinner}
              size={15}
              strokeWidth={2.25}
              aria-hidden="true"
            />
          ) : (
            'Search'
          )}
        </button>
      </div>

      {listOpen && (results.length > 0 || showStatus) ? (
        <div className={styles.panel} role="presentation">
          {status === 'loading' ? (
            <p className={styles.status} role="status">
              Searching Canadian locations…
            </p>
          ) : null}

          {status === 'invalid' || status === 'empty' || status === 'error' ? (
            <p
              className={`${styles.status} ${
                status === 'error' || status === 'invalid'
                  ? styles.statusError
                  : ''
              }`}
              role="status"
            >
              {message}
            </p>
          ) : null}

          {results.length > 0 ? (
            <ul
              id={listboxId}
              className={styles.list}
              role="listbox"
              aria-label="Location suggestions"
            >
              {results.map((result, index) => (
                <li key={result.id} role="presentation">
                  <button
                    type="button"
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    className={`${styles.option}${
                      index === activeIndex ? ` ${styles.optionActive}` : ''
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectResult(result)}
                  >
                    <span className={styles.optionLabel}>{result.label}</span>
                    {result.secondaryLabel ? (
                      <span className={styles.optionMeta}>
                        {result.secondaryLabel}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <p className={styles.attribution}>
            Results prioritize Canada (Toronto area bias).{' '}
            {results[0]?.attribution ??
              '© OpenStreetMap contributors · Photon'}
          </p>
        </div>
      ) : null}

      {selected && status === 'selected' ? (
        <div className={styles.resolved} role="status">
          <p className={styles.resolvedLabel}>{selected.label}</p>
          {selected.secondaryLabel ? (
            <p className={styles.resolvedMeta}>{selected.secondaryLabel}</p>
          ) : null}
          <p className={styles.resolvedNote}>
            {precisionDisclaimer(selected.precision)}
          </p>
        </div>
      ) : null}
    </div>
  )
}
