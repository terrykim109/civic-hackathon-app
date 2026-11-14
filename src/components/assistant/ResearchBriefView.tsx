import { useId, useState } from 'react'
import type {
  ResearchBrief,
  ResearchBriefFinding,
  ResearchClaimKind,
} from '../../lib/assistant/types'
import styles from './ResearchBriefView.module.css'

interface ResearchBriefViewProps {
  brief: ResearchBrief
}

function kindLabel(kind: ResearchClaimKind): string {
  switch (kind) {
    case 'documented_fact':
      return 'Documented fact'
    case 'potential_impact':
      return 'Potential impact'
    case 'hypothetical':
      return 'Hypothetical'
    case 'uncertainty':
      return 'Uncertainty'
  }
}

function kindClass(kind: ResearchClaimKind): string {
  switch (kind) {
    case 'documented_fact':
      return styles.kindDocumented
    case 'potential_impact':
      return styles.kindPotential
    case 'hypothetical':
      return styles.kindHypothetical
    case 'uncertainty':
      return styles.kindUncertainty
  }
}

function FindingCard({ finding }: { finding: ResearchBriefFinding }) {
  const detailsId = useId()
  const [open, setOpen] = useState(false)
  const hasEvidence = finding.citations.length > 0

  return (
    <article className={styles.finding}>
      <div className={styles.findingTop}>
        <span className={`${styles.kind} ${kindClass(finding.kind)}`}>
          {kindLabel(finding.kind)}
        </span>
        {finding.citations[0] ? (
          <a
            className={styles.sourceChip}
            href={finding.citations[0].href}
            target="_blank"
            rel="noreferrer"
          >
            {finding.citations[0].label}
          </a>
        ) : null}
      </div>
      <p className={styles.findingText}>{finding.text}</p>
      {hasEvidence ? (
        <div className={styles.evidenceBlock}>
          <button
            type="button"
            className={styles.evidenceToggle}
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? 'Hide supporting evidence' : 'Show supporting evidence'}
          </button>
          {open ? (
            <ul id={detailsId} className={styles.evidenceList}>
              {finding.citations.map((citation) => (
                <li key={`${citation.href}-${citation.passage?.slice(0, 24) ?? ''}`}>
                  <a href={citation.href} target="_blank" rel="noreferrer">
                    {citation.label}
                  </a>
                  {citation.passage ? (
                    <blockquote className={styles.passage}>
                      {citation.passage}
                    </blockquote>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

export function ResearchBriefView({ brief }: ResearchBriefViewProps) {
  return (
    <section className={styles.brief} aria-label="Research brief">
      <header className={styles.header}>
        <p className={styles.eyebrow}>Research brief</p>
        <h3 className={styles.title}>{brief.title}</h3>
        {brief.focus ? <p className={styles.focus}>Focus: {brief.focus}</p> : null}
        {brief.summaryNote ? (
          <p className={styles.note}>{brief.summaryNote}</p>
        ) : null}
        <p className={styles.evidenceStatus} role="status">
          Evidence:{' '}
          {brief.evidenceStatus === 'retrieved'
            ? 'official passages retrieved'
            : brief.evidenceStatus === 'partial'
              ? 'some official sources retrieved'
              : brief.evidenceStatus === 'unavailable'
                ? 'official documents unavailable'
                : 'structured records only'}
        </p>
      </header>

      <div className={styles.sections}>
        {brief.sections.map((section) => (
          <section key={section.id} className={styles.section}>
            <h4 className={styles.sectionTitle}>{section.title}</h4>
            <div className={styles.findings}>
              {section.findings.map((finding) => (
                <FindingCard key={finding.id} finding={finding} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}
