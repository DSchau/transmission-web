import { useSelector } from '@tanstack/react-store'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatBytes, formatSpeed } from '@/lib/format'
import { useConnectionState } from '@/lib/queries'
import { FILTER_INFO } from '@/lib/torrent'
import { clearSelection, openDialog, selectionAtom, selectionOf, selectModeAtom } from '@/lib/ui'
import { AppMenu } from './app-menu'
import { SearchField } from './search-field'
import { useTorrentsView } from './torrents-view'
import { useTransferSummary } from './use-summary'
import { ViewOptionsMenu } from './view-options-menu'

/** iOS-style large-title header for phone and tablet layouts. */
export function ListHeader() {
  const selectMode = useSelector(selectModeAtom)
  return (
    <header className="pt-safe shrink-0 border-b bg-background/80 backdrop-blur-md">
      {selectMode ? <SelectModeBar /> : <TitleBar />}
      <div className="px-4 pb-3">
        <SearchField />
      </div>
    </header>
  )
}

function TitleBar() {
  const { search } = useTorrentsView()
  const summary = useTransferSummary()
  const state = useConnectionState()
  const title = search.filter === 'all' ? 'Torrents' : FILTER_INFO[search.filter].title

  return (
    <div className="flex items-start gap-2 px-4 pt-3 pb-2">
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-bold text-2xl tracking-tight">{title}</h1>
        <p className="truncate text-muted-foreground text-xs tabular-nums">
          {state.status === 'failed' || state.status === 'offline' ? (
            'Offline'
          ) : state.status === 'connected' ? (
            <>
              {summary.countText}
              {summary.down > 0 && <span className="text-status-downloading"> · ↓ {formatSpeed(summary.down)}</span>}
              {summary.up > 0 && <span className="text-status-seeding"> · ↑ {formatSpeed(summary.up)}</span>}
              {summary.altSpeedEnabled && ' · 🐢'}
            </>
          ) : (
            '\u00a0'
          )}
        </p>
      </div>
      <div className="-mr-2 flex items-center">
        <Button variant="ghost" size="icon" aria-label="Add torrent" onClick={() => openDialog({ type: 'add' })}>
          <Plus />
        </Button>
        <ViewOptionsMenu />
        <AppMenu />
      </div>
    </div>
  )
}

function SelectModeBar() {
  const { table, selected } = useTorrentsView()
  const selection = useSelector(selectionAtom)
  const rows = table.getRowModel().rows
  const allSelected = rows.length > 0 && rows.every((row) => selection[row.id])
  const size = selected.reduce((sum, t) => sum + t.sizeWhenDone, 0)

  const done = () => {
    selectModeAtom.set(false)
    clearSelection()
  }

  return (
    <div className="flex items-center gap-2 px-2 pt-3 pb-2">
      <Button
        variant="ghost"
        size="sm"
        className="w-24 justify-start"
        onClick={() => selectionAtom.set(allSelected ? {} : selectionOf(rows.map((row) => row.id)))}
      >
        {allSelected ? 'Deselect All' : 'Select All'}
      </Button>
      <div className="min-w-0 flex-1 text-center">
        <h1 className="truncate font-semibold">
          {selected.length === 0 ? 'Select Torrents' : `${selected.length} Selected`}
        </h1>
        <p className="truncate text-muted-foreground text-xs tabular-nums">
          {selected.length === 0 ? 'Tap torrents to select them' : formatBytes(size)}
        </p>
      </div>
      <Button size="sm" className="w-24" onClick={done}>
        Done
      </Button>
    </div>
  )
}
