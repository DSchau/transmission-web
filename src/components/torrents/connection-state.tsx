import { Link } from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'
import { KeyRound, Plus, SearchX, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { connectionAtom, displayNameFor } from '@/lib/connection'
import { useConnectionState } from '@/lib/queries'
import { FILTER_INFO } from '@/lib/torrent'
import { openDialog, signInDismissedAtom } from '@/lib/ui'
import { useTorrentsView } from './torrents-view'
import { useRetryConnection } from './use-summary'

/** Slim warning shown above the list when polls start failing after we had data. */
export function ConnectionBanner() {
  const state = useConnectionState()
  const retry = useRetryConnection()
  if (state.status !== 'offline') return null
  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b bg-status-checking/10 px-4 py-1.5 text-xs text-foreground"
    >
      <WifiOff className="size-3.5 shrink-0 text-status-checking" />
      <span className="min-w-0 flex-1 truncate">
        <span className="font-medium">Offline.</span> {state.message}
      </span>
      <Button size="xs" variant="ghost" onClick={retry}>
        Retry
      </Button>
    </div>
  )
}

/**
 * What the list shows when it has no rows: connecting, can't connect, sign-in needed,
 * an empty library, or no search/filter results. Returns null when there are rows.
 */
export function ListEmptyState() {
  const state = useConnectionState()
  const { torrents, visible, search, setSearch } = useTorrentsView()
  const config = useSelector(connectionAtom)
  const retry = useRetryConnection()

  if (state.status === 'connecting') {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia>
            <Spinner className="size-6" />
          </EmptyMedia>
          <EmptyDescription>Connecting to {displayNameFor(config)}…</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (state.status === 'unauthorized') {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <KeyRound />
          </EmptyMedia>
          <EmptyTitle>Sign In Required</EmptyTitle>
          <EmptyDescription>{displayNameFor(config)} needs a username and password.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={() => signInDismissedAtom.set(false)}>Sign In…</Button>
        </EmptyContent>
      </Empty>
    )
  }

  if (state.status === 'failed') {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WifiOff />
          </EmptyMedia>
          <EmptyTitle>Can’t Connect</EmptyTitle>
          <EmptyDescription>{state.message}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center">
          <Button onClick={retry}>Try Again</Button>
          <Button variant="outline" asChild>
            <Link to="/connect">Connection Settings</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  if (visible.length > 0) return null

  if (search.q) {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>No Results for “{search.q}”</EmptyTitle>
          <EmptyDescription>Check the spelling or try a new search.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={() => setSearch({ q: '' })}>
            Clear Search
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  if (torrents.length === 0) {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Plus />
          </EmptyMedia>
          <EmptyTitle>No Torrents</EmptyTitle>
          <EmptyDescription>Add a magnet link or .torrent file to get started — or drop one anywhere.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={() => openDialog({ type: 'add' })}>Add Torrent</Button>
        </EmptyContent>
      </Empty>
    )
  }

  const info = FILTER_INFO[search.filter]
  return (
    <Empty className="h-full">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <info.icon />
        </EmptyMedia>
        <EmptyTitle>No {info.title} Torrents</EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={() => setSearch({ filter: 'all' })}>
          Show All
        </Button>
      </EmptyContent>
    </Empty>
  )
}

/** True when `ListEmptyState` has something to show instead of rows. */
export function useShowsEmptyState() {
  const state = useConnectionState()
  const { visible } = useTorrentsView()
  return (
    state.status === 'connecting' ||
    state.status === 'failed' ||
    state.status === 'unauthorized' ||
    visible.length === 0
  )
}
