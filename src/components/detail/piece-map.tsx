import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '@/hooks/use-media-query'
import { type PieceBitfield, pieceGridLayout } from '@/lib/pieces'
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
 * sequential download reads like a progress bar but gaps stay visible. Small torrents get one
 * cell per piece, stretched to fill the box; larger ones shade each cell by how much of its
 * range of pieces is done.
 *
 * Motion is deliberately quiet (and skipped with reduced motion): the map renders instantly,
 * newly completed pieces fade in, and a state change crossfades the color. Nothing scales or
 * staggers, so frequent refreshes don't make the grid shimmer.
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

  const grid = pieceGridLayout(bitfield.count, width, height, rows, cellSize, gap)
  const { columns, cellWidth, cellHeight } = grid
  const gridRows = grid.rows
  const cells = useMemo(() => {
    const count = bitfield.count
    if (grid.perCell === 1) return Array.from({ length: count }, (_, piece) => (bitfield.has(piece) ? 1 : 0))
    const total = columns * gridRows
    return Array.from({ length: total }, (_, cell) => {
      const lower = Math.floor((cell * count) / total)
      const upper = Math.max(lower + 1, Math.floor(((cell + 1) * count) / total))
      return bitfield.fraction(lower, Math.min(upper, count))
    })
  }, [bitfield, columns, gridRows, grid.perCell])

  // Animation bookkeeping lives in a ref: it changes every frame and shouldn't re-render.
  const anim = useRef({
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
      // Only animate real changes to the same grid, never the first paint or a resize.
      if (
        state.lastCells &&
        state.lastCells.length === cells.length &&
        state.lastCells.some((v, i) => v !== cells[i])
      ) {
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

    const radius = Math.min(cellWidth, cellHeight, cellSize) * 0.3

    const draw = (time: number) => {
      const styles = getComputedStyle(canvas)
      const color = styles.getPropertyValue(`--status-${tone}`).trim() || 'gray'
      const fromColor = state.fromTone ? styles.getPropertyValue(`--status-${state.fromTone}`).trim() : null
      const blend = fromColor ? progress(time, state.toneStart, 200) : 1
      const fillProgress = state.previousCells ? progress(time, state.fillStart, 250) : 1

      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      context.clearRect(0, 0, width, height)

      for (let index = 0; index < cells.length; index++) {
        const column = Math.floor(index / gridRows)
        const row = index % gridRows
        const target = cells[index] ?? 0
        const previous = state.previousCells?.[index] ?? target
        const fill = previous + (target - previous) * fillProgress
        const alpha = 0.14 + 0.86 * fill
        const x = column * (cellWidth + gap)
        const y = row * (cellHeight + gap)

        if (fromColor && blend < 1) {
          context.globalAlpha = alpha * (1 - blend)
          context.fillStyle = fromColor
          context.beginPath()
          context.roundRect(x, y, cellWidth, cellHeight, radius)
          context.fill()
        }
        context.globalAlpha = alpha * blend
        context.fillStyle = color
        context.beginPath()
        context.roundRect(x, y, cellWidth, cellHeight, radius)
        context.fill()
      }
      context.globalAlpha = 1

      if (blend < 1 || fillProgress < 1) {
        state.frame = requestAnimationFrame(draw)
      } else {
        state.fromTone = null
        state.previousCells = null
      }
    }

    cancelAnimationFrame(state.frame)
    state.frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(state.frame)
  }, [cells, tone, width, height, columns, gridRows, cellWidth, cellHeight, cellSize, gap, reduceMotion, themeVersion])

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

/** Bumps when the theme on <html> changes, so canvas colors can follow. */
function useThemeVersion() {
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const observer = new MutationObserver(() => setVersion((v) => v + 1))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] })
    return () => observer.disconnect()
  }, [])
  return version
}

/** Eased (cubic out) 0…1 progress of an animation. */
function progress(now: number, start: number, duration: number): number {
  const t = (now - start) / duration
  const clamped = Math.min(Math.max(t, 0), 1)
  return 1 - (1 - clamped) ** 3
}
