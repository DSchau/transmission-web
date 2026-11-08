import { Ellipsis, Pause, Play } from 'lucide-react'
import { type RefObject, useLayoutEffect, useRef, useState } from 'react'
import {
  type ActionGroup,
  type ActionItem,
  ActionMenuItems,
  type ActionSubmenu,
  isSubmenu,
  useTorrentActionGroups,
} from '@/components/torrents/actions'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTorrentActions } from '@/lib/mutations'
import type { Torrent } from '@/lib/rpc/types'
import { isPaused } from '@/lib/torrent'
import { cn } from '@/lib/utils'

type Action = ActionItem | ActionSubmenu

/** The everyday actions, in order. Pause/Resume is always shown. */
const PRIMARY = ['pause-resume', 'rename', 'remove', 'location']
/** Shown after a divider, dimmer, as space allows. */
const SECONDARY = ['verify', 'reannounce', 'copy-magnet', 'queue', 'copy-name']
// Anything else (Resume Now, Remove and Delete Data) only lives in the "…" menu.

// Icon buttons are `size-8` with `gap-1` between them; the divider is `w-px` + `mx-1`.
const SLOT_REM = 2
const GAP_REM = 0.25
const DIVIDER_REM = 0.5

/**
 * Detail toolbar actions as icon buttons, most common first, then a divider and the
 * secondary ones. They fill a `flex-1` box; we count how many whole icons fit its width and
 * move the rest (lowest priority first) into the "…" menu, so an icon is never clipped or
 * overlapping at any width.
 */
export function DetailActions({ torrent }: { torrent: Torrent }) {
  const { togglePaused } = useTorrentActions()
  const groups = useTorrentActionGroups(torrent, { includePauseResume: false })
  const ref = useRef<HTMLDivElement>(null)
  const { width, rem } = useBoxWidth(ref)

  const paused = isPaused(torrent)
  const pauseResume: ActionItem = {
    id: 'pause-resume',
    label: paused ? 'Resume' : 'Pause',
    icon: paused ? Play : Pause,
    onSelect: () => togglePaused(torrent),
  }
  const byId = new Map<string, Action>([...groups.flat(), pauseResume].map((item) => [item.id, item]))
  const pick = (ids: string[]) => ids.flatMap((id) => byId.get(id) ?? [])
  const primary = pick(PRIMARY)
  const secondary = pick(SECONDARY)

  const count = fitCount(width, rem, primary.length, secondary.length)
  const shownPrimary = primary.slice(0, count)
  const shownSecondary = secondary.slice(0, Math.max(0, count - primary.length))
  const shown = new Set([...shownPrimary, ...shownSecondary].map((item) => item.id))
  const overflow = groups.map((group) => group.filter((item) => !shown.has(item.id))).filter((g) => g.length > 0)

  return (
    <>
      <div ref={ref} className="flex min-w-0 flex-1 items-center justify-end gap-1">
        {shownPrimary.map((item) => (
          <InlineAction key={item.id} item={item} />
        ))}
        {shownSecondary.length > 0 && <div aria-hidden className="mx-1 h-4 w-px shrink-0 bg-border" />}
        {shownSecondary.map((item) => (
          <InlineAction key={item.id} item={item} secondary />
        ))}
      </div>
      <OverflowMenu groups={overflow} />
    </>
  )
}

/**
 * How many icons fit in `width`, taking primary ones first. Always at least one, so
 * Pause/Resume never disappears.
 */
function fitCount(width: number, rem: number, primary: number, secondary: number) {
  const slot = SLOT_REM * rem
  const gap = GAP_REM * rem
  const divider = DIVIDER_REM * rem + 1 + gap
  let count = 1
  for (let n = 2; n <= primary + secondary; n++) {
    const needed = n * slot + (n - 1) * gap + (n > primary ? divider : 0)
    // The epsilon absorbs sub-pixel rounding only.
    if (needed > width + 1e-3) break
    count = n
  }
  return count
}

function useBoxWidth(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, rem: 16 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () =>
      setSize({
        width: el.getBoundingClientRect().width,
        rem: Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16,
      })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    // Root font size changes (browser zoom/text size) don't always resize the box itself.
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [ref])
  return size
}

const tooltipLabel = (label: string) => label.replace(/…$/, '')

// Icons pop in as room opens up (or the panel opens); the swapped Pause/Resume glyph too.
const enter = 'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-75 motion-safe:duration-200'

function InlineAction({ item, secondary = false }: { item: Action; secondary?: boolean }) {
  const label = tooltipLabel(item.label)
  const button = (props: React.ComponentProps<typeof Button>) => (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      className={cn(
        enter,
        secondary && 'text-muted-foreground',
        !isSubmenu(item) && item.destructive && 'text-destructive hover:text-destructive',
      )}
      {...props}
    >
      {/* Keyed so a Pause ↔ Resume swap remounts, and animates, the glyph. */}
      <item.icon key={item.label} className={cn(enter, item.id === 'pause-resume' && 'fill-current')} />
    </Button>
  )

  if (isSubmenu(item)) {
    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>{button({})}</DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-max min-w-48">
          {item.items.map((sub) => (
            <DropdownMenuItem key={sub.id} onSelect={sub.onSelect} disabled={sub.disabled}>
              <sub.icon />
              {sub.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button({ onClick: item.onSelect, disabled: item.disabled })}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function OverflowMenu({ groups }: { groups: ActionGroup[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="More actions">
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-max min-w-60">
        <ActionMenuItems groups={groups} kind="dropdown" />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
