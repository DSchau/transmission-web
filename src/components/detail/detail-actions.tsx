import { Ellipsis } from 'lucide-react'
import { type ReactNode, type RefObject, useLayoutEffect, useRef, useState } from 'react'
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
import type { Torrent } from '@/lib/rpc/types'
import { cn } from '@/lib/utils'

/**
 * Which actions earn a toolbar icon first as space allows. Anything that doesn't fit, plus
 * anything not listed (Remove and Delete Data stays a deliberate trip through the menu),
 * lives in the overflow menu.
 */
const PRIORITY = ['location', 'verify', 'reannounce', 'copy-magnet', 'remove', 'queue', 'rename', 'copy-name']

// Icon buttons are `size-8` with `gap-1` between them.
const SLOT_REM = 2
const GAP_REM = 0.25

/**
 * Detail toolbar actions: as many icon buttons as fit in the free space, the rest in a "…"
 * menu. The icons sit in a `flex-1` box whose width is whatever the fixed buttons leave over,
 * so we count how many whole icons fit and never render one that would be clipped or overlap.
 * `children` (Pause/Resume) sits between the icons and the menu.
 */
export function DetailActions({ torrent, children }: { torrent: Torrent; children?: ReactNode }) {
  // Pause/Resume already has its own toolbar button.
  const groups = useTorrentActionGroups(torrent, { includePauseResume: false })
  const ref = useRef<HTMLDivElement>(null)
  const capacity = useIconCapacity(ref)

  const inline = new Set(PRIORITY.slice(0, capacity))
  const shown = groups.flat().filter((item) => inline.has(item.id))
  const overflow = groups.map((group) => group.filter((item) => !inline.has(item.id))).filter((g) => g.length > 0)

  return (
    <>
      <div ref={ref} className="flex min-w-0 flex-1 items-center justify-end gap-1">
        {shown.map((item) =>
          isSubmenu(item) ? <InlineSubmenu key={item.id} item={item} /> : <InlineAction key={item.id} item={item} />,
        )}
      </div>
      {children}
      <OverflowMenu groups={overflow} />
    </>
  )
}

/** How many icon buttons fit across the element's current width. */
function useIconCapacity(ref: RefObject<HTMLElement | null>) {
  const [capacity, setCapacity] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      const slot = SLOT_REM * rem
      const gap = GAP_REM * rem
      const width = el.getBoundingClientRect().width
      // n icons need n·slot + (n−1)·gap. The epsilon absorbs sub-pixel rounding only.
      setCapacity(Math.max(0, Math.floor((width + gap) / (slot + gap) + 1e-3)))
    }
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
  return capacity
}

const tooltipLabel = (label: string) => label.replace(/…$/, '')

function InlineAction({ item }: { item: ActionItem }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={tooltipLabel(item.label)}
          disabled={item.disabled}
          onClick={item.onSelect}
          className={cn(item.destructive && 'text-destructive hover:text-destructive')}
        >
          <item.icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltipLabel(item.label)}</TooltipContent>
    </Tooltip>
  )
}

function InlineSubmenu({ item }: { item: ActionSubmenu }) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={item.label}>
              <item.icon />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{item.label}</TooltipContent>
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
