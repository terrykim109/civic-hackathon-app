import { X } from 'lucide-react'
import { getParkProjectsForWard } from '../../data/parks/adaptParkFacilityProjects'
import { getRecordsForWard } from '../../data/wards/resolveWardRecords'
import { getWardOfficialMeta } from '../../data/wards/wardOfficialMeta'
import type { MunicipalRecord } from '../../types/municipalRecord'
import type { WardSelection } from '../../types/ward'
import styles from './SelectedWardPanel.module.css'

interface SelectedWardPanelProps {
  ward: WardSelection
  records: readonly MunicipalRecord[]
  parkProjects?: readonly MunicipalRecord[]
  selectedRecordId: string | null
  onClose: () => void
  onRecordSelect: (record: MunicipalRecord) => void
}

export function SelectedWardPanel({
  ward,
  records,
  parkProjects = [],
  selectedRecordId,
  onClose,
  onRecordSelect,
}: SelectedWardPanelProps) {
  const { matched, missingDecisionIds } = getRecordsForWard(ward, records)
  const wardParkProjects = getParkProjectsForWard(ward.wardId, parkProjects)
  const officialMeta = getWardOfficialMeta(ward.wardId)

  return (
    <aside
      className={styles.panel}
      role="dialog"
      aria-modal="false"
      aria-labelledby={`ward-panel-title-${ward.wardId}`}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Ward {ward.wardId}</p>
          <h2 id={`ward-panel-title-${ward.wardId}`} className={styles.title}>
            {ward.name}
          </h2>
          {officialMeta ? (
            <p className={styles.officialMeta}>
              Open Data label: {officialMeta.description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className={styles.close}
          aria-label="Close ward panel"
          onClick={onClose}
        >
          <X size={16} strokeWidth={2.25} aria-hidden="true" />
        </button>
      </header>

      <div className={styles.body}>
        <p className={styles.note}>
          Navigation boundary only — not a project impact area. Associated
          municipal records are linked by exact decision IDs. Park facility
          projects below use each project’s own Open Data ward_number field —
          not map proximity.
        </p>

        <section>
          <h3 className={styles.sectionTitle}>Associated municipal records</h3>

          {matched.length === 0 && missingDecisionIds.length === 0 ? (
            <p className={styles.empty}>
              No municipal records are linked to this ward in the current
              dataset.
            </p>
          ) : null}

          {matched.length > 0 ? (
            <ul className={styles.list}>
              {matched.map((record) => (
                <li key={record.id}>
                  <button
                    type="button"
                    className={`${styles.recordButton}${
                      selectedRecordId === record.id
                        ? ` ${styles.recordButtonActive}`
                        : ''
                    }`}
                    onClick={() => onRecordSelect(record)}
                  >
                    <span className={styles.recordTitle}>{record.title}</span>
                    <span className={styles.recordMeta}>
                      {record.categoryRaw.replaceAll('_', ' ')} ·{' '}
                      {record.recordType.replaceAll('_', ' ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {missingDecisionIds.length > 0 ? (
            <p className={styles.missing} role="status">
              Linked decision ID
              {missingDecisionIds.length > 1 ? 's were' : ' was'} not found in
              the municipal record collection:{' '}
              {missingDecisionIds.join(', ')}.
            </p>
          ) : null}
        </section>

        <section>
          <h3 className={styles.sectionTitle}>
            Park &amp; recreation facility projects
          </h3>
          <p className={styles.sectionNote}>
            From City of Toronto Open Data. Listing a project here does not
            confirm resident impact or open feedback.
          </p>

          {wardParkProjects.length === 0 ? (
            <p className={styles.empty}>
              No Open Data park facility projects list this ward number.
            </p>
          ) : (
            <ul className={styles.list}>
              {wardParkProjects.map((project) => (
                <li key={project.id}>
                  <button
                    type="button"
                    className={`${styles.recordButton}${
                      selectedRecordId === project.id
                        ? ` ${styles.recordButtonActive}`
                        : ''
                    }`}
                    onClick={() => onRecordSelect(project)}
                  >
                    <span className={styles.recordTitle}>{project.title}</span>
                    <span className={styles.recordMeta}>
                      {(project.gisSourceStatus ?? project.projectStatus).replaceAll(
                        '_',
                        ' ',
                      )}
                      {project.location.affectedArea
                        ? ` · ${project.location.affectedArea}`
                        : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  )
}
