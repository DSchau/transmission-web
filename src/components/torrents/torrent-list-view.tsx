import { useRouter } from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Check, Ellipsis } from 'lucide-react'
import { memo, useCallback, useEffect, useRef } from 'react'
import { CategoryIcon } from '@/components/category-badge'
import { Button } from '@/components/ui/button'
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/components/ui/context-menu'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { Torrent } from '@/lib/rpc/types'
import { selectionAtom, selectModeAtom } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { ListEmptyState, useShowsEmptyState } from './connection-state'
import { toggleRow } from './table-model'
import { TorrentMenuContent } from './torrent-menu'
import { TorrentTransferStatus } from './torrent-transfer-status'
import { useTorrentsView } from './torrents-view'

/** Phone/tablet list: the same table rows, rendered as cards. Virtualized for large libraries. */
export function TorrentListView({ className }: { className?: string }) {
  const { table, openTorrent, openTorrentId } = useTorrentsView()
  const selectMode = useSelector(selectModeAtom)
  const selection = useSelector(selectionAtom)
  const showEmpty = useShowsEmptyState()
  const scrollRef = useRef<HTMLDivElement>(null)
  const rows = table.getRowModel().rows
  const router = useRouter()

  // Touch devices never fire the hover that preloads the detail route, so without this the first tap
  // waits on the detail chunk with no visible response, and people tap again thinking it missed.
  useEffect(() => {
    router.loadRouteChunk(router.routesById['/_torrents/torrents/$torrentId'])
  }, [router])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 92,
    overscan: 8,
    getItemKey: (index) => rows[index]?.id ?? index,
  })

  const onActivate = useCallback(
    (id: string) => {
      if (selectMode) toggleRow(table.getRow(id, true))
      else openTorrent(Number(id))
    },
    [selectMode, table, openTorrent],
  )

  if (showEmpty) {
    return (
      <div className={className}>
        <ListEmptyState />
      </div>
    )
  }

  return (
    <div ref={scrollRef} className={cn('overflow-y-auto overscroll-contain', className)}>
      <ul aria-label="Torrents" className="relative" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => {
          const row = rows[item.index]
          if (!row) return null
          return (
            <li
              key={row.id}
              data-index={item.index}
              ref={virtualizer.measureElement}
              className="absolute inset-x-0"
              style={{ transform: `translateY(${item.start}px)` }}
            >
              <TorrentCard
                torrent={row.original}
                index={item.index}
                selectMode={selectMode}
                selected={selectMode ? !!selection[row.id] : row.original.id === openTorrentId}
                onActivate={onActivate}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

interface CardProps {
  torrent: Torrent
  index: number
  selectMode: boolean
  selected: boolean
  onActivate: (id: string) => void
}

/** Memoized on the torrent object: React Query's structural sharing keeps unchanged ones identical. */
const TorrentCard = memo(function TorrentCard({ torrent: t, index, selectMode, selected, onActivate }: CardProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            'relative flex items-stretch gap-3 border-b px-4 py-3 transition-colors',
            selected ? 'bg-status-downloading/10' : cn('active:bg-muted/60', index % 2 === 1 && 'bg-muted/20'),
          )}
        >
          {selectMode && (
            <span
              aria-hidden
              className={cn(
                'mt-0.5 flex size-5 shrink-0 items-center justify-center self-center rounded-full border transition-colors',
                selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
              )}
            >
              {selected && <Check className="size-3.5" />}
            </span>
          )}
          <button
            type="button"
            onClick={() => onActivate(String(t.id))}
            aria-pressed={selectMode ? selected : undefined}
            // The ::after stretches the hit area over the whole card, padding included.
            className="flex min-w-0 flex-1 flex-col text-left outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
          >
            <span className="line-clamp-2 font-semibold text-[0.9375rem] leading-snug [overflow-wrap:anywhere]">
              <CategoryIcon torrent={t} className="mr-1.5 inline size-4 align-[-0.1875rem]" />
              {t.name}
            </span>
            <TorrentTransferStatus torrent={t} />
          </button>
          {!selectMode && <CardActions torrent={t} />}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-60">
        <TorrentMenuContent torrent={t} kind="context" />
      </ContextMenuContent>
    </ContextMenu>
  )
})

/** The card's actions menu. */
function CardActions({ torrent }: { torrent: Torrent }) {
  return (
    <div className="-mr-2 flex shrink-0 items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* Only the button sits above the card-wide tap overlay, so the space around it still opens the card. */}
          <Button variant="ghost" size="icon-sm" className="relative z-10" aria-label={`Actions for ${torrent.name}`}>
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <TorrentMenuContent torrent={torrent} kind="dropdown" />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
