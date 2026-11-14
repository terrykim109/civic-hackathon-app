import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../../auth/useAuth'
import {
  readAssistantClientKey,
  readAssistantLanguagePreference,
  requestAssistantTurn,
  writeAssistantLanguagePreference,
} from '../../lib/assistant/assistantApi'
import {
  ASSISTANT_SUPPORTED_LANGUAGES,
  assistantLanguageLabel,
  type AssistantDetailLevel,
} from '../../lib/assistant/languages'
import {
  ASSISTANT_MAX_USER_CHARS,
  type AssistantAreaContext,
  type AssistantChatMessage,
  type AssistantTurnResponse,
  type ResearchBrief,
} from '../../lib/assistant/types'
import { ResearchBriefView } from './ResearchBriefView'
import styles from './ResearchAssistantPanel.module.css'

interface ResearchAssistantPanelProps {
  area: AssistantAreaContext
  onClose: () => void
}

type SetupStep = 'language' | 'detail' | 'chat'

const DETAIL_CHOICES: Array<{ value: AssistantDetailLevel; label: string }> = [
  { value: 'concise', label: 'Concise' },
  { value: 'detailed', label: 'More detail' },
]

function detailLabel(value: AssistantDetailLevel): string {
  return value === 'detailed' ? 'More detail' : 'Concise'
}

export function ResearchAssistantPanel({
  area,
  onClose,
}: ResearchAssistantPanelProps) {
  const { client, clientConfigured } = useAuth()
  const titleId = useId()
  const freeTextId = useId()
  const transcriptRef = useRef<HTMLDivElement>(null)

  const [setupStep, setSetupStep] = useState<SetupStep>('language')
  const [history, setHistory] = useState<AssistantChatMessage[]>([])
  const [latest, setLatest] = useState<AssistantTurnResponse | null>(null)
  const [brief, setBrief] = useState<ResearchBrief | null>(null)
  const [freeText, setFreeText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ended, setEnded] = useState(false)
  const [language, setLanguage] = useState(() =>
    readAssistantLanguagePreference(),
  )
  const [detailLevel, setDetailLevel] =
    useState<AssistantDetailLevel>('concise')
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    setSetupStep('language')
    setLatest(null)
    setBrief(null)
    setFreeText('')
    setLoading(false)
    setError(
      client
        ? null
        : clientConfigured
          ? 'Explorer assistant is unavailable.'
          : 'Supabase is not configured, so the explorer assistant cannot run.',
    )
    setEnded(false)
    setShowDetail(false)
    setHistory([
      {
        role: 'assistant',
        content: `Hi — I'm the Explorer assistant for ${area.label}. Which language should I use?`,
      },
    ])
  }, [area, client, clientConfigured])

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [history, loading, setupStep])

  const chooseLanguage = (code: string) => {
    if (setupStep !== 'language' || loading) return
    const next = writeAssistantLanguagePreference(code)
    setLanguage(next)
    setHistory((current) => [
      ...current,
      { role: 'user', content: assistantLanguageLabel(next) },
      {
        role: 'assistant',
        content: 'Thanks. How detailed should my answers be?',
      },
    ])
    setSetupStep('detail')
  }

  const chooseDetail = (value: AssistantDetailLevel) => {
    if (setupStep !== 'detail' || loading) return
    setDetailLevel(value)
    setHistory((current) => [
      ...current,
      { role: 'user', content: detailLabel(value) },
      {
        role: 'assistant',
        content: `Great — ask anything about this area. I'll answer in ${assistantLanguageLabel(language)} (${detailLabel(value).toLowerCase()}).`,
      },
    ])
    setSetupStep('chat')
  }

  const sendTurn = async (
    userMessage: string,
    mode: 'converse' | 'research_brief' = 'converse',
  ) => {
    if (!client || ended || loading || setupStep !== 'chat') return
    const trimmed =
      mode === 'research_brief'
        ? userMessage.trim() ||
          'Please generate the evidence-based research brief for this conversation.'
        : userMessage.trim()
    if (mode === 'converse' && !trimmed) return

    const priorHistory = history
    const visibleUser =
      mode === 'research_brief'
        ? 'Generate a research brief from this conversation.'
        : trimmed

    setHistory([...priorHistory, { role: 'user', content: visibleUser }])
    setFreeText('')
    setLoading(true)
    setError(null)
    setShowDetail(false)

    const result = await requestAssistantTurn(client, {
      area,
      history: priorHistory,
      userMessage: trimmed,
      clientKey: readAssistantClientKey(),
      mode,
      language,
      detailLevel,
    })
    setLoading(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setLatest(result.data)
    if (result.data.researchBrief) setBrief(result.data.researchBrief)
    setHistory([
      ...priorHistory,
      { role: 'user', content: visibleUser },
      { role: 'assistant', content: result.data.message },
    ])
    if (result.data.detailedExplanation) {
      setShowDetail(detailLevel === 'detailed')
    }
    if (result.data.conversationComplete) setEnded(true)
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    void sendTurn(freeText, 'converse')
  }

  const canGenerateBrief =
    Boolean(client) &&
    setupStep === 'chat' &&
    history.some((item) => item.role === 'user') &&
    !loading &&
    !ended

  return (
    <aside
      className={styles.panel}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Explorer assistant</p>
          <h2 id={titleId} className={styles.title}>
            Explore {area.label}
          </h2>
          {area.wardName ? (
            <p className={styles.meta}>
              Ward {area.wardId}: {area.wardName}
            </p>
          ) : null}
          <p className={styles.disclaimer}>
            Uses municipal records and linked official documents — not legal
            advice. {area.proximityNote}
          </p>
        </div>
        <button
          type="button"
          className={styles.close}
          aria-label="Close explorer assistant"
          onClick={onClose}
        >
          <X size={16} strokeWidth={2.25} aria-hidden="true" />
        </button>
      </header>

      <div className={styles.chat}>
        <div
          className={styles.transcript}
          aria-live="polite"
          ref={transcriptRef}
        >
          {history.map((item, index) => (
            <div
              key={`${item.role}-${index}`}
              className={
                item.role === 'assistant'
                  ? styles.bubbleAssistant
                  : styles.bubbleUser
              }
            >
              <p className={styles.bubbleLabel}>
                {item.role === 'assistant' ? 'Explorer' : 'You'}
              </p>
              <p className={styles.bubbleText}>{item.content}</p>
            </div>
          ))}

          {latest?.researchFocus ? (
            <p className={styles.focus}>Focus: {latest.researchFocus}</p>
          ) : null}

          {latest?.evidenceStatus && latest.evidenceStatus !== 'skipped' ? (
            <p className={styles.status} role="status">
              Evidence:{' '}
              {latest.evidenceStatus === 'retrieved'
                ? 'official passages retrieved'
                : latest.evidenceStatus === 'partial'
                  ? 'some official sources retrieved'
                  : 'official documents unavailable for this turn'}
            </p>
          ) : null}

          {latest?.glossary && latest.glossary.length > 0 ? (
            <ul className={styles.glossary}>
              {latest.glossary.map((item) => (
                <li key={item.term}>
                  <strong>{item.term}</strong> — {item.plainLanguage}
                </li>
              ))}
            </ul>
          ) : null}

          {latest?.detailedExplanation ? (
            <div className={styles.detailBlock}>
              <button
                type="button"
                className={styles.detailToggle}
                aria-expanded={showDetail}
                onClick={() => setShowDetail((value) => !value)}
              >
                {showDetail
                  ? 'Hide detailed explanation'
                  : 'Show detailed explanation'}
              </button>
              {showDetail ? (
                <p className={styles.detailText}>{latest.detailedExplanation}</p>
              ) : null}
            </div>
          ) : null}

          {latest?.comparisonNote ? (
            <p className={styles.comparisonNote} role="status">
              {latest.comparisonNote}
            </p>
          ) : null}

          {brief ? <ResearchBriefView brief={brief} /> : null}

          {latest?.nextQuestion && !ended && setupStep === 'chat' ? (
            <p className={styles.nextQuestion}>{latest.nextQuestion}</p>
          ) : null}

          {latest?.citations && latest.citations.length > 0 ? (
            <ul className={styles.citations}>
              {latest.citations.map((citation) => (
                <li
                  key={`${citation.href}-${citation.passage?.slice(0, 24) ?? ''}`}
                >
                  <a href={citation.href} target="_blank" rel="noreferrer">
                    {citation.label}
                  </a>
                  {citation.passage ? (
                    <blockquote className={styles.passage}>
                      {citation.passage}
                      <span className={styles.passageNote}>
                        {citation.isOriginalPassage === false
                          ? ' (translated explanation — verify against the original)'
                          : ' (original source excerpt)'}
                      </span>
                    </blockquote>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {loading ? (
            <p className={styles.status} role="status">
              Thinking…
            </p>
          ) : null}
        </div>

        <div className={styles.composer}>
          {setupStep === 'language' ? (
            <div className={styles.options} role="group" aria-label="Language">
              {ASSISTANT_SUPPORTED_LANGUAGES.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  className={styles.option}
                  disabled={loading || !client}
                  onClick={() => chooseLanguage(item.code)}
                >
                  {item.nativeLabel}
                </button>
              ))}
            </div>
          ) : null}

          {setupStep === 'detail' ? (
            <div
              className={styles.options}
              role="group"
              aria-label="Answer length"
            >
              {DETAIL_CHOICES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={styles.option}
                  disabled={loading || !client}
                  onClick={() => chooseDetail(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}

          {latest &&
          latest.options.length > 0 &&
          !ended &&
          setupStep === 'chat' ? (
            <div className={styles.options}>
              <p className={styles.suggestionsLabel}>Suggested follow-ups</p>
              {latest.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={styles.option}
                  disabled={loading}
                  onClick={() => {
                    void sendTurn(option, 'converse')
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : null}

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          {setupStep === 'chat' && !ended ? (
            <form className={styles.form} onSubmit={onSubmit}>
              <label className={styles.label} htmlFor={freeTextId}>
                Ask anything about this area
                <textarea
                  id={freeTextId}
                  className={styles.textarea}
                  rows={2}
                  maxLength={ASSISTANT_MAX_USER_CHARS}
                  value={freeText}
                  disabled={loading || !client}
                  placeholder="What stage is this proposal at? Compare these projects…"
                  onChange={(event) => setFreeText(event.target.value)}
                />
              </label>
              <div className={styles.actions}>
                <button
                  type="submit"
                  className={styles.primary}
                  disabled={loading || !freeText.trim() || !client}
                >
                  Send
                </button>
                {canGenerateBrief ? (
                  <button
                    type="button"
                    className={styles.secondary}
                    disabled={loading}
                    onClick={() => {
                      void sendTurn('', 'research_brief')
                    }}
                  >
                    {brief ? 'Refresh brief' : 'Research brief'}
                  </button>
                ) : null}
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={loading}
                  onClick={() => {
                    setEnded(true)
                    setLatest((current) =>
                      current
                        ? {
                            ...current,
                            conversationComplete: true,
                            nextQuestion: null,
                          }
                        : current,
                    )
                  }}
                >
                  End
                </button>
              </div>
            </form>
          ) : null}

          {ended ? (
            <p className={styles.status} role="status">
              Conversation ended. Close this panel or choose Explore this area
              again to start over.
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
