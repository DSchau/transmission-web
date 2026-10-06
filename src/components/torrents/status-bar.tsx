import { ArrowDown, ArrowUp } from 'lucide-react'
import { formatBytes, formatSpeed } from '@/lib/format'
import { useConnectionState } from '@/lib/queries'
import { useTorrentsView } from './torrents-view'
import { useTransferSummary } from './use-summary'

/** Desktop footer: counts, selection size and total transfer rates. */
export function StatusBar() {
  const summary = useTransferSummary()
  const { selected } = useTorrentsView()
  const state = useConnectionState()
  if (state.status !== 'connected' && state.status !== 'offline') return null
  const selectedSize = selected.reduce((sum, t) => sum + t.sizeWhenDone, 0)

  return (
    <footer className="flex h-8 shrink-0 items-center gap-4 border-t px-4 text-muted-foreground text-xs tabular-nums">
      <span>
        {summary.countText}
        {selected.length > 1 && ` · ${selected.length} selected (${formatBytes(selectedSize)})`}
      </span>
      <div className="flex-1" />
      {summary.altSpeedEnabled && <span className="text-status-checking">Alternative speeds</span>}
      <span className="inline-flex items-center gap-1">
        <ArrowDown className="size-3 text-status-downloading" />
        {formatSpeed(summary.exactDown)}
      </span>
      <span className="inline-flex items-center gap-1">
        <ArrowUp className="size-3 text-status-seeding" />
        {formatSpeed(summary.exactUp)}
      </span>
    </footer>
  )
}
