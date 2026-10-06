import { Ellipsis, Pause, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useTorrentActions } from '@/lib/mutations'
import { isPaused } from '@/lib/torrent'
import { openDialog } from '@/lib/ui'
import { ActionMenuItems, useBulkActionGroups } from './actions'
import { useTorrentsView } from './torrents-view'

/** Bottom toolbar in Select mode (Mail/Photos style). */
export function SelectionBar() {
  const { selected } = useTorrentsView()
  const actions = useTorrentActions()
  const groups = useBulkActionGroups(selected)
  const paused = selected.filter(isPaused).map((t) => t.id)
  const running = selected.filter((t) => !isPaused(t)).map((t) => t.id)
  const none = selected.length === 0

  return (
    <div className="pb-safe shrink-0 border-t bg-background/90 backdrop-blur-md">
      <div className="flex items-center justify-between gap-1 px-2 py-1.5">
        <Button variant="ghost" disabled={paused.length === 0} onClick={() => actions.resume(paused)}>
          <Play data-icon="inline-start" />
          Resume
        </Button>
        <Button variant="ghost" disabled={running.length === 0} onClick={() => actions.pause(running)}>
          <Pause data-icon="inline-start" />
          Pause
        </Button>
        <Button
          variant="ghost"
          className="text-destructive"
          disabled={none}
          onClick={() =>
            openDialog({ type: 'remove', ids: selected.map((t) => t.id), names: selected.map((t) => t.name) })
          }
        >
          <Trash2 data-icon="inline-start" />
          Remove
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More actions" disabled={none}>
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-60">
            <ActionMenuItems groups={groups.slice(1)} kind="dropdown" />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
