import { Ellipsis, Pause, Play, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatBytes, formatNumber } from '@/lib/format'
import { useTorrentActions } from '@/lib/mutations'
import { haveBytes, isPaused, statusTone, toneBg } from '@/lib/torrent'
import { clearSelection, openDialog } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { ActionMenuItems, useBulkActionGroups } from './actions'
import { useTorrentsView } from './torrents-view'

/** Detail column when several torrents are selected (like Mail's stacked selection). */
export function SelectionSummary() {
  const { selected } = useTorrentsView()
  const actions = useTorrentActions()
  const groups = useBulkActionGroups(selected)
  const size = selected.reduce((sum, t) => sum + t.sizeWhenDone, 0)
  const have = selected.reduce((sum, t) => sum + haveBytes(t), 0)
  const paused = selected.filter(isPaused).map((t) => t.id)
  const running = selected.filter((t) => !isPaused(t)).map((t) => t.id)
  // One card per selected torrent (max three), colored by state — reads as "a stack".
  const cards = selected.slice(0, 3).reverse()

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-7 p-6">
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute top-2 right-2"
        aria-label="Clear selection"
        onClick={clearSelection}
      >
        <X />
      </Button>
      <div className="relative h-28 w-36" aria-hidden>
        {cards.map((t, index) => (
          <div
            key={t.id}
            className={cn(
              'absolute inset-x-2 top-4 h-20 rounded-2xl bg-gradient-to-br from-white/25 to-transparent shadow-lg transition-all duration-300',
              toneBg[statusTone(t)],
            )}
            style={{ transform: `translate(${index * 6}px, ${index * -4}px) rotate(${index * 6 - 6}deg)` }}
          />
        ))}
      </div>
      <div className="text-center">
        <h2 className="font-bold text-xl">{formatNumber(selected.length)} Torrents Selected</h2>
        <p className="text-muted-foreground text-sm tabular-nums">
          {have >= size ? formatBytes(size) : `${formatBytes(have)} of ${formatBytes(size)}`}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {paused.length > 0 && (
          <Button variant="outline" onClick={() => actions.resume(paused)}>
            <Play data-icon="inline-start" /> Resume
          </Button>
        )}
        {running.length > 0 && (
          <Button variant="outline" onClick={() => actions.pause(running)}>
            <Pause data-icon="inline-start" /> Pause
          </Button>
        )}
        <Button
          variant="destructive"
          onClick={() =>
            openDialog({ type: 'remove', ids: selected.map((t) => t.id), names: selected.map((t) => t.name) })
          }
        >
          <Trash2 data-icon="inline-start" /> Remove
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="More">
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-60">
            <ActionMenuItems groups={groups.slice(1, -1)} kind="dropdown" />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
