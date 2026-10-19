import { useSelector } from '@tanstack/react-store'
import { useState } from 'react'
import { ResponsiveDialog } from '@/components/responsive-dialog'
import { SpeedChart, useRateHistory } from '@/components/speed-chart'
import { RateFigure, useAltSpeedLimits } from '@/components/torrents/activity'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { connectionAtom, displayNameFor } from '@/lib/connection'
import { formatBytes, formatClockTime, formatDuration, formatNumber, formatRatio, transferRatio } from '@/lib/format'
import { useSessionStats } from '@/lib/queries'
import { formatSpanAgo, type RateSample, visibleSpan } from '@/lib/rate-history'
import type { TransferStats } from '@/lib/rpc/types'

const RANGES = [
  { label: '5m', ms: 5 * 60_000, name: '5 minutes' },
  { label: '15m', ms: 15 * 60_000, name: '15 minutes' },
  { label: '30m', ms: 30 * 60_000, name: '30 minutes' },
] as const

/**
 * Like the native clients' Statistics window: session and lifetime totals (`session-stats`, the
 * same numbers `transmission-remote -st` prints) under a larger, scrubbable speed history.
 */
export function StatisticsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const config = useSelector(connectionAtom)
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Statistics"
      description={displayNameFor(config)}
      className="sm:max-w-2xl"
    >
      {/* Mounted only while open, so `session-stats` is only polled then. */}
      <StatisticsContent />
    </ResponsiveDialog>
  )
}

function StatisticsContent() {
  const samples = useRateHistory()
  const limits = useAltSpeedLimits()
  const [range, setRange] = useState<(typeof RANGES)[number]>(RANGES[0])
  const [scrub, setScrub] = useState<RateSample | null>(null)
  const { data: stats } = useSessionStats()
  const shown = scrub ?? samples[samples.length - 1]

  return (
    <div className="flex min-w-0 flex-col gap-6 pb-4 sm:pb-0">
      <section aria-label="Speed history" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <RateFigure direction="down" rate={shown?.down ?? 0} size="lg" />
          <RateFigure direction="up" rate={shown?.up ?? 0} size="lg" />
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            value={range.label}
            onValueChange={(value) => {
              const next = RANGES.find((r) => r.label === value)
              if (next) setRange(next)
            }}
            aria-label="Time range"
            className="order-first mb-1 w-full sm:order-none sm:ml-auto sm:w-auto"
          >
            {RANGES.map((r) => (
              <ToggleGroupItem key={r.label} value={r.label} className="flex-1 px-2.5 tabular-nums sm:flex-none">
                {r.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex flex-col gap-1.5">
          <SpeedChart
            samples={samples}
            range={range.ms}
            limits={limits}
            axis
            onScrub={setScrub}
            label={`Transfer speeds over the last ${range.name}`}
            className="h-44 sm:h-56"
          />
          <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground tabular-nums">
            <span className="shrink-0">{formatSpanAgo(visibleSpan(samples, range.ms))}</span>
            <span className="truncate text-center">
              {scrub ? (
                <span className="text-foreground">{formatClockTime(scrub.time)}</span>
              ) : limits ? (
                'Dashed lines: alternative speed limits'
              ) : null}
            </span>
            <span className="shrink-0">Now</span>
          </div>
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <TotalsCard title="This Session" stats={stats?.['current-stats']} />
        <TotalsCard title="All Time" stats={stats?.['cumulative-stats']} lifetime />
      </div>
    </div>
  )
}

function TotalsCard({ title, stats, lifetime = false }: { title: string; stats?: TransferStats; lifetime?: boolean }) {
  const rows: [string, string | undefined][] = [
    ['Downloaded', stats && formatBytes(stats.downloadedBytes)],
    ['Uploaded', stats && formatBytes(stats.uploadedBytes)],
    ['Ratio', stats && formatRatio(transferRatio(stats.uploadedBytes, stats.downloadedBytes))],
    ['Time Active', stats && formatDuration(stats.secondsActive)],
    ['Files Added', stats && formatNumber(stats.filesAdded)],
  ]
  if (lifetime) rows.push(['Sessions', stats && formatNumber(stats.sessionCount)])

  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">{title}</h3>
      <dl className="divide-y overflow-hidden rounded-xl border bg-card text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex min-h-10 items-center justify-between gap-4 px-4 py-2">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium tabular-nums">{value ?? <Skeleton className="h-4 w-16" />}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
