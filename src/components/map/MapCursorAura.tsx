import { useEffect, useRef } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import {
  AURA_RIPPLE_MAX,
  type AuraPoint,
  cellNoise,
  clamp,
  pruneExpired,
  pushTrailPoint,
  speedToIntensity,
  stepIntensity,
} from './cursorAuraMath'
import styles from './MapCursorAura.module.css'

interface MapCursorAuraProps {
  map: MapLibreMap | null
}

const TRAIL_LIFE_MS = 520
const RIPPLE_LIFE_MS = 900
const IDLE_SPEED_PX_S = 18

const PEACH = { r: 255, g: 176, b: 122 }
const MINT = { r: 120, g: 210, b: 198 }

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function createNoisePattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  const size = 64
  const tile = document.createElement('canvas')
  tile.width = size
  tile.height = size
  const tileCtx = tile.getContext('2d')
  if (!tileCtx) return null

  const cell = 4
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const n = cellNoise(x / cell, y / cell)
      const alpha = 0.04 + n * 0.14
      tileCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`
      tileCtx.fillRect(x, y, cell - 0.5, cell - 0.5)
    }
  }
  return ctx.createPattern(tile, 'repeat')
}

/**
 * Screen-space cursor aura for the MapLibre viewport.
 * Purely decorative — does not encode geographic meaning.
 * Canvas sits in the WebGL canvas container (under HTML markers) with
 * pointer-events: none so map drag/zoom/marker clicks stay intact.
 */
export function MapCursorAura({ map }: MapCursorAuraProps) {
  const reducedRef = useRef(prefersReducedMotion())

  useEffect(() => {
    if (!map) return

    const canvas = document.createElement('canvas')
    canvas.className = styles.canvas
    canvas.setAttribute('aria-hidden', 'true')

    const host = map.getCanvasContainer()
    const container = map.getContainer()
    host.appendChild(canvas)

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) {
      canvas.remove()
      return
    }

    let width = 0
    let height = 0
    let dpr = 1
    let noisePattern: CanvasPattern | null = null

    let running = true
    let rafId = 0
    let lastTs = performance.now()
    let lastMoveTs = lastTs
    let lastX = 0
    let lastY = 0
    let cursorX = 0
    let cursorY = 0
    let hasCursor = false
    let intensity = 0
    let targetIntensity = 0
    let trail: AuraPoint[] = []
    let ripples: AuraPoint[] = []
    let emitAccumulator = 0
    let touchFadeTimer: ReturnType<typeof setTimeout> | undefined

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncMotion = () => {
      reducedRef.current = media.matches
    }
    syncMotion()
    media.addEventListener('change', syncMotion)

    const localPoint = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }
    }

    const resize = () => {
      const mapCanvas = map.getCanvas()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(1, mapCanvas.clientWidth || container.clientWidth)
      height = Math.max(1, mapCanvas.clientHeight || container.clientHeight)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      noisePattern = createNoisePattern(ctx)
    }

    const spawnRipple = (x: number, y: number, strength: number, now: number) => {
      if (reducedRef.current) return
      ripples = pruneExpired(ripples, now, RIPPLE_LIFE_MS)
      if (ripples.length >= AURA_RIPPLE_MAX) {
        ripples = ripples.slice(1)
      }
      ripples.push({
        x,
        y,
        strength: clamp(strength, 0.15, 1),
        bornAt: now,
      })
    }

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return

      const now = performance.now()
      const { x, y } = localPoint(event)
      const dt = Math.max(0.001, (now - lastMoveTs) / 1000)
      const speed = Math.hypot(x - lastX, y - lastY) / dt
      const speedNorm = speedToIntensity(speed)

      cursorX = x
      cursorY = y
      hasCursor = true
      targetIntensity = reducedRef.current
        ? 0.22
        : clamp(0.22 + speedNorm * 0.78, 0.18, 1)

      if (!reducedRef.current && speed > IDLE_SPEED_PX_S) {
        trail = pushTrailPoint(trail, {
          x,
          y,
          strength: targetIntensity,
          bornAt: now,
        })
        emitAccumulator += speedNorm
        if (emitAccumulator > 0.55) {
          spawnRipple(x, y, 0.35 + speedNorm * 0.55, now)
          emitAccumulator = 0
        }
      }

      lastX = x
      lastY = y
      lastMoveTs = now
    }

    const onPointerLeave = () => {
      hasCursor = false
      targetIntensity = 0
    }

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') return
      const now = performance.now()
      const { x, y } = localPoint(event)
      cursorX = x
      cursorY = y
      hasCursor = true
      targetIntensity = reducedRef.current ? 0.2 : 0.55
      spawnRipple(x, y, 0.7, now)
      if (touchFadeTimer !== undefined) clearTimeout(touchFadeTimer)
      touchFadeTimer = setTimeout(() => {
        targetIntensity = 0
        hasCursor = false
      }, 180)
    }

    const drawFocal = (x: number, y: number, alpha: number) => {
      const halo = ctx.createRadialGradient(x, y, 2, x, y, 18)
      halo.addColorStop(0, `rgba(255, 252, 248, ${0.55 * alpha})`)
      halo.addColorStop(0.55, `rgba(255, 252, 248, ${0.18 * alpha})`)
      halo.addColorStop(1, 'rgba(255, 252, 248, 0)')
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(x, y, 18, 0, Math.PI * 2)
      ctx.fill()

      ctx.beginPath()
      ctx.fillStyle = `rgba(42, 36, 32, ${0.78 * alpha})`
      ctx.arc(x, y, 5.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.beginPath()
      ctx.fillStyle = `rgba(255, 250, 245, ${0.92 * alpha})`
      ctx.arc(x, y, 1.7, 0, Math.PI * 2)
      ctx.fill()
    }

    const drawDualGlow = (
      x: number,
      y: number,
      radius: number,
      alpha: number,
    ) => {
      const peach = ctx.createRadialGradient(
        x - radius * 0.18,
        y,
        radius * 0.05,
        x - radius * 0.12,
        y,
        radius,
      )
      peach.addColorStop(
        0,
        `rgba(${PEACH.r}, ${PEACH.g}, ${PEACH.b}, ${0.34 * alpha})`,
      )
      peach.addColorStop(
        0.45,
        `rgba(${PEACH.r}, ${PEACH.g}, ${PEACH.b}, ${0.12 * alpha})`,
      )
      peach.addColorStop(1, `rgba(${PEACH.r}, ${PEACH.g}, ${PEACH.b}, 0)`)

      const mint = ctx.createRadialGradient(
        x + radius * 0.2,
        y,
        radius * 0.05,
        x + radius * 0.14,
        y,
        radius,
      )
      mint.addColorStop(
        0,
        `rgba(${MINT.r}, ${MINT.g}, ${MINT.b}, ${0.3 * alpha})`,
      )
      mint.addColorStop(
        0.45,
        `rgba(${MINT.r}, ${MINT.g}, ${MINT.b}, ${0.11 * alpha})`,
      )
      mint.addColorStop(1, `rgba(${MINT.r}, ${MINT.g}, ${MINT.b}, 0)`)

      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = peach
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
      ctx.fillStyle = mint
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
      ctx.globalCompositeOperation = 'source-over'
    }

    const drawTexture = (x: number, y: number, radius: number, alpha: number) => {
      if (!noisePattern || alpha < 0.02) return
      ctx.save()
      ctx.beginPath()
      ctx.arc(x, y, radius * 0.92, 0, Math.PI * 2)
      ctx.clip()
      ctx.globalAlpha = 0.22 * alpha
      ctx.fillStyle = noisePattern
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
      ctx.restore()
    }

    const drawRipples = (now: number) => {
      for (const ripple of ripples) {
        const age = (now - ripple.bornAt) / RIPPLE_LIFE_MS
        if (age < 0 || age >= 1) continue
        const radius = 28 + age * (90 + ripple.strength * 70)
        const alpha = (1 - age) * ripple.strength * 0.28
        ctx.beginPath()
        ctx.strokeStyle = `rgba(255, 248, 240, ${alpha})`
        ctx.lineWidth = 1.4
        ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2)
        ctx.stroke()

        ctx.beginPath()
        ctx.strokeStyle = `rgba(${MINT.r}, ${MINT.g}, ${MINT.b}, ${alpha * 0.55})`
        ctx.lineWidth = 1
        ctx.arc(ripple.x, ripple.y, radius * 0.72, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    const frame = (ts: number) => {
      if (!running) return
      const dt = Math.min(0.05, (ts - lastTs) / 1000)
      lastTs = ts

      if (hasCursor && ts - lastMoveTs > 80) {
        targetIntensity = reducedRef.current ? 0.16 : 0.12
      }

      intensity = stepIntensity(intensity, hasCursor ? targetIntensity : 0, dt)
      trail = pruneExpired(trail, ts, TRAIL_LIFE_MS)
      ripples = pruneExpired(ripples, ts, RIPPLE_LIFE_MS)

      ctx.clearRect(0, 0, width, height)

      if (intensity > 0.01 || trail.length > 0 || ripples.length > 0) {
        if (!reducedRef.current) {
          for (const point of trail) {
            const age = (ts - point.bornAt) / TRAIL_LIFE_MS
            const a = (1 - age) * point.strength * intensity * 0.45
            if (a < 0.02) continue
            drawDualGlow(point.x, point.y, 70 + point.strength * 40, a)
          }
        }

        if (hasCursor || intensity > 0.02) {
          const radius = reducedRef.current ? 90 : 110 + intensity * 95
          drawDualGlow(cursorX, cursorY, radius, intensity)
          if (!reducedRef.current) {
            drawTexture(cursorX, cursorY, radius, intensity)
            drawRipples(ts)
          }
          drawFocal(cursorX, cursorY, Math.min(1, intensity * 1.15 + 0.15))
        } else if (ripples.length > 0) {
          drawRipples(ts)
        }
      }

      rafId = window.requestAnimationFrame(frame)
    }

    resize()
    map.on('resize', resize)
    map.on('load', resize)
    // Idle maps may finish layout after the first paint.
    const layoutTimer = window.setTimeout(resize, 120)
    container.addEventListener('pointermove', onPointerMove)
    container.addEventListener('pointerleave', onPointerLeave)
    container.addEventListener('pointerup', onPointerUp)
    rafId = window.requestAnimationFrame(frame)

    return () => {
      running = false
      window.cancelAnimationFrame(rafId)
      window.clearTimeout(layoutTimer)
      if (touchFadeTimer !== undefined) clearTimeout(touchFadeTimer)
      media.removeEventListener('change', syncMotion)
      map.off('resize', resize)
      map.off('load', resize)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerleave', onPointerLeave)
      container.removeEventListener('pointerup', onPointerUp)
      canvas.remove()
    }
  }, [map])

  return null
}
