import { CheckCircle2, XCircle } from 'lucide-react'
import { formatRelative } from '@/lib/format'
import type { Torrent } from '@/lib/rpc/types'
import { EmptyRow, LoadingRow } from './detail-rows'

export function TrackersTab({ torrent, loading }: { torrent: Torrent; loading: boolean }) {
  if (loading || !torrent.trackerStats) return <LoadingRow />
  if (torrent.trackerStats.length === 0) return <EmptyRow>No trackers</EmptyRow>

  const trackers = [...torrent.trackerStats].sort((a, b) => a.tier - b.tier)
  return (
    <ul className="divide-y pb-8">
      {trackers.map((tracker) => (
        <li key={tracker.id} className="flex flex-col gap-1 px-4 py-2.5 text-sm">
          <div className="flex items-baseline gap-2">
            <span className="truncate font-semibold">{tracker.host}</span>
            <span className="ml-auto shrink-0 text-muted-foreground text-xs">Tier {tracker.tier + 1}</span>
          </div>
          <p className="truncate font-mono text-muted-foreground/70 text-xs" title={tracker.announce}>
            {tracker.announce}
          </p>
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            {tracker.lastAnnounceSucceeded ? (
              <CheckCircle2 className="size-3.5 shrink-0 text-status-seeding" />
            ) : (
              <XCircle className="size-3.5 shrink-0 text-status-error" />
            )}
            <span className="min-w-0 flex-1 truncate">
              {tracker.lastAnnounceResult || 'Not announced yet'}
              {tracker.lastAnnounceTime > 0 && ` · ${formatRelative(tracker.lastAnnounceTime)}`}
            </span>
            <span className="shrink-0 tabular-nums">
              {Math.max(tracker.seederCount, 0)} seeders · {Math.max(tracker.leecherCount, 0)} leechers
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}
