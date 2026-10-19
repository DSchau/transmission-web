import { ArrowDown, ArrowUp, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SpeedChart, type SpeedLimits, useRateHistory } from '@/components/speed-chart'
import { formatClockTime, formatSpeed } from '@/lib/format'
import { useSession } from '@/lib/queries'
import { type RateSample, visibleSpan } from '@/lib/rate-history'
import { openDialog } from '@/lib/ui'
import { cn } from '@/lib/utils'

/** The inline charts show the last few minutes; the Statistics view can show the whole history. */
export const INLINE_RANGE = 5 * 60_000

export const openStatistics = () => openDialog({ type: 'statistics' })

/** The alternative ("turtle") speed limits in bytes/s while they're on, for the charts' reference lines. */
export function useAltSpeedLimits(): SpeedLimits | null {
  const { data: session } = useSession()
  const enabled = session?.['alt-speed-enabled'] ?? false
  const down = (session?.['alt-speed-down'] ?? 0) * 1000
  const up = (session?.['alt-speed-up'] ?? 0) * 1000
  return useMemo(() => (enabled ? { down, up } : null), [enabled, down, up])
}

/** "4.2 MB/s" → ["4.2", "MB/s"], so the number can be set large and the unit small. */
function splitSpeed(rate: number): [string, string] {
  const text = formatSpeed(rate)
  const space = text.lastIndexOf(' ')
  return [text.slice(0, space), text.slice(space + 1)]
}

export function RateFigure({
  direction,
  rate,
  size = 'md',
  className,
}: {
  direction: 'down' | 'up'
  rate: number
  size?: 'md' | 'lg'
  className?: string
}) {
  const [value, unit] = splitSpeed(rate)
  const Icon = direction === 'down' ? ArrowDown : ArrowUp
  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      <span className="flex items-center gap-1 font-medium text-[11px] text-muted-foreground">
        <Icon
          className={cn('size-3', direction === 'down' ? 'text-status-downloading' : 'text-status-seeding')}
          strokeWidth={2.5}
          aria-hidden
        />
        {direction === 'down' ? 'Download' : 'Upload'}
      </span>
      <span className="truncate whitespace-nowrap tabular-nums leading-tight">
        <span className={cn('font-semibold tracking-tight', size === 'lg' ? 'text-3xl' : 'text-xl')}>{value}</span>
        <span className="ml-1 text-muted-foreground text-xs">{unit}</span>
      </span>
    </div>
  )
}

/**
 * Desktop sidebar's live activity (like Flood's): current rates in large type over the last few
 * minutes of history. Hovering scrubs through it; clicking opens Statistics.
 */
export function SidebarActivity() {
  const samples = useRateHistory()
  const limits = useAltSpeedLimits()
  const [scrub, setScrub] = useState<RateSample | null>(null)
  const shown = scrub ?? samples[samples.length - 1]

  return (
    <section aria-label="Transfer activity" className="border-b">
      <div className="flex gap-3 px-4 pt-3">
        <RateFigure direction="down" rate={shown?.down ?? 0} className="flex-1" />
        <RateFigure direction="up" rate={shown?.up ?? 0} className="flex-1" />
      </div>
      <SpeedChart
        samples={samples}
        range={INLINE_RANGE}
        limits={limits}
        onScrub={setScrub}
        onActivate={openStatistics}
        label="Transfer speeds over the last 5 minutes. Open Statistics."
        className="mt-1 h-16"
      />
      <div className="flex h-7 items-center justify-between gap-2 px-4 text-[11px] text-muted-foreground tabular-nums">
        <span className="truncate">
          {scrub
            ? formatClockTime(scrub.time)
            : `Last ${Math.max(1, Math.round(visibleSpan(samples, INLINE_RANGE) / 60_000))} min`}
        </span>
        <button
          type="button"
          onClick={openStatistics}
          className="-mr-1 inline-flex shrink-0 items-center rounded px-1 transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          Statistics
          <ChevronRight className="size-3" aria-hidden />
        </button>
      </div>
    </section>
  )
}
