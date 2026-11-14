import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  CircleHelp,
  ExternalLink,
  Home,
  MapPin,
  MessageCircle,
  X,
} from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { MunicipalRecord } from '../../types/municipalRecord'
import { ResidentFeedbackForm } from './ResidentFeedbackForm'
import {
  PROPOSAL_STAGES,
  buildProposalBrief,
  nextActionLabel,
  nextStageId,
  previousStageId,
  stageIndex,
  type ProposalStageId,
} from './proposalStages'
import styles from './SelectedRecordPreview.module.css'

interface SelectedRecordPreviewProps {
  record: MunicipalRecord
  onClose: () => void
  canPersistFeedback?: boolean
}

function BadgeToneClass(tone: string): string {
  switch (tone) {
    case 'open':
      return styles.badgeOpen
    case 'approaching':
      return styles.badgeApproaching
    case 'closed':
    case 'finalized':
      return styles.badgeClosed
    default:
      return styles.badgeUnknown
  }
}

export function SelectedRecordPreview({
  record,
  onClose,
  canPersistFeedback = false,
}: SelectedRecordPreviewProps) {
  const brief = buildProposalBrief(record)
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState<ProposalStageId>('proposal')
  const [showOpenQuestions, setShowOpenQuestions] = useState(false)
  const currentIndex = stageIndex(stage)

  useEffect(() => {
    setStage('proposal')
    setShowOpenQuestions(false)
    closeRef.current?.focus()
  }, [record.id])

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
  }, [stage])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const goToStage = (next: ProposalStageId) => {
    setStage(next)
  }

  const previous = previousStageId(stage)
  const next = nextStageId(stage)
  const nextLabel = nextActionLabel(stage)

  return (
    <aside
      className={styles.panel}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
    >
      <div className={styles.hero}>
        <header className={styles.header}>
          <div className={styles.headerText}>
            <p className={styles.breadcrumb}>{brief.breadcrumb}</p>
            <h2 id={titleId} className={styles.title}>
              {brief.title}
            </h2>
            <div className={styles.metaRow}>
              {brief.deadlineBadge ? (
                <span
                  className={`${styles.badge} ${BadgeToneClass(brief.deadlineBadge.tone)}`}
                >
                  <span className={styles.badgeDot} aria-hidden="true" />
                  {brief.deadlineBadge.label}
                </span>
              ) : null}
              {brief.updatedLabel ? (
                <span className={styles.updated}>{brief.updatedLabel}</span>
              ) : null}
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            aria-label="Close proposal information"
            onClick={onClose}
          >
            <X size={16} strokeWidth={2.25} aria-hidden="true" />
          </button>
        </header>

        <nav className={styles.stepper} aria-label="Proposal information stages">
          {PROPOSAL_STAGES.map((item, index) => {
            const active = item.id === stage
            const done = item.index < currentIndex
            return (
              <button
                key={item.id}
                type="button"
                className={`${styles.step}${active ? ` ${styles.stepActive}` : ''}${
                  done ? ` ${styles.stepDone}` : ''
                }`}
                aria-current={active ? 'step' : undefined}
                onClick={() => goToStage(item.id)}
              >
                <span className={styles.stepCircle} aria-hidden="true">
                  {done ? <Check size={14} strokeWidth={2.5} /> : `0${item.index}`}
                </span>
                {index < PROPOSAL_STAGES.length - 1 ? (
                  <span className={styles.stepLine} aria-hidden="true" />
                ) : null}
                <span className={styles.stepLabel}>{item.shortLabel}</span>
              </button>
            )
          })}
        </nav>
      </div>

      <div className={styles.body} ref={bodyRef}>
        {stage === 'proposal' ? (
          <section className={styles.stage} aria-label="Proposal overview">
            <h3 className={styles.stageTitle}>01 At a glance</h3>
            <dl className={styles.glanceList}>
              {brief.proposed ? (
                <div className={styles.glanceItem}>
                  <dt>
                    <Building2 size={16} strokeWidth={2} aria-hidden="true" />
                    Proposed
                  </dt>
                  <dd>{brief.proposed}</dd>
                </div>
              ) : null}
              {brief.impactSummary ? (
                <div className={styles.glanceItem}>
                  <dt>
                    <Home size={16} strokeWidth={2} aria-hidden="true" />
                    Impact
                  </dt>
                  <dd>{brief.impactSummary}</dd>
                </div>
              ) : null}
              {brief.yourRole ? (
                <div className={styles.glanceItem}>
                  <dt>
                    <MessageCircle size={16} strokeWidth={2} aria-hidden="true" />
                    Your role
                  </dt>
                  <dd>{brief.yourRole}</dd>
                </div>
              ) : null}
              {brief.deadlineLabel ? (
                <div className={styles.glanceItem}>
                  <dt>
                    <CalendarDays size={16} strokeWidth={2} aria-hidden="true" />
                    Deadline
                  </dt>
                  <dd>{brief.deadlineLabel}</dd>
                </div>
              ) : null}
              {brief.locationLines.length > 0 ? (
                <div className={styles.glanceItem}>
                  <dt>
                    <MapPin size={16} strokeWidth={2} aria-hidden="true" />
                    Location
                  </dt>
                  <dd>
                    {brief.locationLines.map((line) => (
                      <p key={line} className={styles.stackLine}>
                        {line}
                      </p>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>

            {brief.whereItStands.length > 0 ? (
              <div className={styles.block}>
                <h4 className={styles.blockTitle}>Where it stands</h4>
                <ul className={styles.bullets}>
                  {brief.whereItStands.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {brief.officialRecords.length > 0 ? (
              <div className={styles.block}>
                <h4 className={styles.blockTitle}>
                  Relevant council reports or references
                </h4>
                <ul className={styles.linkList}>
                  {brief.officialRecords.slice(0, 4).map((item) => (
                    <li key={item.href}>
                      <a href={item.href} target="_blank" rel="noreferrer">
                        {item.title}
                        <ExternalLink size={14} strokeWidth={2.25} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {brief.metrics.length > 0 ? (
              <div className={styles.block}>
                <h4 className={styles.blockTitle}>Documented figures</h4>
                <ul className={styles.bullets}>
                  {brief.metrics.map((metric) => (
                    <li key={`${metric.label}-${metric.value}`}>
                      {metric.label}: {metric.value}
                      {metric.detail ? ` — ${metric.detail}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {!brief.proposed &&
            !brief.impactSummary &&
            !brief.yourRole &&
            brief.locationLines.length === 0 ? (
              <p className={styles.empty}>
                Limited overview fields are available for this record.
              </p>
            ) : null}
          </section>
        ) : null}

        {stage === 'impact' ? (
          <section className={styles.stage} aria-label="Potential impact">
            <h3 className={styles.stageTitle}>02 How this could affect you</h3>

            <div className={styles.block}>
              <h4 className={styles.blockTitle}>What we know</h4>
              {brief.knownImpacts.length > 0 ? (
                <ul className={styles.bullets}>
                  {brief.knownImpacts.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className={styles.empty}>
                  No documented impacts are listed on this record yet.
                </p>
              )}
            </div>

            <div className={styles.block}>
              <h4 className={styles.blockTitle}>What&apos;s still uncertain</h4>
              {brief.uncertainItems.length > 0 ? (
                <ul className={styles.bullets}>
                  {brief.uncertainItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className={styles.empty}>
                  No explicit uncertainties are recorded for this proposal.
                </p>
              )}
            </div>

            {brief.neighbourhoodLines.length > 0 ? (
              <div className={styles.block}>
                <h4 className={styles.blockTitle}>
                  Relevant neighbourhood information
                </h4>
                <ul className={styles.bullets}>
                  {brief.neighbourhoodLines.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}

        {stage === 'haveYourSay' ? (
          <section className={styles.stage} aria-label="Have your say">
            <h3 className={styles.stageTitle}>03 Have your say</h3>

            {brief.deadlineBadge ? (
              <span
                className={`${styles.badge} ${BadgeToneClass(brief.deadlineBadge.tone)}`}
              >
                <span className={styles.badgeDot} aria-hidden="true" />
                {brief.deadlineBadge.label}
              </span>
            ) : null}

            {brief.feedbackHeadline ? (
              <p className={styles.feedbackHeadline}>{brief.feedbackHeadline}</p>
            ) : null}
            <p className={styles.participationStatus}>{brief.participationLabel}</p>

            {brief.feedbackDeadline ? (
              <div className={styles.deadlineCard}>
                <CalendarDays size={16} strokeWidth={2} aria-hidden="true" />
                <div>
                  <p className={styles.deadlineLabel}>Feedback deadline</p>
                  <p className={styles.deadlineValue}>{brief.feedbackDeadline}</p>
                </div>
              </div>
            ) : null}

            <ResidentFeedbackForm
              record={record}
              canPersistFeedback={canPersistFeedback}
            />

            {brief.participationCheckedOn ? (
              <p className={styles.footerMeta}>
                Participation information checked {brief.participationCheckedOn}
              </p>
            ) : null}
          </section>
        ) : null}

        {stage === 'records' ? (
          <section className={styles.stage} aria-label="Official records">
            <h3 className={styles.stageTitle}>04 Official records</h3>

            {brief.officialRecords.length > 0 ? (
              <ul className={styles.recordCards}>
                {brief.officialRecords.map((item) => (
                  <li key={item.href} className={styles.recordCard}>
                    <p className={styles.recordType}>{item.typeLabel}</p>
                    <a
                      className={styles.recordTitle}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {item.title}
                      <ExternalLink size={14} strokeWidth={2.25} aria-hidden="true" />
                    </a>
                    {item.reference ? (
                      <p className={styles.recordMeta}>Ref: {item.reference}</p>
                    ) : null}
                    {item.verifiedOn ? (
                      <p className={styles.recordMeta}>
                        Last checked: {item.verifiedOn}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>
                No linked official source URLs are available on this record.
              </p>
            )}

            {brief.relatedProcessNotes.length > 0 ? (
              <div className={styles.block}>
                <h4 className={styles.blockTitle}>Related processes</h4>
                <ul className={styles.bullets}>
                  {brief.relatedProcessNotes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      <footer className={styles.footer}>
        {brief.openQuestions.length > 0 ? (
          <div className={styles.mindRow}>
            <button
              type="button"
              className={styles.mindButton}
              aria-expanded={showOpenQuestions}
              onClick={() => setShowOpenQuestions((value) => !value)}
            >
              <span className={styles.mindIcon} aria-hidden="true">
                <CircleHelp size={16} strokeWidth={2.25} />
              </span>
              <span>Something else on your mind?</span>
              <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
            </button>
            {showOpenQuestions ? (
              <ul className={styles.openQuestions}>
                {brief.openQuestions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className={styles.footerNav}>
          {previous ? (
            <button
              type="button"
              className={styles.backButton}
              onClick={() => goToStage(previous)}
            >
              <ArrowLeft size={16} strokeWidth={2.25} aria-hidden="true" />
              Back
            </button>
          ) : (
            <span />
          )}

          {next && nextLabel ? (
            <button
              type="button"
              className={styles.nextButton}
              onClick={() => goToStage(next)}
            >
              {nextLabel}
              <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
            </button>
          ) : (
            <p className={styles.upToDate} role="status">
              You are up to date
            </p>
          )}
        </div>
      </footer>
    </aside>
  )
}
