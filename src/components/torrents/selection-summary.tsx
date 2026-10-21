import { Ellipsis, Pause, Play, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { CATEGORY_INFO, categoryOf, type TorrentCategory } from '@/lib/category'
import { formatBytes, formatNumber } from '@/lib/format'
import { useTorrentActions } from '@/lib/mutations'
import { haveBytes, idsByPausedState, statusTone, toneBg, totalSize } from '@/lib/torrent'
import { clearSelection, confirmRemove } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { ActionMenuItems, useBulkActionGroups } from './actions'
import { useTorrentsView } from './torrents-view'

const MAX_CARDS = 24

/** Detail column when several torrents are selected (like Mail's stacked selection). */
export function SelectionSummary() {
  const { selected } = useTorrentsView()
  const actions = useTorrentActions()
  const groups = useBulkActionGroups(selected)
  const size = totalSize(selected)
  const have = selected.reduce((sum, t) => sum + haveBytes(t), 0)
  const { paused, running } = idsByPausedState(selected)
  // One card per torrent in selection order, so each one you add is dealt on top (rightmost).
  // Past MAX_CARDS, only the most recent stay in hand.
  const categories = new Map<TorrentCategory, number>()
  for (const t of selected) categories.set(categoryOf(t), (categories.get(categoryOf(t)) ?? 0) + 1)
  const cards = selected.slice(-MAX_CARDS)
  const hidden = selected.length - cards.length
  const breakdown = [...categories].sort(([, a], [, b]) => b - a)
  // The hand gets tighter as it grows so its width and arc stay bounded.
  const half = (cards.length - 1) / 2
  const spread = half > 0 ? Math.min(36, 100 / half) : 0
  const maxTilt = Math.min(20, half * 8)

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
      <div className="relative h-28 w-64" aria-hidden>
        {cards.map((t, index) => {
          const Icon = CATEGORY_INFO[categoryOf(t)].icon
          // Fan out like a hand of cards, centered on the column, each card overlapping the one to its left.
          const offset = index - half
          const edge = half > 0 ? offset / half : 0
          return (
            <div
              key={t.id}
              className={cn(
                'absolute top-5 left-1/2 -ml-9 flex size-18 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-white/25 to-transparent text-white shadow-lg ring-2 ring-background transition-all duration-300',
                toneBg[statusTone(t)],
              )}
              style={{
                transform: `translateX(${offset * spread}px) translateY(${edge ** 2 * Math.min(12, half * 4)}px) rotate(${edge * maxTilt}deg)`,
              }}
            >
              <Icon className="size-8 drop-shadow-sm" strokeWidth={1.75} />
            </div>
          )
        })}
        {hidden > 0 && (
          <span className="absolute right-0 bottom-0 z-10 rounded-full bg-foreground px-2 py-0.5 font-medium text-background text-xs tabular-nums shadow">
            +{formatNumber(hidden)}
          </span>
        )}
      </div>
      <div className="flex flex-col items-center gap-1.5 text-center">
        <h2 className="font-bold text-xl">{formatNumber(selected.length)} Torrents Selected</h2>
        <p className="text-muted-foreground text-sm tabular-nums">
          {have >= size ? formatBytes(size) : `${formatBytes(have)} of ${formatBytes(size)}`}
        </p>
        {breakdown.length > 1 && (
          <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-muted-foreground text-sm tabular-nums">
            {breakdown.map(([category, count]) => {
              const info = CATEGORY_INFO[category]
              return (
                <li key={category} className="flex items-center gap-1">
                  <info.icon className={cn('size-3.5', info.text)} aria-hidden />
                  {formatNumber(count)} {info.title}
                </li>
              )
            })}
          </ul>
        )}
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
        <Button variant="destructive" onClick={() => confirmRemove(selected)}>
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
