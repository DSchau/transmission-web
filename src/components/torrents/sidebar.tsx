import { Link } from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'
import { ArrowDownCircle, Settings } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { connectionAtom, displayNameFor } from '@/lib/connection'
import { formatNumber } from '@/lib/format'
import { useConnectionState } from '@/lib/queries'
import { countByFilter, FILTER_INFO, FILTERS } from '@/lib/torrent'
import { cn } from '@/lib/utils'
import { useTorrentsView } from './torrents-view'

/** Desktop filter sidebar (like Mail's mailboxes). */
export function Sidebar({ className }: { className?: string }) {
  const { torrents, search, setSearch } = useTorrentsView()
  const counts = useMemo(() => countByFilter(torrents), [torrents])
  const config = useSelector(connectionAtom)
  const state = useConnectionState()

  return (
    <nav aria-label="Filters" className={cn('flex flex-col bg-sidebar text-sidebar-foreground', className)}>
      <div className="flex h-12 items-center gap-2 border-b px-4">
        <ArrowDownCircle className="size-5 text-status-downloading" />
        <span className="font-semibold">Transmission</span>
      </div>
      <ul className="flex flex-col gap-0.5 p-2">
        {FILTERS.map((filter) => {
          const info = FILTER_INFO[filter]
          const active = search.filter === filter
          return (
            <li key={filter}>
              <button
                type="button"
                onClick={() => setSearch({ filter })}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60',
                )}
              >
                <info.icon className={cn('size-4', active ? 'text-foreground' : 'text-muted-foreground')} />
                <span className="flex-1 text-left">{info.title}</span>
                <span className="text-muted-foreground text-xs tabular-nums">{formatNumber(counts[filter])}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="mt-auto flex items-center gap-2 border-t p-2 pl-4">
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
        <Link to="/connect" className="min-w-0 flex-1 truncate text-muted-foreground text-xs hover:text-foreground">
          {displayNameFor(config)}
          {state.status === 'connected' && ` · ${state.session.version.split(' ')[0]}`}
        </Link>
        <Button variant="ghost" size="icon-sm" asChild aria-label="Settings">
          <Link to="/settings">
            <Settings />
          </Link>
        </Button>
      </div>
    </nav>
  )
}
