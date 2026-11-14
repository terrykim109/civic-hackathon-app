import { describe, expect, it, vi } from 'vitest'
import type { CivicSupabaseClient } from '../supabase/client'
import { requestAssistantTurn } from './assistantApi'
import type { AssistantAreaContext } from './types'

const area: AssistantAreaContext = {
  label: 'Test Area',
  coordinates: [-79.38, 43.65],
  wardId: '7',
  wardName: 'York Centre',
  records: [],
  proximityNote: 'Distances are straight-line only.',
}

function mockClient(
  invokeImpl: ReturnType<typeof vi.fn>,
): CivicSupabaseClient {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    functions: {
      invoke: invokeImpl,
    },
  } as unknown as CivicSupabaseClient
}

describe('requestAssistantTurn', () => {
  it('returns validated assistant data on success', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        message: 'Welcome to this area.',
        nextQuestion: 'What do you want to investigate?',
        options: ['Nearby proposals', 'Participation windows'],
        researchFocus: 'Orientation',
        sources: [],
        conversationComplete: false,
      },
      error: null,
    })

    const result = await requestAssistantTurn(mockClient(invoke), {
      area,
      history: [],
      userMessage: '',
      clientKey: 'test-client',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.message).toMatch(/Welcome/)
    expect(result.data.citations).toEqual([])
    expect(result.data.evidenceStatus).toBe('skipped')
    expect(result.data.researchBrief).toBeNull()
    expect(result.data.language).toBe('en')
    expect(invoke).toHaveBeenCalledWith(
      'municipal-research-assistant',
      expect.objectContaining({
        body: expect.objectContaining({
          clientKey: 'test-client',
          userMessage: '',
          mode: 'converse',
          language: 'en',
          detailLevel: 'concise',
        }),
      }),
    )
  })

  it('passes free-text follow-ups with language and detail preferences', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        message: 'A zoning by-law amendment changes what can be built.',
        nextQuestion: 'Want the approval stages?',
        options: ['Approval stages', 'Outstanding decisions'],
        glossary: [
          {
            term: 'zoning by-law amendment',
            plainLanguage: 'A change to local building rules.',
          },
        ],
        language: 'en',
        detailedExplanation: 'Stage-by-stage explanation…',
        comparisonNote: null,
        conversationComplete: false,
      },
      error: null,
    })

    const result = await requestAssistantTurn(mockClient(invoke), {
      area,
      history: [
        { role: 'assistant', content: 'Welcome' },
        { role: 'user', content: 'What is happening nearby?' },
      ],
      userMessage: 'What does zoning by-law amendment mean?',
      clientKey: 'test',
      mode: 'converse',
      language: 'fr',
      detailLevel: 'detailed',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.glossary).toHaveLength(1)
    expect(invoke.mock.calls[0]![1].body).toEqual(
      expect.objectContaining({
        language: 'fr',
        detailLevel: 'detailed',
        userMessage: 'What does zoning by-law amendment mean?',
      }),
    )
  })

  it('surfaces insufficient-comparison notes without inventing outcomes', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        message: 'I can describe each proposal separately, but not compare them yet.',
        comparisonNote:
          'Official evidence is incomplete for at least one proposal, so a comparison would be unreliable.',
        conversationComplete: false,
        language: 'en',
      },
      error: null,
    })

    const result = await requestAssistantTurn(mockClient(invoke), {
      area,
      history: [],
      userMessage: 'Compare proposal A and proposal B',
      clientKey: 'test',
      language: 'en',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.comparisonNote).toMatch(/incomplete|unreliable/i)
  })

  it('requests a research brief and requires a validated brief payload', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        message: 'Brief ready.',
        nextQuestion: 'Want to review uncertainties?',
        options: ['Uncertainties'],
        researchFocus: 'Housing',
        sources: [],
        citations: [],
        evidenceStatus: 'retrieved',
        conversationComplete: false,
        researchBrief: {
          title: 'Brief',
          sections: [
            {
              id: 'uncertainties',
              findings: [
                {
                  text: 'Meeting date is not confirmed in retrieved sources.',
                  kind: 'uncertainty',
                  citations: [],
                },
              ],
            },
          ],
        },
      },
      error: null,
    })

    const result = await requestAssistantTurn(mockClient(invoke), {
      area,
      history: [{ role: 'user', content: 'Summarize housing issues' }],
      userMessage: '',
      clientKey: 'test',
      mode: 'research_brief',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.researchBrief?.title).toBe('Brief')
    expect(invoke.mock.calls[0]![1].body.mode).toBe('research_brief')
  })

  it('fails research_brief mode when the brief is malformed', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        message: 'Oops',
        conversationComplete: false,
        researchBrief: { title: 'Empty', sections: [] },
      },
      error: null,
    })

    const result = await requestAssistantTurn(mockClient(invoke), {
      area,
      history: [],
      userMessage: '',
      clientKey: 'test',
      mode: 'research_brief',
    })

    expect(result.ok).toBe(false)
  })

  it('trims history and user message before invoking', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        message: 'Noted.',
        nextQuestion: null,
        options: [],
        researchFocus: null,
        sources: [],
        conversationComplete: true,
      },
      error: null,
    })

    const longHistory = Array.from({ length: 20 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `turn-${i}`,
    }))

    await requestAssistantTurn(mockClient(invoke), {
      area,
      history: longHistory,
      userMessage: `${'a'.repeat(1500)}`,
      clientKey: '  key  ',
    })

    const body = invoke.mock.calls[0]![1].body as {
      history: unknown[]
      userMessage: string
      clientKey: string
    }
    expect(body.history).toHaveLength(16)
    expect(body.userMessage).toHaveLength(1200)
    expect(body.clientKey).toBe('key')
  })

  it('maps transport failures from functions.invoke', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Failed to send a request to the Edge Function' },
    })

    const result = await requestAssistantTurn(mockClient(invoke), {
      area,
      history: [],
      userMessage: 'hello',
      clientKey: 'test',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/Failed to send|explorer assistant/i)
  })

  it('prefers Edge Function JSON error bodies over generic non-2xx messages', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: {
          json: async () => ({
            error:
              'The explorer assistant model is temporarily unavailable. Please try again shortly.',
          }),
        },
      },
    })

    const result = await requestAssistantTurn(mockClient(invoke), {
      area,
      history: [],
      userMessage: 'hello',
      clientKey: 'test',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/temporarily unavailable/i)
  })

  it('surfaces structured error payloads from the function', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { error: 'Too many assistant requests. Please wait a minute and try again.' },
      error: null,
    })

    const result = await requestAssistantTurn(mockClient(invoke), {
      area,
      history: [],
      userMessage: 'hello',
      clientKey: 'test',
    })

    expect(result).toEqual({
      ok: false,
      error:
        'Too many assistant requests. Please wait a minute and try again.',
    })
  })

  it('rejects invalid model JSON returned by the function', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { nextQuestion: 'Missing message field' },
      error: null,
    })

    const result = await requestAssistantTurn(mockClient(invoke), {
      area,
      history: [],
      userMessage: 'hello',
      clientKey: 'test',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/missing a message|invalid/i)
  })
})
