import { queryOptions, useQuery } from '@tanstack/react-query'
import { useSelector } from '@tanstack/react-store'
import { preferencesAtom } from './preferences'
import { isUnauthorized } from './rpc/client'
import { DETAIL_FIELDS, LIST_FIELDS, type SessionInfo, type Torrent } from './rpc/types'
import { type Transmission, useTransmission } from './transmission'

/**
 * Failures tolerated before showing an error: daemons can briefly refuse connections, so don't
 * flash an error for that. Auth errors won't fix themselves, so surface those immediately.
 */
const retry = (failureCount: number, error: Error) => !isUnauthorized(error) && failureCount < 2

export const torrentKeys = {
  session: (t: Transmission) => [...t.key, 'session'] as const,
  list: (t: Transmission) => [...t.key, 'torrents'] as const,
  detail: (t: Transmission, id: number) => [...t.key, 'torrent', id] as const,
}

export const sessionQuery = (t: Transmission) =>
  queryOptions({
    queryKey: torrentKeys.session(t),
    queryFn: ({ signal }) => t.client.session(signal),
    // Session settings change rarely.
    refetchInterval: 20_000,
    retry,
    retryDelay: 1000,
  })

export const torrentsQuery = (t: Transmission, intervalSeconds: number) =>
  queryOptions({
    queryKey: torrentKeys.list(t),
    // Every poll goes through `reconcile`, so unconfirmed optimistic changes aren't undone by stale data.
    queryFn: async ({ signal }) => t.pending.reconcile(await t.client.torrents(LIST_FIELDS, undefined, signal)),
    // React Query pauses this while the tab is hidden and refetches on focus — no background polling.
    refetchInterval: intervalSeconds * 1000,
    retry,
    retryDelay: 1000,
  })

export function useSession() {
  const transmission = useTransmission()
  return useQuery(sessionQuery(transmission))
}

/**
 * The polled torrent list. Waits for the session so first contact does a single session-id
 * handshake, and auth problems surface once.
 */
export function useTorrents<TData = Torrent[]>(select?: (torrents: Torrent[]) => TData) {
  const transmission = useTransmission()
  const interval = useSelector(preferencesAtom, (p) => p.refreshInterval)
  const session = useSession()
  return useQuery({ ...torrentsQuery(transmission, interval), select, enabled: session.data != null })
}

/** Files, peers, trackers and pieces for one torrent, merged with the live list entry. */
export function useTorrentDetail(id: number) {
  const transmission = useTransmission()
  const interval = useSelector(preferencesAtom, (p) => p.refreshInterval)
  const live = useTorrents((torrents) => torrents.find((t) => t.id === id))
  const session = useSession()
  const detail = useQuery({
    enabled: session.data != null,
    queryKey: torrentKeys.detail(transmission, id),
    queryFn: async ({ signal }) => (await transmission.client.torrents(DETAIL_FIELDS, [id], signal))[0] ?? null,
    // Detail data changes slower; poll a bit less aggressively.
    refetchInterval: Math.max(interval, 2) * 1000,
    retry,
  })

  // Prefer the freshest data: the detail fetch has files/peers, the list poll has live rates
  // (and any pending optimistic changes).
  const torrent: Torrent | null | undefined =
    live.data && detail.data ? { ...detail.data, ...live.data } : (live.data ?? detail.data)

  return {
    torrent,
    hasDetail: detail.data != null,
    isPending: live.isPending && detail.isPending,
    /** True when the torrent no longer exists (removed here or elsewhere). */
    isMissing: live.isSuccess && !live.data && detail.isFetched && !detail.data,
  }
}

export type ConnectionState =
  | { status: 'connecting' }
  | { status: 'connected'; session: SessionInfo }
  | { status: 'unauthorized'; message: string }
  | { status: 'failed'; message: string }
  /** Had data, but the latest polls failed. */
  | { status: 'offline'; session: SessionInfo; message: string }

const selectNothing = () => null

export function useConnectionState(): ConnectionState {
  const session = useSession()
  const torrents = useTorrents(selectNothing)
  const error = session.error ?? torrents.error

  if (error && isUnauthorized(error)) return { status: 'unauthorized', message: error.message }
  if (!session.data || torrents.isPending) {
    return error ? { status: 'failed', message: error.message } : { status: 'connecting' }
  }
  if (error) return { status: 'offline', session: session.data, message: error.message }
  return { status: 'connected', session: session.data }
}
