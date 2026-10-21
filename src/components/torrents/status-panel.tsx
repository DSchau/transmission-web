import { ArrowDown, ArrowUp } from 'lucide-react'
import { useState } from 'react'
import { SpeedChart, useRateHistory } from '@/components/speed-chart'
import { formatBytes, formatNumber, formatSpeed } from '@/lib/format'
import { useConnectionState, useSession } from '@/lib/queries'
import type { RateSample } from '@/lib/rate-history'
import type { Torrent } from '@/lib/rpc/types'
import { totalSize } from '@/lib/torrent'
import { cn } from '@/lib/utils'
import { formatSampleTime, INLINE_RANGE, openStatistics, useAltSpeedLimits } from './activity'
import { useTorrentsView } from './torrents-view'

/**
 * Slim status strip below the header (all layouts), like the status bar in the native clients:
 * counts, total transfer rates and free space. (Alternative speed limits toggle stays in the
 * overflow menu — Settings > Alternative Speeds.)
 *
 * With `chart` (phone, tablet, and desktop with the sidebar hidden), a slim sparkline of the last
 * few minutes runs underneath: drag along it to read past rates, tap it to open Statistics.
 * `chartCollapsed` folds the sparkline away (the phone list does this while scrolled).
 */
export function StatusPanel({
  className,
  chart = false,
  chartCollapsed = false,
}: {
  className?: string
  chart?: boolean
  chartCollapsed?: boolean
}) {
  const { torrents, visible, selected } = useTorrentsView()
  const state = useConnectionState()
  const { data: session } = useSession()
  const samples = useRateHistory()
  const limits = useAltSpeedLimits()
  const [scrub, setScrub] = useState<RateSample | null>(null)

  // When sign-in or a first connection is needed, the list's empty states carry the message
  // instead. While connecting, the strip keeps its place so the page doesn't shift once it loads.
  if (state.status === 'unauthorized' || state.status === 'failed') return null

  const connecting = state.status === 'connecting'
  const offline = state.status === 'offline'
  const freeSpace = session?.['download-dir-free-space'] ?? 0
  const rates = totalRates(torrents)

  return (
    <footer className={cn('shrink-0 border-b text-muted-foreground text-xs tabular-nums', className)}>
      <div className="flex min-h-8 flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5">
        <span className={cn('min-w-0 truncate', scrub && 'text-foreground')}>
          {scrub
            ? formatSampleTime(scrub)
            : offline
              ? 'Offline'
              : connecting
                ? 'Connecting…'
                : countText(visible.length, torrents.length)}
          {!scrub && selected.length > 1 && ` · ${selected.length} selected (${formatBytes(totalSize(selected))})`}
        </span>
        <div className="min-w-0 flex-1" />
        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
          <ArrowDown className="size-3 text-status-downloading" aria-label="Download" />
          {connecting ? '–' : formatSpeed(scrub ? scrub.down : rates.down)}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
          <ArrowUp className="size-3 text-status-seeding" aria-label="Upload" />
          {connecting ? '–' : formatSpeed(scrub ? scrub.up : rates.up)}
        </span>
        {freeSpace > 0 && (
          <span className="hidden md:inline" title="Free space in the download directory">
            {formatBytes(freeSpace)} free
          </span>
        )}
      </div>
      {chart && (
        // Animating grid rows 1fr → 0fr folds the chart away without measuring its height.
        <div
          inert={chartCollapsed}
          className={cn(
            'grid transition-[grid-template-rows] duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
            chartCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
          )}
        >
          {/* The chart fades and lifts a little faster than the row closes, so it's gone before it gets clipped. */}
          <div
            className={cn(
              'min-h-0 overflow-hidden transition-[opacity,translate,filter] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
              chartCollapsed && '-translate-y-2 opacity-0 blur-[2px]',
            )}
          >
            <SpeedChart
              samples={samples}
              range={INLINE_RANGE}
              limits={limits}
              onScrub={setScrub}
              onActivate={openStatistics}
              label="Transfer speeds over the last 5 minutes. Open Statistics."
              className="h-8"
            />
          </div>
        </div>
      )}
    </footer>
  )
}

/** "92 of 1,633 torrents", or "1,633 torrents" when nothing is filtered out. */
function countText(shown: number, total: number) {
  const noun = shown === 1 ? 'torrent' : 'torrents'
  return shown === total ? `${formatNumber(total)} ${noun}` : `${formatNumber(shown)} of ${formatNumber(total)} ${noun}`
}

function totalRates(torrents: Torrent[]) {
  let down = 0
  let up = 0
  for (const t of torrents) {
    down += t.rateDownload
    up += t.rateUpload
  }
  return { down, up }
}
