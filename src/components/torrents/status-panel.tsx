import { ArrowDown, ArrowUp } from 'lucide-react'
import { SpeedSparkline } from '@/components/speed/speed-widget'
import { formatBytes, formatSpeed } from '@/lib/format'
import { useConnectionState, useSession } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { useTorrentsView } from './torrents-view'
import { useTransferSummary } from './use-summary'

/**
 * Slim status strip below the header (all layouts), like the status bar in the native clients:
 * counts, total transfer rates and free space. `sparkline` adds a mini speed chart where the sidebar
 * chart isn't shown. (Alternative speed limits toggle stays in the overflow menu — Settings >
 * Alternative Speeds.)
 */
export function StatusPanel({ sparkline, className }: { sparkline?: boolean; className?: string }) {
  const summary = useTransferSummary()
  const { selected } = useTorrentsView()
  const state = useConnectionState()
  const { data: session } = useSession()

  // While connecting (or when sign-in / a first connection is needed) the list's empty states
  // carry the message instead.
  if (state.status !== 'connected' && state.status !== 'offline') return null

  const offline = state.status === 'offline'
  const freeSpace = session?.['download-dir-free-space'] ?? 0
  const selectedSize = selected.reduce((sum, t) => sum + t.sizeWhenDone, 0)

  return (
    <footer
      className={cn(
        'flex min-h-8 shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b px-4 py-1.5 text-muted-foreground text-xs tabular-nums',
        className,
      )}
    >
      <span className="min-w-0 truncate">
        {offline ? 'Offline' : summary.countText}
        {selected.length > 1 && ` · ${selected.length} selected (${formatBytes(selectedSize)})`}
      </span>
      <div className="min-w-0 flex-1" />
      {sparkline && <SpeedSparkline />}
      <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
        <ArrowDown className="size-3 text-status-downloading" aria-label="Download" />
        {formatSpeed(summary.exactDown)}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
        <ArrowUp className="size-3 text-status-seeding" aria-label="Upload" />
        {formatSpeed(summary.exactUp)}
      </span>
      {freeSpace > 0 && (
        <span className="hidden md:inline" title="Free space in the download directory">
          {formatBytes(freeSpace)} free
        </span>
      )}
    </footer>
  )
}
