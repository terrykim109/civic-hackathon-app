import { useEffect, useRef } from 'react'
import { Marker, type Map as MapLibreMap } from 'maplibre-gl'
import type { MunicipalRecord, RecordCategoryKind } from '../../types/municipalRecord'
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

    for (const record of records) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = `${styles.marker} ${CATEGORY_CLASS[record.categoryKind]}`
      button.setAttribute(
        'aria-label',
        `Municipal record: ${record.title} (${record.categoryRaw.replaceAll('_', ' ')})`,
      )

      const selected = record.id === selectedRecordId
      button.setAttribute('aria-pressed', selected ? 'true' : 'false')
      if (selected) {
        button.classList.add(styles.selected)
        const label = document.createElement('span')
        label.className = styles.label
        const title = document.createElement('span')
        title.className = styles.labelTitle
        title.textContent = record.title
        const meta = document.createElement('span')
        meta.className = styles.labelMeta
        meta.textContent = record.categoryRaw.replaceAll('_', ' ')
        label.append(title, meta)
        button.appendChild(label)
      }

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
