import { describe, expect, it } from 'vitest'
import { extractTextFromHtml, extractTitleFromHtml } from './extractHtmlText'

describe('extractHtmlText', () => {
  it('extracts title and readable body text', () => {
    const html = `
      <html><head><title>City Notice &amp; Agenda</title>
      <script>alert('x')</script>
      <style>.x{color:red}</style></head>
      <body>
        <h1>Public meeting</h1>
        <p>The committee will consider rental demolition at Danforth Road.</p>
        <p>Residents may speak at the hearing.</p>
      </body></html>
    `
    expect(extractTitleFromHtml(html)).toBe('City Notice & Agenda')
    const text = extractTextFromHtml(html)
    expect(text).toMatch(/Public meeting/)
    expect(text).toMatch(/rental demolition/)
    expect(text).not.toMatch(/alert/)
    expect(text).not.toMatch(/color:red/)
  })

  it('respects max character limits', () => {
    const html = `<p>${'word '.repeat(100)}</p>`
    const text = extractTextFromHtml(html, 40)
    expect(text.length).toBeLessThanOrEqual(40)
  })
})
