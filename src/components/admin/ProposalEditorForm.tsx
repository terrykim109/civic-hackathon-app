import type { ReactNode } from 'react'
import type { ProposalFormState } from '../../lib/proposals/proposalForm'
import {
  CATEGORY_KINDS,
  DECISION_STAGES,
  DECISION_STATUSES,
  LOCATION_PRECISIONS,
  PARTICIPATION_AVAILABILITIES,
} from '../../lib/proposals/proposalForm'
import styles from '../auth/AdminChrome.module.css'
import editorStyles from './ProposalEditorForm.module.css'

interface ProposalEditorFormProps {
  form: ProposalFormState
  idLocked: boolean
  onChange: (patch: Partial<ProposalFormState>) => void
}

function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className={styles.label}>
      {label}
      {children}
      {hint ? <span className={editorStyles.hint}>{hint}</span> : null}
    </label>
  )
}

export function ProposalEditorForm({
  form,
  idLocked,
  onChange,
}: ProposalEditorFormProps) {
  return (
    <div className={editorStyles.sections}>
      <section className={editorStyles.section}>
        <h2 className={editorStyles.sectionTitle}>Identity</h2>
        <div className={editorStyles.grid2}>
          <Field
            label="Record id"
            hint={idLocked ? 'Id is fixed after the first save.' : undefined}
          >
            <input
              className={styles.input}
              value={form.id}
              disabled={idLocked}
              onChange={(event) => onChange({ id: event.target.value })}
            />
          </Field>
          <Field label="Municipality">
            <input
              className={styles.input}
              value={form.municipality}
              onChange={(event) => onChange({ municipality: event.target.value })}
            />
          </Field>
        </div>
        <Field label="Title">
          <input
            className={styles.input}
            value={form.title}
            onChange={(event) => onChange({ title: event.target.value })}
          />
        </Field>
        <Field label="Plain-language description">
          <textarea
            className={`${styles.input} ${editorStyles.textarea}`}
            rows={4}
            value={form.description}
            onChange={(event) => onChange({ description: event.target.value })}
          />
        </Field>
        <div className={editorStyles.grid2}>
          <Field label="Ward id (optional)">
            <input
              className={styles.input}
              value={form.wardId}
              onChange={(event) => onChange({ wardId: event.target.value })}
            />
          </Field>
          <Field label="Data origin">
            <select
              className={styles.input}
              value={form.dataOrigin}
              onChange={(event) =>
                onChange({
                  dataOrigin: event.target.value as ProposalFormState['dataOrigin'],
                })
              }
            >
              <option value="curated">curated</option>
              <option value="geojson">geojson</option>
              <option value="open_data">open_data</option>
            </select>
          </Field>
        </div>
      </section>

      <section className={editorStyles.section}>
        <h2 className={editorStyles.sectionTitle}>Classification & municipal status</h2>
        <div className={editorStyles.grid2}>
          <Field label="Category (raw)">
            <input
              className={styles.input}
              value={form.categoryRaw}
              onChange={(event) => onChange({ categoryRaw: event.target.value })}
              placeholder="rental_housing"
            />
          </Field>
          <Field label="Category kind">
            <select
              className={styles.input}
              value={form.categoryKind}
              onChange={(event) =>
                onChange({
                  categoryKind: event.target
                    .value as ProposalFormState['categoryKind'],
                })
              }
            >
              {CATEGORY_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Record type">
            <input
              className={styles.input}
              value={form.recordType}
              onChange={(event) => onChange({ recordType: event.target.value })}
              placeholder="public_meeting_notice"
            />
          </Field>
          <Field label="Project status">
            <input
              className={styles.input}
              value={form.projectStatus}
              onChange={(event) => onChange({ projectStatus: event.target.value })}
            />
          </Field>
          <Field label="Decision status">
            <select
              className={styles.input}
              value={form.decisionStatus}
              onChange={(event) =>
                onChange({
                  decisionStatus: event.target
                    .value as ProposalFormState['decisionStatus'],
                })
              }
            >
              {DECISION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Decision stage">
            <select
              className={styles.input}
              value={form.decisionStage}
              onChange={(event) =>
                onChange({
                  decisionStage: event.target
                    .value as ProposalFormState['decisionStage'],
                })
              }
            >
              {DECISION_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </Field>
          <Field label="GIS source status (optional)">
            <input
              className={styles.input}
              value={form.gisSourceStatus}
              onChange={(event) =>
                onChange({ gisSourceStatus: event.target.value })
              }
            />
          </Field>
          <Field label="Decision body (optional)">
            <input
              className={styles.input}
              value={form.decisionBody}
              onChange={(event) => onChange({ decisionBody: event.target.value })}
            />
          </Field>
        </div>
      </section>

      <section className={editorStyles.section}>
        <h2 className={editorStyles.sectionTitle}>Location</h2>
        <p className={editorStyles.note}>
          Coordinates are a representative map point only — not a legal parcel or
          impact boundary.
        </p>
        <div className={editorStyles.grid2}>
          <Field label="Longitude">
            <input
              className={styles.input}
              value={form.longitude}
              onChange={(event) => onChange({ longitude: event.target.value })}
            />
          </Field>
          <Field label="Latitude">
            <input
              className={styles.input}
              value={form.latitude}
              onChange={(event) => onChange({ latitude: event.target.value })}
            />
          </Field>
          <Field label="Precision">
            <select
              className={styles.input}
              value={form.locationPrecision}
              onChange={(event) =>
                onChange({
                  locationPrecision: event.target
                    .value as ProposalFormState['locationPrecision'],
                })
              }
            >
              {LOCATION_PRECISIONS.map((precision) => (
                <option key={precision} value={precision}>
                  {precision}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Location role">
            <input
              className={styles.input}
              value={form.locationRole}
              onChange={(event) => onChange({ locationRole: event.target.value })}
            />
          </Field>
        </div>
        <Field label="Affected area (optional)">
          <input
            className={styles.input}
            value={form.affectedArea}
            onChange={(event) => onChange({ affectedArea: event.target.value })}
          />
        </Field>
        <Field label="Location note">
          <textarea
            className={`${styles.input} ${editorStyles.textarea}`}
            rows={2}
            value={form.locationNote}
            onChange={(event) => onChange({ locationNote: event.target.value })}
          />
        </Field>
      </section>

      <section className={editorStyles.section}>
        <h2 className={editorStyles.sectionTitle}>Participation</h2>
        <p className={editorStyles.note}>
          CivicLens feedback availability is derived from these fields and dates.
          There is no separate enable-feedback toggle.
        </p>
        <div className={editorStyles.grid2}>
          <Field label="Participation availability">
            <select
              className={styles.input}
              value={form.participationAvailability}
              onChange={(event) =>
                onChange({
                  participationAvailability: event.target
                    .value as ProposalFormState['participationAvailability'],
                })
              }
            >
              {PARTICIPATION_AVAILABILITIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Can participate now">
            <select
              className={styles.input}
              value={form.canParticipateNow}
              onChange={(event) =>
                onChange({
                  canParticipateNow: event.target
                    .value as ProposalFormState['canParticipateNow'],
                })
              }
            >
              <option value="unknown">unknown / unset</option>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </Field>
          <Field label="Participation deadline (optional)">
            <input
              className={styles.input}
              value={form.participationDeadline}
              onChange={(event) =>
                onChange({ participationDeadline: event.target.value })
              }
              placeholder="YYYY-MM-DD"
            />
          </Field>
          <Field label="Participation method (optional)">
            <input
              className={styles.input}
              value={form.participationMethod}
              onChange={(event) =>
                onChange({ participationMethod: event.target.value })
              }
            />
          </Field>
        </div>
        <Field label="Participation URL (optional)">
          <input
            className={styles.input}
            value={form.participationUrl}
            onChange={(event) =>
              onChange({ participationUrl: event.target.value })
            }
          />
        </Field>
        <Field
          label="Participation options (JSON array)"
          hint='Optional nested options. Example: [{"method":"email","availability":"open"}]'
        >
          <textarea
            className={`${styles.input} ${editorStyles.textareaMono}`}
            rows={4}
            value={form.participationOptionsText}
            onChange={(event) =>
              onChange({ participationOptionsText: event.target.value })
            }
          />
        </Field>
      </section>

      <section className={editorStyles.section}>
        <h2 className={editorStyles.sectionTitle}>Impacts, uncertainties & events</h2>
        <Field
          label="Potential impacts"
          hint="One per line. Optional kind prefix: source_stated|Text"
        >
          <textarea
            className={`${styles.input} ${editorStyles.textarea}`}
            rows={3}
            value={form.impactsText}
            onChange={(event) => onChange({ impactsText: event.target.value })}
          />
        </Field>
        <Field label="Uncertainties" hint="One per line">
          <textarea
            className={`${styles.input} ${editorStyles.textarea}`}
            rows={3}
            value={form.uncertaintiesText}
            onChange={(event) =>
              onChange({ uncertaintiesText: event.target.value })
            }
          />
        </Field>
        <Field
          label="Events"
          hint="One per line: type|date|description"
        >
          <textarea
            className={`${styles.input} ${editorStyles.textarea}`}
            rows={3}
            value={form.eventsText}
            onChange={(event) => onChange({ eventsText: event.target.value })}
          />
        </Field>
      </section>

      <section className={editorStyles.section}>
        <h2 className={editorStyles.sectionTitle}>Sources & evidence</h2>
        <Field
          label="Official sources"
          hint="One per line: label|https://url|YYYY-MM-DD"
        >
          <textarea
            className={`${styles.input} ${editorStyles.textarea}`}
            rows={3}
            value={form.sourcesText}
            onChange={(event) => onChange({ sourcesText: event.target.value })}
          />
        </Field>
        <Field
          label="Evidence"
          hint="One per line: evidenceId|https://url|locator"
        >
          <textarea
            className={`${styles.input} ${editorStyles.textarea}`}
            rows={3}
            value={form.evidenceText}
            onChange={(event) => onChange({ evidenceText: event.target.value })}
          />
        </Field>
        <div className={editorStyles.grid2}>
          <Field label="Official source URL">
            <input
              className={styles.input}
              value={form.officialSourceUrl}
              onChange={(event) =>
                onChange({ officialSourceUrl: event.target.value })
              }
            />
          </Field>
          <Field label="Geometry source URL">
            <input
              className={styles.input}
              value={form.geometrySourceUrl}
              onChange={(event) =>
                onChange({ geometrySourceUrl: event.target.value })
              }
            />
          </Field>
        </div>
      </section>

      <section className={editorStyles.section}>
        <h2 className={editorStyles.sectionTitle}>Verification & extras</h2>
        <div className={editorStyles.grid2}>
          <Field label="Last verified">
            <input
              className={styles.input}
              value={form.lastVerified}
              onChange={(event) => onChange({ lastVerified: event.target.value })}
            />
          </Field>
          <Field label="Verification method">
            <input
              className={styles.input}
              value={form.verificationMethod}
              onChange={(event) =>
                onChange({ verificationMethod: event.target.value })
              }
            />
          </Field>
          <Field label="Agenda item id">
            <input
              className={styles.input}
              value={form.agendaItemId}
              onChange={(event) => onChange({ agendaItemId: event.target.value })}
            />
          </Field>
          <Field label="GIS project name">
            <input
              className={styles.input}
              value={form.gisProjectName}
              onChange={(event) =>
                onChange({ gisProjectName: event.target.value })
              }
            />
          </Field>
        </div>
        <div className={editorStyles.grid2}>
          <Field label="Confidence — facts">
            <input
              className={styles.input}
              value={form.dataConfidenceFacts}
              onChange={(event) =>
                onChange({ dataConfidenceFacts: event.target.value })
              }
            />
          </Field>
          <Field label="Confidence — location">
            <input
              className={styles.input}
              value={form.dataConfidenceLocation}
              onChange={(event) =>
                onChange({ dataConfidenceLocation: event.target.value })
              }
            />
          </Field>
          <Field label="Confidence — participation">
            <input
              className={styles.input}
              value={form.dataConfidenceParticipation}
              onChange={(event) =>
                onChange({ dataConfidenceParticipation: event.target.value })
              }
            />
          </Field>
          <Field label="Confidence — limitations">
            <input
              className={styles.input}
              value={form.dataConfidenceLimitations}
              onChange={(event) =>
                onChange({ dataConfidenceLimitations: event.target.value })
              }
            />
          </Field>
        </div>
        <Field label="Related processes (JSON array)">
          <textarea
            className={`${styles.input} ${editorStyles.textareaMono}`}
            rows={3}
            value={form.relatedProcessesText}
            onChange={(event) =>
              onChange({ relatedProcessesText: event.target.value })
            }
          />
        </Field>
        <Field label="Metrics (JSON array)">
          <textarea
            className={`${styles.input} ${editorStyles.textareaMono}`}
            rows={3}
            value={form.metricsText}
            onChange={(event) => onChange({ metricsText: event.target.value })}
          />
        </Field>
      </section>
    </div>
  )
}
