/** Pure helpers for the map cursor aura — kept free of DOM for unit tests. */

export const AURA_MAX_SPEED_PX_S = 1400
export const AURA_TRAIL_MAX = 14
export const AURA_RIPPLE_MAX = 8

export interface AuraPoint {
  x: number
  y: number
  strength: number
  bornAt: number
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Normalize pointer speed (px/s) into a 0–1 intensity driver. */
export function speedToIntensity(speedPxPerSec: number): number {
  return clamp(speedPxPerSec / AURA_MAX_SPEED_PX_S, 0, 1)
}

/**
 * Soften intensity toward a target each frame.
 * When idle (target near 0), decay is slower so the glow dissipates gradually.
 */
export function stepIntensity(
  current: number,
  target: number,
  dtSec: number,
): number {
  const rate = target > current ? 10 : 2.4
  const t = 1 - Math.exp(-rate * dtSec)
  return lerp(current, target, t)
}

export function pushTrailPoint(
  trail: AuraPoint[],
  point: AuraPoint,
  max = AURA_TRAIL_MAX,
): AuraPoint[] {
  const next = trail.length >= max ? trail.slice(trail.length - max + 1) : [...trail]
  next.push(point)
  return next
}

export function pruneExpired(
  items: AuraPoint[],
  now: number,
  lifetimeMs: number,
): AuraPoint[] {
  return items.filter((item) => now - item.bornAt < lifetimeMs)
}

/** Deterministic 0–1 hash for tiled texture cells. */
export function cellNoise(cellX: number, cellY: number): number {
  const n = Math.sin(cellX * 127.1 + cellY * 311.7) * 43758.5453
  return n - Math.floor(n)
}
