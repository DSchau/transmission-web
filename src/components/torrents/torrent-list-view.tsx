import { useSelector } from '@tanstack/react-store'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Check, Ellipsis, Pause, Play } from 'lucide-react'
import { memo, useCallback, useRef } from 'react'
import { ProgressBar } from '@/components/progress-bar'
import { Rate } from '@/components/rate'
import { Button } from '@/components/ui/button'
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/components/ui/context-menu'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useTorrentActions } from '@/lib/mutations'
import { type Torrent, TorrentStatus } from '@/lib/rpc/types'
import { displayProgress, hasError, isPaused, rowDetail, stateLabel, statusTone, toneText } from '@/lib/torrent'
import { selectionAtom, selectModeAtom } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { ListEmptyState, useShowsEmptyState } from './connection-state'
import { toggleRow } from './table-model'
import { TorrentMenuContent } from './torrent-menu'
import { useTorrentsView } from './torrents-view'

/** Phone/tablet list: the same table rows, rendered as cards. Virtualized for large libraries. */
export function TorrentListView({ className }: { className?: string }) {
  const { table, openTorrent, openTorrentId } = useTorrentsView()
  const selectMode = useSelector(selectModeAtom)
  const selection = useSelector(selectionAtom)
  const showEmpty = useShowsEmptyState()
  const scrollRef = useRef<HTMLDivElement>(null)
  const rows = table.getRowModel().rows

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
  selectMode: boolean
  selected: boolean
  onActivate: (id: string) => void
}

/** Memoized on the torrent object: React Query's structural sharing keeps unchanged ones identical. */
const TorrentCard = memo(function TorrentCard({ torrent: t, selectMode, selected, onActivate }: CardProps) {
  const tone = statusTone(t)
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            'flex items-stretch gap-3 border-b px-4 py-3 transition-colors',
            selected ? 'bg-status-downloading/10' : 'active:bg-muted/60',
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
            className="flex min-w-0 flex-1 flex-col gap-1 text-left outline-none"
          >
            <span className="line-clamp-2 font-semibold text-[0.9375rem] leading-snug">{t.name}</span>
            <span className="flex items-baseline gap-2 text-sm tabular-nums">
              <span
                className={cn('min-w-0 flex-1 truncate', hasError(t) ? 'text-status-error' : 'text-muted-foreground')}
              >
                <span className={cn('font-semibold', toneText[tone])}>{stateLabel(t)}</span> · {rowDetail(t)}
              </span>
              {t.rateDownload > 0 && <Rate rate={t.rateDownload} direction="down" />}
              {t.rateUpload > 0 && <Rate rate={t.rateUpload} direction="up" />}
            </span>
            <ProgressBar
              progress={displayProgress(t)}
              tone={tone}
              active={t.status === TorrentStatus.Downloading && t.rateDownload > 0}
              className="mt-2"
            />
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

/** Quick pause/resume (instead of iOS swipe actions) and the full actions menu. */
function CardActions({ torrent }: { torrent: Torrent }) {
  const { togglePaused } = useTorrentActions()
  const paused = isPaused(torrent)
  return (
    <div className="-mr-2 flex shrink-0 flex-col items-center justify-between">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${torrent.name}`}>
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <TorrentMenuContent torrent={torrent} kind="dropdown" />
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={paused ? 'Resume' : 'Pause'}
        onClick={() => togglePaused(torrent)}
        className={paused ? 'text-status-seeding' : 'text-muted-foreground'}
      >
        {paused ? <Play className="fill-current" /> : <Pause className="fill-current" />}
      </Button>
    </div>
  )
}
