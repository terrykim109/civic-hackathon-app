import { describe, expect, it } from 'vitest'
import { extractTextFromPdfBytes } from './extractPdfText'

function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

describe('extractTextFromPdfBytes', () => {
  it('extracts literal text operators from a simple PDF-like stream', () => {
    const pdfish = `
%PDF-1.4
1 0 obj<<>>endobj
stream
BT /F1 12 Tf (Rental housing demolition application for Danforth Road) Tj ET
endstream
stream
BT (Eight replacement rental units are proposed in the mixed-use building) Tj ET
endstream
%%EOF
`
    const text = extractTextFromPdfBytes(encode(pdfish))
    expect(text).toBeTruthy()
    expect(text!.toLowerCase()).toMatch(/rental housing demolition/)
    expect(text!.toLowerCase()).toMatch(/replacement rental/)
  })

  it('returns null for empty or binary-only payloads', () => {
    expect(extractTextFromPdfBytes(encode('%PDF-1.4 binary\x00\x01\x02'))).toBeNull()
    expect(extractTextFromPdfBytes(encode(''))).toBeNull()
  })
})
