import { useSelector } from '@tanstack/react-store'
import { Plus } from 'lucide-react'
import { TransmissionLogo } from '@/components/transmission-logo'
import { Button } from '@/components/ui/button'
import { formatBytes } from '@/lib/format'
import { filterTitle, totalSize } from '@/lib/torrent'
import { exitSelectMode, openDialog, selectionAtom, selectionOf, selectModeAtom } from '@/lib/ui'
import { AppMenu } from './app-menu'
import { SearchField } from './search-field'
import { useTorrentsView } from './torrents-view'
import { ViewOptionsMenu } from './view-options-menu'

/**
 * iOS-style large-title header for phone and tablet layouts. Counts and rates live in the
 * StatusPanel right below, not in a subtitle. A full-width search field always sits below
 * the title row.
 */
export function ListHeader() {
  const selectMode = useSelector(selectModeAtom)
  return (
    <header className="pt-safe shrink-0 border-b bg-background/80 backdrop-blur-md">
      {selectMode ? <SelectModeBar /> : <TitleBar />}
    </header>
  )
}

function TitleBar() {
  const { search, goHome } = useTorrentsView()

  return (
    <>
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <TransmissionLogo className="size-8" />
          <h1 className="min-w-0 truncate font-bold text-2xl tracking-tight">
            <button
              type="button"
              onClick={goHome}
              aria-label="Reset view"
              className="-mx-2 rounded-md px-2 transition-colors outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {filterTitle(search.filter)}
            </button>
          </h1>
        </div>
        <div className="-mr-2 flex items-center">
          <Button size="sm" className="mr-1 rounded-full px-3" onClick={() => openDialog({ type: 'add' })}>
            <Plus data-icon="inline-start" />
            Add
          </Button>
          <ViewOptionsMenu />
          <AppMenu />
        </div>
      </div>
      <div className="px-4 pb-2.5">
        <SearchField className="h-9" />
      </div>
    </>
  )
}

function SelectModeBar() {
  const { table, selected } = useTorrentsView()
  const selection = useSelector(selectionAtom)
  const rows = table.getRowModel().rows
  const allSelected = rows.length > 0 && rows.every((row) => selection[row.id])

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
          {selected.length === 0 ? 'Tap torrents to select them' : formatBytes(totalSize(selected))}
        </p>
      </div>
      <Button size="sm" className="w-24" onClick={exitSelectMode}>
        Done
      </Button>
    </div>
  )
}
