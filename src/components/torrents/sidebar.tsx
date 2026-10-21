import { Link } from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'
import { Settings } from 'lucide-react'
import { type KeyboardEvent, type ReactNode, useMemo } from 'react'
import { TransmissionLogo } from '@/components/transmission-logo'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { connectionAtom, displayNameFor } from '@/lib/connection'
import { formatNumber } from '@/lib/format'
import { useConnectionState } from '@/lib/queries'
import { countByFilter, FILTER_INFO, FILTERS } from '@/lib/torrent'
import { cn } from '@/lib/utils'
import { SidebarActivity } from './activity'
import { SidebarToggle } from './desktop-toolbar'
import { useTorrentsView } from './torrents-view'

function moveFilterFocus(event: KeyboardEvent<HTMLUListElement>) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  event.preventDefault()
  const buttons = [...event.currentTarget.querySelectorAll('button')]
  const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
  const next = Math.min(Math.max(current + (event.key === 'ArrowDown' ? 1 : -1), 0), buttons.length - 1)
  buttons[next]?.focus()
}

/** Desktop filter sidebar (like Mail's mailboxes). */
export function Sidebar({ className }: { className?: string }) {
  const { torrents, search, setSearch, goHome } = useTorrentsView()
  const counts = useMemo(() => countByFilter(torrents), [torrents])
  const config = useSelector(connectionAtom)
  const host = displayNameFor(config)
  // IPs/localhost don't split meaningfully; names like `transmission.example.com` do.
  const dot = /^[\d[]/.test(host) ? -1 : host.indexOf('.')
  const [hostHead, hostTail] = dot > 0 ? [host.slice(0, dot), host.slice(dot)] : [host, '']

  return (
    <nav aria-label="Filters" className={cn('flex flex-col bg-sidebar text-sidebar-foreground', className)}>
      <div className="flex h-12 items-center border-b px-4">
        <button
          type="button"
          onClick={goHome}
          aria-label="Home"
          className="-ml-1 flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors outline-none hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <TransmissionLogo className="size-6" />
          <span className="font-semibold">Transmission</span>
        </button>
        <SidebarToggle className="-mr-2 ml-auto" />
      </div>
      <SidebarActivity />
      {/* One Tab stop (the current filter); ↑/↓ move between filters and Enter/Space picks one. */}
      <ul className="flex flex-col gap-0.5 p-2" onKeyDown={moveFilterFocus}>
        {FILTERS.map((filter, i) => {
          const info = FILTER_INFO[filter]
          const active = search.filter === filter
          return (
            <li key={filter}>
              <button
                type="button"
                tabIndex={active ? 0 : -1}
                onClick={() => setSearch({ filter })}
                aria-current={active ? 'page' : undefined}
                aria-keyshortcuts={String(i + 1)}
                title={`${info.title} (${i + 1})`}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60',
                )}
              >
                <info.icon
                  data-filter-icon={filter}
                  className={cn('size-4', active ? 'text-foreground' : 'text-muted-foreground')}
                />
                <span className="flex-1 text-left">{info.title}</span>
                <span className="text-muted-foreground text-xs tabular-nums">{formatNumber(counts[filter])}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="mt-auto flex items-center gap-2 border-t p-2 pl-4">
        <ConnectionDot />
        <Link
          to="/connect"
          title={host}
          className="flex min-w-0 flex-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
        >
          {/* Truncate the leading label so the identifying domain stays visible. */}
          <span className="truncate">{hostHead}</span>
          <span className="shrink-0">{hostTail}</span>
        </Link>
        <Button variant="ghost" size="icon-sm" asChild aria-label="Settings" aria-keyshortcuts="," title="Settings (,)">
          <Link to="/settings">
            <Settings />
          </Link>
        </Button>
      </div>
    </nav>
  )
}

export const RAIL_WIDTH = 52

function ConnectionDot() {
  const state = useConnectionState()
  return (
    <span
      className={cn(
        'size-2 shrink-0 rounded-full',
        state.status === 'connected'
          ? 'bg-status-seeding'
          : state.status === 'connecting'
            ? 'bg-status-checking'
            : 'bg-status-error',
      )}
      aria-hidden
    />
  )
}

/** A label that pops out to the right of a rail icon. */
function RailTip({ label, shortcut, children }: { label: string; shortcut?: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={6}>
        {label}
        {shortcut && <Kbd>{shortcut}</Kbd>}
      </TooltipContent>
    </Tooltip>
  )
}

/** The sidebar folded to icons: filters, server and settings, with names (and counts) in tooltips. */
export function SidebarRail({ className }: { className?: string }) {
  const { torrents, search, setSearch } = useTorrentsView()
  const counts = useMemo(() => countByFilter(torrents), [torrents])
  const config = useSelector(connectionAtom)
  const host = displayNameFor(config)

  return (
    <nav
      aria-label="Filters"
      className={cn('flex flex-col items-center bg-sidebar text-sidebar-foreground', className)}
    >
      <div className="flex h-12 w-full shrink-0 items-center justify-center border-b">
        <SidebarToggle />
      </div>
      <ul className="flex flex-col items-center gap-0.5 py-2" onKeyDown={moveFilterFocus}>
        {FILTERS.map((filter, i) => {
          const info = FILTER_INFO[filter]
          const active = search.filter === filter
          const label = `${info.title} · ${formatNumber(counts[filter])}`
          return (
            <li key={filter}>
              <RailTip label={label} shortcut={String(i + 1)}>
                <button
                  type="button"
                  tabIndex={active ? 0 : -1}
                  onClick={() => setSearch({ filter })}
                  aria-current={active ? 'page' : undefined}
                  aria-label={label}
                  aria-keyshortcuts={String(i + 1)}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                  )}
                >
                  <info.icon data-filter-icon={filter} className="size-4" />
                </button>
              </RailTip>
            </li>
          )
        })}
      </ul>
      <div className="mt-auto flex w-full flex-col items-center gap-1 border-t py-2">
        <RailTip label={host}>
          <Link
            to="/connect"
            aria-label={`Server: ${host}`}
            className="flex size-9 items-center justify-center rounded-md outline-none hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ConnectionDot />
          </Link>
        </RailTip>
        <RailTip label="Settings" shortcut=",">
          <Button variant="ghost" size="icon" asChild aria-label="Settings">
            <Link to="/settings">
              <Settings />
            </Link>
          </Button>
        </RailTip>
      </div>
    </nav>
  )
}
