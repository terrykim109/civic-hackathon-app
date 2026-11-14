/**
 * SSRF-safe URL checks for official municipal evidence fetching.
 * Only https URLs on an allowlisted public municipal host set are accepted.
 */

export const APPROVED_SOURCE_HOST_SUFFIXES = [
  'toronto.ca',
  'ontario.ca',
  'gov.on.ca',
  'canada.ca',
  'gc.ca',
] as const

const BLOCKED_HOSTS = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.google',
])

function isIpv4(hostname: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
}

function isPrivateOrLocalIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true
  }
  const [a, b] = parts as [number, number, number, number]
  if (a === 10 || a === 127 || a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT / some cloud metadata ranges
  return false
}

function isIpv6Literal(hostname: string): boolean {
  return hostname.includes(':')
}

export function hostMatchesApprovedSuffix(
  hostname: string,
  suffixes: readonly string[] = APPROVED_SOURCE_HOST_SUFFIXES,
): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, '')
  if (!host) return false
  return suffixes.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  )
}

export type AllowedSourceUrlResult =
  | { ok: true; href: string; hostname: string }
  | { ok: false; reason: string }

/**
 * Validate that a candidate evidence URL is safe to fetch server-side.
 * Rejects non-https, credentials, private hosts, and non-allowlisted domains.
 */
export function validateAllowedSourceUrl(
  raw: string,
  options?: { suffixes?: readonly string[] },
): AllowedSourceUrlResult {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false, reason: 'URL is empty.' }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return { ok: false, reason: 'URL is malformed.' }
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: 'Only https URLs are allowed.' }
  }

  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'URLs with credentials are not allowed.' }
  }

  const hostname = parsed.hostname.trim().toLowerCase().replace(/\.$/, '')
  if (!hostname || BLOCKED_HOSTS.has(hostname)) {
    return { ok: false, reason: 'Host is blocked.' }
  }

  if (hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '::1') {
    return { ok: false, reason: 'Loopback hosts are not allowed.' }
  }

  if (isIpv6Literal(hostname)) {
    return { ok: false, reason: 'Raw IPv6 hosts are not allowed.' }
  }

  if (isIpv4(hostname)) {
    if (isPrivateOrLocalIpv4(hostname)) {
      return { ok: false, reason: 'Private or local IP addresses are not allowed.' }
    }
    return { ok: false, reason: 'Raw IP hosts are not allowed; use official domain names.' }
  }

  if (!hostMatchesApprovedSuffix(hostname, options?.suffixes)) {
    return { ok: false, reason: 'Host is not on the approved municipal source list.' }
  }

  // Normalize: drop hash; keep query (needed for some notice APIs).
  parsed.hash = ''
  return { ok: true, href: parsed.toString(), hostname }
}

export function filterAllowedSourceUrls(
  urls: readonly string[],
  options?: { suffixes?: readonly string[]; max?: number },
): string[] {
  const max = options?.max ?? 12
  const seen = new Set<string>()
  const allowed: string[] = []
  for (const raw of urls) {
    const result = validateAllowedSourceUrl(raw, options)
    if (!result.ok) continue
    if (seen.has(result.href)) continue
    seen.add(result.href)
    allowed.push(result.href)
    if (allowed.length >= max) break
  }
  return allowed
}
