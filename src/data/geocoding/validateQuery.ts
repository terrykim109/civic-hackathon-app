/** Canadian postal code (with or without space), e.g. M1K 2P5 / m1k2p5. */
const CA_POSTAL =
  /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\s?\d[ABCEGHJ-NPRSTV-Z]\d$/i

export interface QueryValidation {
  ok: boolean
  normalized: string
  reason: string | null
  looksLikePostalCode: boolean
}

/**
 * Normalize and validate a location search string before calling the geocoder.
 * Does not invent coordinates — only decides whether the text is worth sending.
 */
export function validateLocationQuery(raw: string): QueryValidation {
  const normalized = raw.trim().replace(/\s+/g, ' ')
  if (!normalized) {
    return {
      ok: false,
      normalized: '',
      reason: 'Enter an address, postal code, or place name.',
      looksLikePostalCode: false,
    }
  }

  const compactPostal = normalized.replace(/\s/g, '')
  const looksLikePostalCode = CA_POSTAL.test(
    compactPostal.length === 6
      ? `${compactPostal.slice(0, 3)} ${compactPostal.slice(3)}`
      : normalized,
  )

  if (looksLikePostalCode) {
    const spaced =
      compactPostal.length === 6
        ? `${compactPostal.slice(0, 3).toUpperCase()} ${compactPostal.slice(3).toUpperCase()}`
        : normalized.toUpperCase()
    return {
      ok: true,
      normalized: spaced,
      reason: null,
      looksLikePostalCode: true,
    }
  }

  if (normalized.length < 3) {
    return {
      ok: false,
      normalized,
      reason: 'Type at least 3 characters, or a full postal code.',
      looksLikePostalCode: false,
    }
  }

  // Reject queries with no letters or digits (e.g. "???").
  if (!/[A-Za-z0-9]/.test(normalized)) {
    return {
      ok: false,
      normalized,
      reason: 'Enter a recognizable address, postal code, or place name.',
      looksLikePostalCode: false,
    }
  }

  return {
    ok: true,
    normalized,
    reason: null,
    looksLikePostalCode: false,
  }
}

export function isCanadianPostalCode(value: string): boolean {
  return validateLocationQuery(value).looksLikePostalCode
}
