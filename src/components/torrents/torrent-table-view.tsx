import { useSelector } from '@tanstack/react-store'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { type KeyboardEvent, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/components/ui/context-menu'
import { clearSelection, selectedIds, selectionAtom } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { ListEmptyState, useShowsEmptyState } from './connection-state'
import { NUMERIC_COLUMNS, type TorrentRow, toggleRow } from './table-model'
import { TorrentMenuContent } from './torrent-menu'
import { useTorrentsView } from './torrents-view'

const ROW_HEIGHT = 64
const NAME_MIN_WIDTH = 220
/** Columns that make way, in this order, when the table is narrower than its columns. */
const AUTO_HIDE_ORDER = ['queue', 'addedDate', 'ratio', 'eta', 'rateUpload', 'size', 'status', 'progress']

/**
 * Desktop table: virtualized rows, sortable headers, click / ⌘-click / ⇧-click selection,
 * right-click menus, and arrow-key navigation.
 */
export function TorrentTableView({ className }: { className?: string }) {
  const { table, openTorrent, openTorrentId, closeDetail } = useTorrentsView()
  const selection = useSelector(selectionAtom)
  const showEmpty = useShowsEmptyState()
  const scrollRef = useRef<HTMLDivElement>(null)
  // Whether the row was the open one when a double-click gesture began (the first click
  // of the pair navigates to the row, so `openTorrentId` alone can't tell us afterwards).
  const wasOpen = useRef(false)

  const rows = table.getRowModel().rows
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    getItemKey: (index) => rows[index]?.id ?? index,
  })

  // Fit the columns to the available width (e.g. when the inspector opens) instead of scrolling
  // sideways. This is a rendering concern only; the user's column choices are untouched.
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const visibleColumns = table.getVisibleLeafColumns()
  const visibleKey = visibleColumns.map((column) => column.id).join()
  // biome-ignore lint/correctness/useExhaustiveDependencies: recompute when the visible set (visibleKey) changes
  const hidden = useMemo(() => {
    const result = new Set<string>()
    if (width === 0) return result
    const widthOf = (id: string, size: number) => (id === 'name' ? NAME_MIN_WIDTH : size)
    let total = visibleColumns.reduce((sum, column) => sum + widthOf(column.id, column.getSize()), 0)
    for (const id of AUTO_HIDE_ORDER) {
      if (total <= width) break
      const column = visibleColumns.find((c) => c.id === id)
      if (!column) continue
      result.add(id)
      total -= column.getSize()
    }
    return result
  }, [visibleKey, width])

  const columns = visibleColumns.filter((column) => !hidden.has(column.id))
  const gridTemplateColumns = columns
    .map((column) => (column.id === 'name' ? `minmax(${NAME_MIN_WIDTH}px, 1fr)` : `${column.getSize()}px`))
    .join(' ')
  const minWidth = columns.reduce((sum, column) => sum + (column.id === 'name' ? NAME_MIN_WIDTH : column.getSize()), 0)
  const noSelection = selectedIds(selection).length === 0

  const open = (row: TorrentRow) => {
    toggleRow(row, { only: true })
    openTorrent(row.original.id)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const current = rows.findIndex((row) => row.original.id === openTorrentId)
      const next = Math.min(Math.max(current + (event.key === 'ArrowDown' ? 1 : -1), 0), rows.length - 1)
      const row = rows[next]
      if (!row) return
      if (event.shiftKey) toggleRow(row, { range: true })
      else open(row)
      virtualizer.scrollToIndex(next)
    } else if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
      event.preventDefault()
      table.toggleAllRowsSelected(true)
    }
  }

  return (
    // Keyboard navigation for the whole table lives on its scroll container.
    // biome-ignore lint/a11y/noStaticElementInteractions: arrow keys move between rows
    <div
      ref={scrollRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className={cn('relative overflow-auto outline-none', className)}
    >
      {/* Real table elements laid out with CSS grid, so rows can be absolutely positioned (virtualized). */}
      <table aria-label="Torrents" aria-rowcount={rows.length + 1} className="grid text-sm" style={{ minWidth }}>
        <thead className="sticky top-0 z-10 grid border-b bg-background/95 backdrop-blur">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id} className="grid h-9 items-center" style={{ gridTemplateColumns }}>
              {group.headers
                .filter((header) => !hidden.has(header.column.id))
                .map((header) => {
                  const sorted = header.column.getIsSorted()
                  const canSort = header.column.getCanSort()
                  const content = header.isPlaceholder ? null : <table.FlexRender header={header} />
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                      className={cn(
                        'flex h-full items-center px-3 font-medium text-muted-foreground text-xs',
                        NUMERIC_COLUMNS.has(header.id) && 'justify-end',
                      )}
                    >
                      {canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-sm hover:text-foreground',
                            sorted && 'text-foreground',
                            NUMERIC_COLUMNS.has(header.id) && 'flex-row-reverse',
                          )}
                        >
                          {content}
                          {sorted === 'asc' && <ArrowUp className="size-3" />}
                          {sorted === 'desc' && <ArrowDown className="size-3" />}
                        </button>
                      ) : (
                        content
                      )}
                    </th>
                  )
                })}
            </tr>
          ))}
        </thead>
        {!showEmpty && (
          <tbody className="relative grid" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((item) => {
              const row = rows[item.index]
              if (!row) return null
              const selected = row.getIsSelected() || (noSelection && row.original.id === openTorrentId)
              return (
                <ContextMenu key={row.id}>
                  <ContextMenuTrigger asChild>
                    <tr
                      aria-rowindex={item.index + 2}
                      aria-selected={selected}
                      data-state={selected ? 'selected' : undefined}
                      onClick={(event) => {
                        if (event.detail === 1) wasOpen.current = row.original.id === openTorrentId
                        if (event.metaKey || event.ctrlKey) toggleRow(row)
                        else if (event.shiftKey) toggleRow(row, { range: true })
                        else open(row)
                        scrollRef.current?.focus({ preventScroll: true })
                      }}
                      onDoubleClick={() => {
                        // Double-clicking the open torrent closes its detail view.
                        if (wasOpen.current) {
                          clearSelection()
                          closeDetail()
                        }
                      }}
                      onContextMenu={() => {
                        // Like Finder: right-clicking outside the selection selects that row.
                        if (!row.getIsSelected()) toggleRow(row, { only: true })
                      }}
                      className={cn(
                        'absolute inset-x-0 grid cursor-default select-none items-center border-border/50 border-b',
                        // Subtle zebra striping that reads in both light and dark themes.
                        item.index % 2 === 1 && 'bg-muted/30',
                        'hover:bg-muted/50 data-[state=selected]:bg-status-downloading/10',
                      )}
                      style={{ gridTemplateColumns, height: ROW_HEIGHT, transform: `translateY(${item.start}px)` }}
                    >
                      {row
                        .getVisibleCells()
                        .filter((cell) => !hidden.has(cell.column.id))
                        .map((cell) => (
                          <td
                            key={cell.id}
                            className={cn(
                              'flex min-w-0 items-center px-3',
                              NUMERIC_COLUMNS.has(cell.column.id) && 'justify-end',
                            )}
                          >
                            <table.FlexRender cell={cell} />
                          </td>
                        ))}
                    </tr>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-60">
                    <TorrentMenuContent torrent={row.original} kind="context" />
                  </ContextMenuContent>
                </ContextMenu>
              )
            })}
          </tbody>
        )}
      </table>
      {showEmpty && (
        <div className="absolute inset-x-0 top-9 bottom-0">
          <ListEmptyState />
        </div>
      )}
    </div>
  )
}
