import { ArrowDown, ArrowUp } from 'lucide-react'
import { useState } from 'react'
import { SpeedChart, useRateHistory } from '@/components/speed-chart'
import { formatBytes, formatSpeed } from '@/lib/format'
import { useConnectionState, useSession } from '@/lib/queries'
import type { RateSample } from '@/lib/rate-history'
import { cn } from '@/lib/utils'
import { formatSampleTime, INLINE_RANGE, openStatistics, useAltSpeedLimits } from './activity'
import { useTorrentsView } from './torrents-view'
import { useTransferSummary } from './use-summary'

/**
 * Slim status strip below the header (all layouts), like the status bar in the native clients:
 * counts, total transfer rates and free space. (Alternative speed limits toggle stays in the
 * overflow menu — Settings > Alternative Speeds.)
 *
 * With `chart` (phone, tablet, and desktop with the sidebar hidden), a slim sparkline of the last
 * few minutes runs underneath: drag along it to read past rates, tap it to open Statistics.
 */
export function StatusPanel({ className, chart = false }: { className?: string; chart?: boolean }) {
  const summary = useTransferSummary()
  const { selected } = useTorrentsView()
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
  const selectedSize = selected.reduce((sum, t) => sum + t.sizeWhenDone, 0)

  return (
    <footer className={cn('shrink-0 border-b text-muted-foreground text-xs tabular-nums', className)}>
      <div className="flex min-h-8 flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5">
        <span className={cn('min-w-0 truncate', scrub && 'text-foreground')}>
          {scrub ? formatSampleTime(scrub) : offline ? 'Offline' : connecting ? 'Connecting…' : summary.countText}
          {!scrub && selected.length > 1 && ` · ${selected.length} selected (${formatBytes(selectedSize)})`}
        </span>
        <div className="min-w-0 flex-1" />
        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
          <ArrowDown className="size-3 text-status-downloading" aria-label="Download" />
          {connecting ? '–' : formatSpeed(scrub ? scrub.down : summary.exactDown)}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
          <ArrowUp className="size-3 text-status-seeding" aria-label="Upload" />
          {connecting ? '–' : formatSpeed(scrub ? scrub.up : summary.exactUp)}
        </span>
        {freeSpace > 0 && (
          <span className="hidden md:inline" title="Free space in the download directory">
            {formatBytes(freeSpace)} free
          </span>
        )}
      </div>
      {chart && (
        <SpeedChart
          samples={samples}
          range={INLINE_RANGE}
          limits={limits}
          onScrub={setScrub}
          onActivate={openStatistics}
          label="Transfer speeds over the last 5 minutes. Open Statistics."
          className="h-8"
        />
      )}
    </footer>
  )
}
