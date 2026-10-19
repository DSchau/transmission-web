import { useState } from 'react'
import { PageShell, SettingsRow, SettingsSection } from '@/components/settings/page-shell'
import { SpeedChart, useSpeedSamples } from '@/components/speed/speed-chart'
import { SpeedFigure, secondsAgo } from '@/components/speed/speed-widget'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatBytes, formatDuration, formatNumber, formatRatio, formatSpeed } from '@/lib/format'
import { useSessionStats } from '@/lib/queries'
import type { TransferStats } from '@/lib/rpc/types'
import { HISTORY_WINDOW_MS, type SpeedSample } from '@/lib/speed-history'

const WINDOWS = [
  { label: '5m', ms: 5 * 60_000 },
  { label: '15m', ms: 15 * 60_000 },
  { label: '30m', ms: HISTORY_WINDOW_MS },
]

const ratio = (stats: TransferStats) =>
  stats.downloadedBytes > 0 ? stats.uploadedBytes / stats.downloadedBytes : stats.uploadedBytes > 0 ? -2 : -1

/** Session and lifetime transfer totals, with a larger interactive speed history. */
export function StatisticsPage() {
  const { data: stats, error } = useSessionStats()

  return (
    <PageShell title="Statistics">
      <SpeedHistoryCard />

      {error && !stats && <p className="px-5 text-destructive text-sm">Couldn’t load statistics: {error.message}</p>}

      <TotalsSection title="This session" stats={stats?.['current-stats']} />
      <TotalsSection title="All time" stats={stats?.['cumulative-stats']} showSessions />

      <SettingsSection title="Torrents">
        <SettingsRow label="Active">
          <Value>{stats && formatNumber(stats.activeTorrentCount)}</Value>
        </SettingsRow>
        <SettingsRow label="Paused">
          <Value>{stats && formatNumber(stats.pausedTorrentCount)}</Value>
        </SettingsRow>
        <SettingsRow label="Total">
          <Value>{stats && formatNumber(stats.torrentCount)}</Value>
        </SettingsRow>
      </SettingsSection>
    </PageShell>
  )
}

function Value({ children }: { children: React.ReactNode }) {
  return <span className="text-right text-muted-foreground text-sm tabular-nums">{children ?? '—'}</span>
}

function TotalsSection({
  title,
  stats,
  showSessions,
}: {
  title: string
  stats: TransferStats | undefined
  showSessions?: boolean
}) {
  return (
    <SettingsSection title={title}>
      <SettingsRow label="Downloaded">
        <Value>{stats && formatBytes(stats.downloadedBytes)}</Value>
      </SettingsRow>
      <SettingsRow label="Uploaded">
        <Value>{stats && formatBytes(stats.uploadedBytes)}</Value>
      </SettingsRow>
      <SettingsRow label="Ratio">
        <Value>{stats && formatRatio(ratio(stats))}</Value>
      </SettingsRow>
      <SettingsRow label="Files added">
        <Value>{stats && formatNumber(stats.filesAdded)}</Value>
      </SettingsRow>
      {showSessions && (
        <SettingsRow label="Sessions">
          <Value>{stats && formatNumber(stats.sessionCount)}</Value>
        </SettingsRow>
      )}
      <SettingsRow label="Time active">
        <Value>{stats && formatDuration(stats.secondsActive)}</Value>
      </SettingsRow>
    </SettingsSection>
  )
}

function SpeedHistoryCard() {
  const [windowMs, setWindowMs] = useState(WINDOWS[0]!.ms)
  const [hovered, setHovered] = useState<SpeedSample | null>(null)
  const { samples, end } = useSpeedSamples(windowMs)
  const live = samples.filter((s) => !Number.isNaN(s.down))
  const latest = samples[samples.length - 1]
  const shown = hovered ?? latest
  const peak = (key: 'down' | 'up') => live.reduce((max, s) => Math.max(max, s[key]), 0)
  const average = (key: 'down' | 'up') => (live.length ? live.reduce((sum, s) => sum + s[key], 0) / live.length : 0)

  return (
    <section aria-label="Speed history" className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-5 pt-5">
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <SpeedFigure rate={shown?.down} direction="down" size="xl" />
          <SpeedFigure rate={shown?.up} direction="up" size="xl" />
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={String(windowMs)}
          onValueChange={(value) => value && setWindowMs(Number(value))}
          aria-label="History window"
        >
          {WINDOWS.map((w) => (
            <ToggleGroupItem key={w.label} value={String(w.ms)} className="px-2.5 tabular-nums">
              {w.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <p className="h-5 px-5 pt-1 text-muted-foreground text-xs" aria-live="off">
        {hovered ? secondsAgo(hovered.time, end) : 'Now'}
      </p>
      <SpeedChart windowMs={windowMs} height={200} interactive grid onHover={setHovered} className="mt-2" />
      <dl className="grid grid-cols-2 gap-px border-t bg-border text-xs sm:grid-cols-4">
        {(
          [
            ['Peak ↓', peak('down')],
            ['Average ↓', average('down')],
            ['Peak ↑', peak('up')],
            ['Average ↑', average('up')],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5 bg-card px-5 py-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium tabular-nums">{formatSpeed(value)}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t px-5 py-2.5 text-muted-foreground text-xs">
        History is kept while this page is open in your browser and starts over when you reconnect.
      </p>
    </section>
  )
}
