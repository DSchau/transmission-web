import { Ellipsis, Pause, Play, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { CATEGORY_INFO, categoryOf, type TorrentCategory } from '@/lib/category'
import { formatBytes, formatNumber } from '@/lib/format'
import { useTorrentActions } from '@/lib/mutations'
import { haveBytes, idsByPausedState, type StatusTone, statusTone, toneBg, totalSize } from '@/lib/torrent'
import { clearSelection, confirmRemove } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { ActionMenuItems, useBulkActionGroups } from './actions'
import { useTorrentsView } from './torrents-view'

const MAX_CARDS = 5

/** Detail column when several torrents are selected (like Mail's stacked selection). */
export function SelectionSummary() {
  const { selected } = useTorrentsView()
  const actions = useTorrentActions()
  const groups = useBulkActionGroups(selected)
  const size = totalSize(selected)
  const have = selected.reduce((sum, t) => sum + haveBytes(t), 0)
  const { paused, running } = idsByPausedState(selected)
  // One card per kind of torrent (category × state), biggest group in front, so a mixed selection
  // shows every kind instead of whichever three happen to be first.
  const kinds = new Map<string, { category: TorrentCategory; tone: StatusTone; count: number }>()
  const categories = new Map<TorrentCategory, number>()
  for (const t of selected) {
    const category = categoryOf(t)
    const tone = statusTone(t)
    const key = `${category}:${tone}`
    const kind = kinds.get(key) ?? { category, tone, count: 0 }
    kind.count++
    kinds.set(key, kind)
    categories.set(category, (categories.get(category) ?? 0) + 1)
  }
  const cards = [...kinds.entries()].sort(([, a], [, b]) => b.count - a.count).slice(0, MAX_CARDS)
  const breakdown = [...categories].sort(([, a], [, b]) => b - a)

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
      <div className="relative h-28 w-56" aria-hidden>
        {cards.map(([key, { category, tone }], index) => {
          const Icon = CATEGORY_INFO[category].icon
          // Fan out like a hand of cards centered on the column; the largest group sits nearest the middle,
          // on top, with smaller groups alternating outward behind it.
          // Odd counts: 0, -1, +1, -2, +2. Even counts: -½, +½, -1½, +1½.
          const offset =
            cards.length % 2
              ? Math.ceil(index / 2) * (index % 2 ? -1 : 1)
              : (Math.floor(index / 2) + 0.5) * (index % 2 ? 1 : -1)
          return (
            <div
              key={key}
              className={cn(
                'absolute top-4 left-1/2 -ml-10 flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-white/25 to-transparent text-white shadow-lg ring-2 ring-background transition-all duration-300',
                toneBg[tone],
              )}
              style={{
                zIndex: MAX_CARDS - index,
                transform: `translateX(${offset * 40}px) translateY(${Math.abs(offset) * 6}px) rotate(${offset * 8}deg)`,
              }}
            >
              <Icon className="size-9 drop-shadow-sm" strokeWidth={1.75} />
            </div>
          )
        })}
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
