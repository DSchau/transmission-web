import { memo, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { usePrefersReducedMotion } from '@/hooks/use-media-query'
import {
  downsample,
  nearestSample,
  niceCeil,
  type RateSample,
  smoothPath,
  splitRuns,
  visibleSpan,
} from '@/lib/rate-history'
import { useTransmission } from '@/lib/transmission'
import { cn } from '@/lib/utils'

/** The daemon session's transfer history for the current connection; re-renders only the components that use it. */
export function useRateHistory(): readonly RateSample[] {
  const { history } = useTransmission()
  return useSyncExternalStore(history.subscribe, history.samples, history.samples)
}

/** The scale never drops below this, so an idle swarm's trickle doesn't fill the chart. */
const MIN_SCALE = 100_000
/** Aim for one point per this many pixels; more is invisible and costs path length. */
const PX_PER_POINT = 3
/** New data slides in this quickly, so the line keeps up with the numbers above it. */
const SLIDE_MS = 250

export interface SpeedLimits {
  down: number
  up: number
}

interface Props {
  samples: readonly RateSample[]
  /** How much history to show, in ms (ending at the latest sample); less while there isn't that much yet. */
  range: number
  /** Faint reference lines, e.g. the alternative speed limits (bytes/s). */
  limits?: SpeedLimits | null
  /** Horizontal gridlines with speed labels (for the larger graph). */
  axis?: boolean
  /** Called with the sample under the pointer (or finger), and `null` when it leaves. */
  onScrub?: (sample: RateSample | null) => void
  /** Makes the chart a button (click, tap, Enter). */
  onActivate?: () => void
  label: string
  className?: string
}

/**
 * Download and upload rates as two smooth filled areas (hand-rolled SVG, no chart library).
 * Stretches no tab was polling are drawn flat and faint, at their exact average.
 *
 * Each poll, the plot slides left by the time that passed, briefly and on the compositor (a
 * transformed HTML layer, so no SVG repaint per frame) — unless the user prefers reduced motion.
 */
export const SpeedChart = memo(function SpeedChart({
  samples,
  range,
  limits,
  axis = false,
  onScrub,
  onActivate,
  label,
  className,
}: Props) {
  const id = useId()
  const reducedMotion = usePrefersReducedMotion()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const plotRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [hoverX, setHoverX] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const { width, height } = size
  const top = axis ? 18 : 3
  const bottom = 1.5
  const plotHeight = Math.max(0, height - top - bottom)
  const end = samples[samples.length - 1]?.time ?? 0
  const span = visibleSpan(samples, range)
  const start = end - span

  const chart = useMemo(() => {
    if (width === 0 || samples.length === 0) return null
    // Keep one sample left of the window so the line runs off the edge instead of starting in midair.
    let from = samples.findIndex((s) => s.time >= start)
    if (from === -1) from = samples.length
    const visible = samples.slice(Math.max(0, from - 1))
    const bucketMs = (span / width) * PX_PER_POINT
    const points = visible.length > width / PX_PER_POINT ? downsample(visible, bucketMs) : visible

    let peak = 0
    for (const s of points) peak = Math.max(peak, s.down, s.up)
    if (limits) peak = Math.max(peak, limits.down, limits.up)
    const max = niceCeil(Math.max(peak * 1.12, MIN_SCALE))
    const x = (time: number) => ((time - start) / span) * width
    const y = (rate: number) => top + (1 - rate / max) * plotHeight
    const base = top + plotHeight
    const fmt = (v: number) => Math.round(v * 100) / 100

    const runs = splitRuns(points).map((run) => {
      const first = run[0]!
      const last = run[run.length - 1]!
      const x0 = fmt(x(first.from))
      const x1 = fmt(x(last.time))
      const close = `L${x1},${fmt(base)}L${x0},${fmt(base)}Z`
      if (!first.live) {
        const step = (key: 'down' | 'up') => `M${x0},${fmt(y(first[key]))}H${x1}`
        const down = step('down')
        const up = step('up')
        return { key: first.time, live: false, down, up, downArea: down + close, upArea: up + close }
      }
      // Start where the run's first stretch begins, so it meets an unpolled stretch before it.
      const line = (key: 'down' | 'up') =>
        smoothPath([{ x: x(first.from), y: y(first[key]) }, ...run.map((s) => ({ x: x(s.time), y: y(s[key]) }))])
      const down = line('down')
      const up = line('up')
      return { key: first.time, live: true, down, up, downArea: down + close, upArea: up + close }
    })
    return { points, runs, max, x, y, base }
  }, [samples, start, span, width, plotHeight, top, limits])

  // Slide in by the time that passed since the last render (only while the span is unchanged).
  const previous = useRef<{ end: number; width: number; span: number } | null>(null)
  useLayoutEffect(() => {
    const plot = plotRef.current
    const last = previous.current
    previous.current = chart ? { end, width, span } : null
    if (!plot || !chart || !last || reducedMotion || last.width !== width || last.span !== span) return
    const dx = ((end - last.end) / span) * width
    if (dx <= 0 || dx > width / 4) return
    plot.animate([{ transform: `translateX(${dx}px)` }, { transform: 'translateX(0)' }], {
      duration: SLIDE_MS,
      easing: 'ease-out',
    })
  }, [chart, end, span, width, reducedMotion])

  const hovered = useMemo(() => {
    if (hoverX == null || !chart) return null
    return nearestSample(chart.points, start + (hoverX / width) * span) ?? null
  }, [hoverX, chart, start, width, span])

  const lastScrub = useRef<number | null>(null)
  useLayoutEffect(() => {
    const time = hovered?.time ?? null
    if (time === lastScrub.current) return
    lastScrub.current = time
    onScrub?.(hovered)
  }, [hovered, onScrub])

  // Mouse: hover scrubs, click activates. Touch: drag scrubs, a tap activates.
  const press = useRef<{ x: number; moved: boolean } | null>(null)
  const localX = (clientX: number) => {
    const rect = wrapperRef.current?.getBoundingClientRect()
    return rect ? Math.min(Math.max(clientX - rect.left, 0), rect.width) : null
  }
  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') return
      press.current = { x: e.clientX, moved: false }
      e.currentTarget.setPointerCapture(e.pointerId)
      setHoverX(localX(e.clientX))
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (e.pointerType !== 'mouse' && !press.current) return
      if (press.current && Math.abs(e.clientX - press.current.x) > 6) press.current.moved = true
      setHoverX(localX(e.clientX))
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') return
      setHoverX(null)
    },
    onPointerCancel: () => {
      press.current = null
      setHoverX(null)
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') setHoverX(null)
    },
    onClick: () => {
      const dragged = press.current?.moved
      press.current = null
      if (!dragged) onActivate?.()
    },
  }

  const down = `${id}-down`
  const up = `${id}-up`
  const ticks = axis && chart ? [chart.max / 2, chart.max] : []

  const gradients = (
    <defs>
      {[
        [down, 'var(--status-downloading)'],
        [up, 'var(--status-seeding)'],
      ].map(([gradient, color]) => (
        <linearGradient key={gradient} id={gradient} gradientUnits="userSpaceOnUse" x1="0" y1={top} x2="0" y2={height}>
          <stop offset="0" stopColor={color} stopOpacity={0.42} />
          <stop offset="0.6" stopColor={color} stopOpacity={0.12} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </linearGradient>
      ))}
    </defs>
  )

  const plot = (
    <div ref={plotRef} className="absolute inset-0">
      <svg width={width} height={height} className="absolute inset-0 overflow-visible" aria-hidden>
        {gradients}
        {chart?.runs.map((run) => (
          <g key={run.key} opacity={run.live ? 1 : 0.55}>
            <path d={run.downArea} fill={`url(#${down})`} />
            <path d={run.upArea} fill={`url(#${up})`} />
            {(
              [
                [run.down, 'var(--status-downloading)'],
                [run.up, 'var(--status-seeding)'],
              ] as const
            ).map(([d, color]) => (
              <path
                key={color}
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={run.live ? 1.75 : 1.25}
                strokeDasharray={run.live ? undefined : '3 3'}
                strokeLinejoin="round"
              />
            ))}
          </g>
        ))}
      </svg>
    </div>
  )

  const markerX = hovered && chart ? (hovered.live ? chart.x(hovered.time) : (hoverX ?? 0)) : 0
  const overlay = (
    <svg width={width} height={height} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {chart && (
        <>
          {ticks.map((tick) => (
            <line
              key={tick}
              x1={0}
              x2={width}
              y1={Math.round(chart.y(tick)) + 0.5}
              y2={Math.round(chart.y(tick)) + 0.5}
              className="stroke-border"
              strokeDasharray="2 3"
            />
          ))}
          {axis && <line x1={0} x2={width} y1={chart.base + 0.5} y2={chart.base + 0.5} className="stroke-border" />}
          {limits &&
            (
              [
                [limits.down, 'var(--status-downloading)'],
                [limits.up, 'var(--status-seeding)'],
              ] as const
            ).map(([limit, color]) =>
              limit > 0 ? (
                <line
                  key={color}
                  x1={0}
                  x2={width}
                  y1={chart.y(limit)}
                  y2={chart.y(limit)}
                  stroke={color}
                  strokeOpacity={0.55}
                  strokeDasharray="4 4"
                />
              ) : null,
            )}
          {hovered && (
            <g>
              <line x1={markerX} x2={markerX} y1={top} y2={chart.base} className="stroke-foreground/25" />
              {(
                [
                  [hovered.down, 'var(--status-downloading)'],
                  [hovered.up, 'var(--status-seeding)'],
                ] as const
              ).map(([rate, color]) => (
                <circle
                  key={color}
                  cx={markerX}
                  cy={chart.y(rate)}
                  r={3.5}
                  fill={color}
                  className="stroke-background"
                  strokeWidth={2}
                />
              ))}
            </g>
          )}
        </>
      )}
    </svg>
  )

  const labels = axis && chart && (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {ticks.map((tick) => (
        <span
          key={tick}
          className="absolute right-0 -translate-y-full pb-0.5 text-[10px] text-muted-foreground tabular-nums"
          style={{ top: chart.y(tick) }}
        >
          {formatScale(tick)}
        </span>
      ))}
    </div>
  )

  const shared = {
    ref: wrapperRef,
    ...handlers,
    className: cn('relative block w-full touch-pan-y select-none overflow-hidden', className),
  }

  return onActivate ? (
    <button
      type="button"
      {...(shared as object)}
      ref={wrapperRef as unknown as React.Ref<HTMLButtonElement>}
      aria-label={label}
      className={cn(
        shared.className,
        'cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      {plot}
      {overlay}
      {labels}
    </button>
  ) : (
    <div {...shared} role="img" aria-label={label}>
      {plot}
      {overlay}
      {labels}
    </div>
  )
})

/** Axis labels: "5 MB/s", "500 kB/s" — scale steps are round numbers, so no decimals needed. */
function formatScale(rate: number): string {
  if (rate >= 1_000_000_000) return `${rate / 1_000_000_000} GB/s`
  if (rate >= 1_000_000) return `${rate / 1_000_000} MB/s`
  return `${rate / 1000} kB/s`
}
