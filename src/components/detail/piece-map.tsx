import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '@/hooks/use-media-query'
import type { PieceBitfield } from '@/lib/pieces'
import type { StatusTone } from '@/lib/torrent'

interface Props {
  bitfield: PieceBitfield
  tone: StatusTone
  rows?: number
  cellSize?: number
  gap?: number
}

/**
 * Grid of cells showing which pieces we have, filled column by column (left → right), so a
 * sequential download reads like a progress bar but gaps stay visible.
 *
 * Motion (skipped with reduced motion): cells cascade in on mount, a new state color sweeps
 * across left to right, and newly completed pieces pop in.
 */
export function PieceMap({ bitfield, tone, rows = 6, cellSize = 6, gap = 2 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [width, setWidth] = useState(0)
  const reduceMotion = usePrefersReducedMotion()
  const themeVersion = useThemeVersion()
  const height = rows * cellSize + (rows - 1) * gap

  useLayoutEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry?.contentRect.width ?? 0)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const columns = Math.max(1, Math.floor((width + gap) / (cellSize + gap)))
  const cells = useMemo(() => {
    const total = columns * rows
    const count = bitfield.count
    return Array.from({ length: total }, (_, cell) => {
      const lower = Math.floor((cell * count) / total)
      const upper = Math.max(lower + 1, Math.floor(((cell + 1) * count) / total))
      return bitfield.fraction(lower, Math.min(upper, count))
    })
  }, [bitfield, columns, rows])

  // Animation bookkeeping lives in a ref: it changes every frame and shouldn't re-render.
  const anim = useRef({
    appearStart: 0,
    fromTone: null as StatusTone | null,
    toneStart: 0,
    previousCells: null as number[] | null,
    fillStart: 0,
    lastCells: null as number[] | null,
    lastTone: tone,
    frame: 0,
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: themeVersion re-resolves the CSS colors
  useEffect(() => {
    const state = anim.current
    const now = performance.now()
    if (!reduceMotion) {
      if (state.lastCells === null) state.appearStart = now
      else if (state.lastCells.length === cells.length && state.lastCells.some((v, i) => v !== cells[i])) {
        state.previousCells = state.lastCells
        state.fillStart = now
      }
      if (state.lastTone !== tone) {
        state.fromTone = state.lastTone
        state.toneStart = now
      }
    }
    state.lastCells = cells
    state.lastTone = tone

    const canvas = canvasRef.current
    if (!canvas || width === 0) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    const context = canvas.getContext('2d')
    if (!context) return

    const cellWidth = (width - (columns - 1) * gap) / columns
    const lastColumn = Math.max(columns - 1, 1)

    const draw = (time: number) => {
      const styles = getComputedStyle(canvas)
      const color = styles.getPropertyValue(`--status-${tone}`).trim() || 'gray'
      const fromColor = state.fromTone ? styles.getPropertyValue(`--status-${state.fromTone}`).trim() : null
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      context.clearRect(0, 0, width, height)
      let animating = false

      for (let index = 0; index < cells.length; index++) {
        const column = Math.floor(index / rows)
        const row = index % rows
        const x = column / lastColumn

        const appear = progress(time, state.appearStart, x * 350 + row * 15, 350)
        const sweep = fromColor ? progress(time, state.toneStart, x * 450, 300) : 1
        let fill = cells[index] ?? 0
        let fillProgress = 1
        const previous = state.previousCells?.[index]
        if (previous !== undefined && previous !== fill) {
          fillProgress = progress(time, state.fillStart, x * 300, 400)
          fill = previous + (fill - previous) * fillProgress
        }
        if (appear < 1 || sweep < 1 || fillProgress < 1) animating = true

        const pop = Math.max(
          sweep < 1 ? Math.sin(Math.PI * sweep) * 0.35 : 0,
          fillProgress < 1 ? Math.sin(Math.PI * fillProgress) * 0.5 : 0,
        )
        const scale = appear * (1 + pop)
        if (scale <= 0) continue

        const w = cellWidth * scale
        const h = cellSize * scale
        const cx = column * (cellWidth + gap) + cellWidth / 2
        const cy = row * (cellSize + gap) + cellSize / 2
        const alpha = (0.14 + 0.86 * fill) * appear
        const radius = Math.min(w, h) * 0.3

        // Crossfade from the previous state's color as the sweep passes.
        if (fromColor && sweep < 1) {
          context.globalAlpha = alpha * (1 - sweep)
          context.fillStyle = fromColor
          context.beginPath()
          context.roundRect(cx - w / 2, cy - h / 2, w, h, radius)
          context.fill()
        }
        context.globalAlpha = alpha * (fromColor ? sweep : 1)
        context.fillStyle = color
        context.beginPath()
        context.roundRect(cx - w / 2, cy - h / 2, w, h, radius)
        context.fill()
      }
      context.globalAlpha = 1

      if (animating) {
        state.frame = requestAnimationFrame(draw)
      } else {
        state.fromTone = null
        state.previousCells = null
      }
    }

    cancelAnimationFrame(state.frame)
    state.frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(state.frame)
  }, [cells, tone, width, height, columns, rows, cellSize, gap, reduceMotion, themeVersion])

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={`Pieces: ${bitfield.haveCount.toLocaleString()} of ${bitfield.count.toLocaleString()}`}
      style={{ height }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height }} />
    </div>
  )
}

/** Bumps when the theme class on <html> changes, so canvas colors can follow. */
function useThemeVersion() {
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const observer = new MutationObserver(() => setVersion((v) => v + 1))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return version
}

/** Eased (cubic out) 0…1 progress of a staggered animation. */
function progress(now: number, start: number, delay: number, duration: number): number {
  const t = (now - start - delay) / duration
  const clamped = Math.min(Math.max(t, 0), 1)
  return 1 - (1 - clamped) ** 3
}
