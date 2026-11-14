import { describe, expect, it } from 'vitest'
import {
  filterAllowedSourceUrls,
  validateAllowedSourceUrl,
} from './allowedSourceUrl'

describe('validateAllowedSourceUrl', () => {
  it('accepts approved municipal https hosts', () => {
    const result = validateAllowedSourceUrl(
      'https://www.toronto.ca/legdocs/mmis/2021/sc/bgrd/backgroundfile-165240.pdf',
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.hostname).toBe('www.toronto.ca')
  })

  it('rejects non-https, credentials, localhost, and private IPs', () => {
    expect(validateAllowedSourceUrl('http://toronto.ca/notice').ok).toBe(false)
    expect(
      validateAllowedSourceUrl('https://user:pass@toronto.ca/notice').ok,
    ).toBe(false)
    expect(validateAllowedSourceUrl('https://localhost/secret').ok).toBe(false)
    expect(validateAllowedSourceUrl('https://127.0.0.1/secret').ok).toBe(false)
    expect(validateAllowedSourceUrl('https://192.168.1.10/secret').ok).toBe(false)
    expect(validateAllowedSourceUrl('https://169.254.169.254/latest').ok).toBe(
      false,
    )
  })

  it('rejects hosts outside the municipal allowlist', () => {
    expect(validateAllowedSourceUrl('https://evil.example/doc').ok).toBe(false)
    expect(validateAllowedSourceUrl('https://not-toronto.ca.evil.com/x').ok).toBe(
      false,
    )
  })

  it('rejects malformed URLs', () => {
    expect(validateAllowedSourceUrl('not a url').ok).toBe(false)
    expect(validateAllowedSourceUrl('').ok).toBe(false)
  })
})

describe('filterAllowedSourceUrls', () => {
  it('dedupes and keeps only allowed URLs up to max', () => {
    const urls = filterAllowedSourceUrls(
      [
        'https://secure.toronto.ca/nm/api/individual/notice/8007.do',
        'https://secure.toronto.ca/nm/api/individual/notice/8007.do',
        'https://evil.example/x',
        'https://www.ontario.ca/page',
        '/assets/local-snapshot.html',
      ],
      { max: 2 },
    )
    expect(urls).toEqual([
      'https://secure.toronto.ca/nm/api/individual/notice/8007.do',
      'https://www.ontario.ca/page',
    ])
  })
})
