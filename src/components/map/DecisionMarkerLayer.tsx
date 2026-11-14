import { useEffect, useRef } from 'react'
import { Marker, type Map as MapLibreMap } from 'maplibre-gl'
import type { MunicipalRecord, RecordCategoryKind } from '../../types/municipalRecord'
import { buildMarkerPreview } from './markerPreview'
import styles from './DecisionMarker.module.css'

interface DecisionMarkerLayerProps {
  map: MapLibreMap | null
  records: readonly MunicipalRecord[]
  selectedRecordId: string | null
  onRecordSelect: (record: MunicipalRecord | null) => void
}

const CATEGORY_CLASS: Record<RecordCategoryKind, string> = {
  housing: styles.housing,
  parks: styles.parks,
  transit: styles.transit,
  infrastructure: styles.infrastructure,
  environment: styles.environment,
  other: styles.other,
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function createPopup(record: MunicipalRecord): HTMLSpanElement {
  const preview = buildMarkerPreview(record)
  const popup = document.createElement('span')
  popup.className = styles.popup
  popup.setAttribute('role', 'tooltip')

  const title = document.createElement('span')
  title.className = styles.popupTitle
  title.textContent = preview.title
  popup.appendChild(title)

  if (preview.category) {
    const category = document.createElement('span')
    category.className = styles.popupMeta
    category.textContent = preview.category
    popup.appendChild(category)
  }

  if (preview.status) {
    const status = document.createElement('span')
    status.className = styles.popupStatus
    status.textContent = preview.status
    popup.appendChild(status)
  }

  return popup
}

function createRadar(): HTMLSpanElement {
  const radar = document.createElement('span')
  radar.className = styles.radar
  radar.setAttribute('aria-hidden', 'true')

  const ringA = document.createElement('span')
  ringA.className = styles.radarRing
  const ringB = document.createElement('span')
  ringB.className = `${styles.radarRing} ${styles.radarRingDelayed}`

  radar.append(ringA, ringB)
  return radar
}

/**
 * Renders interactive HTML markers from the municipal record collection.
 * With the current static dataset size this is efficient and keyboard-friendly.
 * If the collection grows large, switch to a GeoJSON source + symbol layer.
 */
export function DecisionMarkerLayer({
  map,
  records,
  selectedRecordId,
  onRecordSelect,
}: DecisionMarkerLayerProps) {
  const selectedIdRef = useRef(selectedRecordId)
  const onSelectRef = useRef(onRecordSelect)

  useEffect(() => {
    selectedIdRef.current = selectedRecordId
  }, [selectedRecordId])

  useEffect(() => {
    onSelectRef.current = onRecordSelect
  }, [onRecordSelect])

  useEffect(() => {
    if (!map) return

    const markers: Marker[] = []
    const reducedMotion = prefersReducedMotion()

    for (const record of records) {
      const preview = buildMarkerPreview(record)
      const button = document.createElement('button')
      button.type = 'button'
      button.className = `${styles.marker} ${CATEGORY_CLASS[record.categoryKind]}`
      if (reducedMotion) {
        button.classList.add(styles.reducedMotion)
      }

      const ariaParts = [preview.title]
      if (preview.category) ariaParts.push(preview.category)
      if (preview.status) ariaParts.push(preview.status)
      button.setAttribute('aria-label', `Municipal record: ${ariaParts.join(' · ')}`)

      const selected = record.id === selectedRecordId
      button.setAttribute('aria-pressed', selected ? 'true' : 'false')
      if (selected) {
        button.classList.add(styles.selected)
      }

      button.append(createRadar(), createPopup(record))

      const setPreview = (on: boolean) => {
        button.classList.toggle(styles.preview, on)
        button.style.zIndex = on || selectedIdRef.current === record.id ? '3' : ''
      }

      if (selected) {
        button.style.zIndex = '3'
      }

      button.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
          setPreview(true)
        }
      })
      button.addEventListener('pointerleave', () => {
        setPreview(false)
      })
      button.addEventListener('focus', () => {
        setPreview(true)
      })
      button.addEventListener('blur', () => {
        if (!button.matches(':hover')) {
          setPreview(false)
        }
      })
      // Touch has no hover — briefly surface the same card on press.
      button.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'touch') {
          setPreview(true)
        }
      })

      const selectThis = () => {
        const alreadySelected = selectedIdRef.current === record.id
        onSelectRef.current(alreadySelected ? null : record)
      }

      button.addEventListener('click', (event) => {
        event.stopPropagation()
        selectThis()
      })
      button.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          event.stopPropagation()
          selectThis()
        }
      })

      markers.push(
        new Marker({ element: button, anchor: 'center' })
          .setLngLat(record.location.coordinates)
          .addTo(map),
      )
    }

    return () => {
      for (const marker of markers) {
        marker.remove()
      }
    }
  }, [map, records, selectedRecordId])

  return null
}
