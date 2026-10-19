import {
  type PointerEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { usePrefersReducedMotion } from '@/hooks/use-media-query'
import { formatSpeed } from '@/lib/format'
import { useSession } from '@/lib/queries'
import { downsample, monotonePath, nearestSample, niceMax, type SpeedSample, segments } from '@/lib/speed-history'
import { useTransmission } from '@/lib/transmission'
import { cn } from '@/lib/utils'

/** Samples from the shared rate history within the last `windowMs`, updated on every poll. */
export function useSpeedSamples(windowMs: number) {
  const { history } = useTransmission()
  const version = useSyncExternalStore(history.subscribe, history.getVersion)
  // biome-ignore lint/correctness/useExhaustiveDependencies: `version` changes whenever the history does
  return useMemo(() => {
    const latest = history.latest()
    const end = latest?.time ?? Date.now()
    return { samples: history.since(end - windowMs), end }
  }, [history, version, windowMs])
}

function useElementWidth<T extends Element>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry!.contentRect.width)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

/** "4.2 MB/s" → ["4.2", "MB/s"], for big figures with a smaller unit. */
export function splitSpeed(bytesPerSecond: number): [string, string] {
  const text = formatSpeed(bytesPerSecond)
  const space = text.lastIndexOf(' ')
  return [text.slice(0, space), text.slice(space + 1)]
}

/** Upper bound on the slide and rescale animations, so a slow poll still settles quickly. */
const SLIDE_MS = 1000
const RESCALE_MS = 400

/** Eases towards `target` whenever it changes; jumps straight there when motion is reduced. */
function useEasedNumber(target: number, reducedMotion: boolean) {
  const [value, setValue] = useState(target)
  const current = useRef(target)
  useEffect(() => {
    const from = current.current
    if (reducedMotion || from === target) {
      current.current = target
      setValue(target)
      return
    }
    const begin = performance.now()
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - begin) / RESCALE_MS)
      current.current = from + (target - from) * (1 - (1 - t) ** 3)
      setValue(current.current)
      if (t < 1) frame = requestAnimationFrame(step)
    })
    return () => cancelAnimationFrame(frame)
  }, [target, reducedMotion])
  return value
}

const SERIES = [
  { key: 'down', className: 'text-status-downloading' },
  { key: 'up', className: 'text-status-seeding' },
] as const

export interface SpeedChartProps {
  windowMs: number
  /** Chart height in px; the width follows the container. */
  height: number
  /** Hover/tap reads out the rate at a point in time. */
  interactive?: boolean
  /** Labelled horizontal gridlines (for the larger chart). */
  grid?: boolean
  /** Called with the sample under the pointer, or null when the pointer leaves. */
  onHover?: (sample: SpeedSample | null) => void
  className?: string
}

/**
 * Two-series (↓/↑) area chart over the shared rate history, drawn as plain SVG. Only this
 * component re-renders when a sample arrives.
 */
export function SpeedChart({ windowMs, height, interactive, grid, onHover, className }: SpeedChartProps) {
  const id = useId()
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const { samples, end } = useSpeedSamples(windowMs)
  const { data: session } = useSession()
  const [hovered, setHovered] = useState<SpeedSample | null>(null)

  const start = end - windowMs
  // A run breaks where samples are further apart than a few polls (tab hidden, interval changed).
  const maxSpacing = 15_000

  const reducedMotion = usePrefersReducedMotion()

  const scale = useMemo(() => {
    const visible = samples.filter((s) => !Number.isNaN(s.down))
    const peak = visible.reduce((max, s) => Math.max(max, s.down, s.up), 0)
    // Alt-speed limits are KB/s on the wire. Only drawn when on, and only stretch the scale a little.
    const limits =
      session?.['alt-speed-enabled'] === true
        ? SERIES.map((series) => ({ ...series, value: session[`alt-speed-${series.key}`] * 1000 }))
        : []
    const max = niceMax(Math.max(peak, ...limits.map((l) => l.value).filter((v) => v <= peak * 1.5)))
    return { visible, limits, max }
  }, [samples, session])
  // The y-axis eases to a new scale instead of jumping; labels show the target scale.
  const max = useEasedNumber(scale.max, reducedMotion)

  const chart = useMemo(() => {
    const { visible, limits } = scale
    const plotTop = grid ? 6 : 2
    const x = (time: number) => ((time - start) / windowMs) * width
    const y = (rate: number) => height - (Math.min(rate, max) / max) * (height - plotTop)
    const runs = segments(samples, maxSpacing).map((run) => downsample(run, start, end, Math.max(1, width / 2)))

    const paths = SERIES.map(({ key }) =>
      runs.map((run) => {
        const points = run.map((s) => [x(s.time), y(s[key])] as const)
        const line = monotonePath(points)
        const first = points[0]!
        const last = points[points.length - 1]!
        const area = `${line}L${last[0]},${height}L${first[0]},${height}Z`
        return { line, area }
      }),
    )
    return { visible, x, y, paths, limits: limits.filter((l) => l.value <= scale.max) }
  }, [scale, samples, max, grid, start, end, windowMs, width, height])

  // Each new sample slides the plot left by the time it covers, rather than redrawing in place.
  const slideRef = useRef<SVGGElement>(null)
  const previousEnd = useRef(end)
  useLayoutEffect(() => {
    const elapsed = end - previousEnd.current
    previousEnd.current = end
    const element = slideRef.current
    if (!element || reducedMotion || width === 0 || elapsed <= 0 || elapsed > maxSpacing) return
    element.animate([{ transform: `translateX(${(elapsed / windowMs) * width}px)` }, { transform: 'none' }], {
      duration: Math.min(elapsed, SLIDE_MS),
      easing: 'ease-out',
    })
  }, [end, reducedMotion, width, windowMs])

  const handlePointer = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      if (!interactive || chart.visible.length === 0) return
      const bounds = event.currentTarget.getBoundingClientRect()
      const time = start + ((event.clientX - bounds.left) / bounds.width) * windowMs
      const sample = chart.visible[nearestSample(chart.visible, time)] ?? null
      setHovered(sample)
      onHover?.(sample)
    },
    [interactive, chart.visible, start, windowMs, onHover],
  )
  const clearHover = useCallback(() => {
    setHovered(null)
    onHover?.(null)
  }, [onHover])

  const latest = chart.visible[chart.visible.length - 1]
  const marker = hovered ?? (latest && end - latest.time < maxSpacing ? latest : undefined)

  return (
    <div ref={ref} className={cn('relative', className)} style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className={cn('block overflow-visible', interactive && 'touch-pan-y')}
          aria-hidden
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          onPointerLeave={clearHover}
        >
          <defs>
            {SERIES.map(({ key, className: color }) => (
              <linearGradient key={key} id={`${id}-${key}`} x1="0" x2="0" y1="0" y2="1" className={color}>
                <stop offset="0%" stopColor="currentColor" stopOpacity={key === 'down' ? 0.35 : 0.3} />
                <stop offset="100%" stopColor="currentColor" stopOpacity={0.02} />
              </linearGradient>
            ))}
            {/* Room for the marker dots at the edges; content sliding in from the right stays hidden. */}
            <clipPath id={`${id}-plot`}>
              <rect x={-3} y={-3} width={width + 6} height={height + 6} />
            </clipPath>
          </defs>

          {grid &&
            [0.5, 1].map((f) => (
              <g key={f} className="text-muted-foreground">
                <line
                  x1={0}
                  x2={width}
                  y1={chart.y(max * f)}
                  y2={chart.y(max * f)}
                  stroke="currentColor"
                  strokeOpacity={0.15}
                  strokeDasharray="2 4"
                />
                <text
                  x={width - 4}
                  y={chart.y(max * f) + 12}
                  textAnchor="end"
                  fill="currentColor"
                  className="text-[10px] tabular-nums"
                >
                  {formatSpeed(scale.max * f)}
                </text>
              </g>
            ))}
          <line x1={0} x2={width} y1={height - 0.5} y2={height - 0.5} className="stroke-border" />

          <g clipPath={`url(#${id}-plot)`}>
            <g ref={slideRef}>
              {SERIES.map(({ key, className: color }, i) => (
                <g key={key} className={color}>
                  {chart.paths[i]!.map(({ area, line }) => (
                    <g key={line}>
                      <path d={area} fill={`url(#${id}-${key})`} />
                      <path
                        d={line}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    </g>
                  ))}
                </g>
              ))}

              {marker && (
                <g>
                  {hovered && (
                    <line
                      x1={chart.x(marker.time)}
                      x2={chart.x(marker.time)}
                      y1={0}
                      y2={height}
                      className="stroke-foreground/30"
                    />
                  )}
                  {SERIES.map(({ key, className: color }) => (
                    <g key={key} className={color}>
                      <circle cx={chart.x(marker.time)} cy={chart.y(marker[key])} r={2.5} fill="currentColor" />
                    </g>
                  ))}
                </g>
              )}
            </g>

            {chart.limits.map((limit) => (
              <line
                key={limit.key}
                x1={0}
                x2={width}
                y1={chart.y(limit.value)}
                y2={chart.y(limit.value)}
                stroke="currentColor"
                strokeOpacity={0.45}
                strokeDasharray="4 3"
                className={limit.className}
              >
                <title>Alternative speed limit</title>
              </line>
            ))}
          </g>
        </svg>
      )}
    </div>
  )
}
