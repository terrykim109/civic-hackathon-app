import { describe, expect, it } from 'vitest'
import {
  assistantLanguageLabel,
  normalizeAssistantLanguage,
  normalizeDetailLevel,
} from './languages'

describe('normalizeAssistantLanguage', () => {
  it('accepts supported codes and BCP-47 prefixes', () => {
    expect(normalizeAssistantLanguage('fr')).toBe('fr')
    expect(normalizeAssistantLanguage('FR-CA')).toBe('fr')
    expect(normalizeAssistantLanguage('zh-Hans')).toBe('zh')
    expect(normalizeAssistantLanguage('es')).toBe('es')
  })

  it('falls back to English for unknown values', () => {
    expect(normalizeAssistantLanguage('de')).toBe('en')
    expect(normalizeAssistantLanguage('')).toBe('en')
    expect(normalizeAssistantLanguage(null)).toBe('en')
  })
})

describe('assistantLanguageLabel', () => {
  it('returns native labels for supported codes', () => {
    expect(assistantLanguageLabel('fr')).toBe('Français')
    expect(assistantLanguageLabel('ta')).toBe('தமிழ்')
  })
})

describe('normalizeDetailLevel', () => {
  it('defaults to concise', () => {
    expect(normalizeDetailLevel('detailed')).toBe('detailed')
    expect(normalizeDetailLevel('concise')).toBe('concise')
    expect(normalizeDetailLevel('nope')).toBe('concise')
  })
})
