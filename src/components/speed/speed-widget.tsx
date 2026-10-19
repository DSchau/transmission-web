import { Link } from '@tanstack/react-router'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { memo, useState } from 'react'
import { formatSpeed } from '@/lib/format'
import type { SpeedSample } from '@/lib/speed-history'
import { cn } from '@/lib/utils'
import { SpeedChart, splitSpeed, useSpeedSamples } from './speed-chart'

const FIVE_MINUTES = 5 * 60_000

export function SpeedFigure({
  rate,
  direction,
  size = 'lg',
}: {
  rate: number | undefined
  direction: 'down' | 'up'
  size?: 'lg' | 'xl'
}) {
  const Icon = direction === 'down' ? ArrowDown : ArrowUp
  const [value, unit] = rate == null || Number.isNaN(rate) ? ['—', ''] : splitSpeed(rate)
  return (
    <div
      className={cn(
        'flex min-w-0 items-baseline gap-1 tabular-nums',
        direction === 'down' ? 'text-status-downloading' : 'text-status-seeding',
      )}
    >
      <Icon className={cn('shrink-0 self-center', size === 'xl' ? 'size-5' : 'size-4')} aria-hidden />
      <span className="sr-only">
        {`${direction === 'down' ? 'Download' : 'Upload'} ${rate == null || Number.isNaN(rate) ? 'unknown' : formatSpeed(rate)}`}
      </span>
      <span
        className={cn('font-semibold leading-none tracking-tight', size === 'xl' ? 'text-3xl' : 'text-xl')}
        aria-hidden
      >
        {value}
      </span>
      <span className="truncate text-muted-foreground text-xs" aria-hidden>
        {unit}
      </span>
    </div>
  )
}

export function secondsAgo(time: number, now: number) {
  const seconds = Math.max(0, Math.round((now - time) / 1000))
  if (seconds < 2) return 'now'
  if (seconds < 60) return `${seconds}s ago`
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s ago`
}

/**
 * Large ↓/↑ figures over the last five minutes of transfer, at the top of the desktop sidebar.
 * No props, and memoized, so the sidebar re-rendering on each poll doesn't touch it — it updates
 * from the rate history alone.
 */
export const SpeedWidget = memo(function SpeedWidget() {
  const { samples, end } = useSpeedSamples(FIVE_MINUTES)
  const [hovered, setHovered] = useState<SpeedSample | null>(null)
  const latest = samples[samples.length - 1]
  const shown = hovered ?? latest

  return (
    <section aria-label="Transfer speed" className="border-b">
      <Link
        to="/statistics"
        className="block px-4 pt-3 outline-none transition-colors hover:bg-sidebar-accent/40 focus-visible:bg-sidebar-accent/60"
        aria-label="Transfer statistics"
      >
        <div className="flex items-end justify-between gap-2">
          <div className="grid min-w-0 gap-1.5">
            <SpeedFigure rate={shown?.down} direction="down" />
            <SpeedFigure rate={shown?.up} direction="up" />
          </div>
          <span className="shrink-0 pb-0.5 text-[10px] text-muted-foreground uppercase tracking-wide">
            {hovered ? secondsAgo(hovered.time, end) : '5 min'}
          </span>
        </div>
        <SpeedChart windowMs={FIVE_MINUTES} height={56} interactive onHover={setHovered} className="-mx-4 mt-2" />
      </Link>
    </section>
  )
})

/** Slim, non-interactive sparkline for the status strip (phone, tablet, collapsed sidebar). */
export const SpeedSparkline = memo(function SpeedSparkline({ className }: { className?: string }) {
  return (
    <Link
      to="/statistics"
      aria-label="Transfer statistics"
      className={cn(
        'block w-16 shrink-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-24',
        className,
      )}
    >
      <SpeedChart windowMs={FIVE_MINUTES} height={18} />
    </Link>
  )
})
