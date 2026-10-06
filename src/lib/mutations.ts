import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { torrentKeys } from './queries'
import type { AddTorrentArguments, FileUpdate, QueueDirection, SessionInfo, SessionUpdate, Torrent } from './rpc/types'
import { TorrentStatus } from './rpc/types'
import { isChecking, isComplete, isPaused } from './torrent'
import { useTransmission } from './transmission'

export type TorrentAction =
  | { type: 'start'; ids: number[]; now?: boolean }
  | { type: 'stop'; ids: number[] }
  | { type: 'verify'; ids: number[] }
  | { type: 'reannounce'; ids: number[] }
  | { type: 'remove'; ids: number[]; deleteData: boolean }
  | { type: 'setLocation'; ids: number[]; location: string; move: boolean }
  | { type: 'rename'; id: number; path: string; name: string }
  | { type: 'queue'; ids: number[]; direction: QueueDirection }
  | { type: 'files'; id: number; update: FileUpdate }

const idsOf = (action: TorrentAction) => ('ids' in action ? action.ids : [action.id])

/**
 * One mutation for every torrent action: applies an optimistic change to the cached list,
 * registers it with `PendingChanges` (so stale polls don't undo it), runs the RPC, then refetches.
 */
export function useTorrentMutation() {
  const transmission = useTransmission()
  const { client, pending } = transmission
  const queryClient = useQueryClient()
  const listKey = torrentKeys.list(transmission)

  return useMutation({
    mutationFn: async (action: TorrentAction) => {
      switch (action.type) {
        case 'start':
          return client.start(action.ids, action.now)
        case 'stop':
          return client.stop(action.ids)
        case 'verify':
          return client.verify(action.ids)
        case 'reannounce':
          return client.reannounce(action.ids)
        case 'remove':
          return client.remove(action.ids, action.deleteData)
        case 'setLocation':
          return client.setLocation(action.ids, action.location, action.move)
        case 'rename':
          return client.rename(action.id, action.path, action.name)
        case 'queue':
          return client.moveInQueue(action.ids, action.direction)
        case 'files':
          return client.setFiles(action.id, action.update)
      }
    },

    onMutate: async (action) => {
      if (action.type === 'files') {
        const detailKey = torrentKeys.detail(transmission, action.id)
        await queryClient.cancelQueries({ queryKey: detailKey })
        queryClient.setQueryData<Torrent | null>(detailKey, (t) => t && applyFileUpdate(t, action.update))
        return
      }
      const update = optimisticUpdate(action, pending, queryClient.getQueryData<Torrent[]>(listKey))
      if (!update) return
      // Don't let an in-flight poll land on top of the optimistic state.
      await queryClient.cancelQueries({ queryKey: listKey })
      queryClient.setQueryData<Torrent[]>(listKey, update)
    },

    onError: (error, action) => {
      pending.discard(idsOf(action))
      toast.error('Something went wrong', { description: error.message })
    },

    onSettled: (_data, _error, action) => {
      queryClient.invalidateQueries({ queryKey: listKey })
      if (action.type === 'files' || action.type === 'rename') {
        queryClient.invalidateQueries({ queryKey: torrentKeys.detail(transmission, action.id) })
      }
    },
  })
}

function applyFileUpdate(t: Torrent, update: FileUpdate): Torrent {
  if (!t.fileStats) return t
  const patch = (indexes: number[] | undefined, change: Partial<{ wanted: boolean; priority: number }>) => {
    for (const i of indexes ?? []) if (fileStats[i]) fileStats[i] = { ...fileStats[i], ...change }
  }
  const fileStats = [...t.fileStats]
  patch(update.wanted, { wanted: true })
  patch(update.unwanted, { wanted: false })
  patch(update.priorityHigh, { priority: 1 })
  patch(update.priorityNormal, { priority: 0 })
  patch(update.priorityLow, { priority: -1 })
  return { ...t, fileStats }
}

function optimisticUpdate(
  action: TorrentAction,
  pending: ReturnType<typeof useTransmission>['pending'],
  current: Torrent[] | undefined,
): ((list: Torrent[] | undefined) => Torrent[] | undefined) | null {
  const resumed = (t: Torrent): Torrent => ({
    ...t,
    status: isComplete(t) ? TorrentStatus.Seeding : TorrentStatus.Downloading,
  })

  switch (action.type) {
    case 'start':
      return pending.change(action.ids, resumed, (t) => !isPaused(t))
    case 'stop':
      return pending.change(
        action.ids,
        (t) => ({ ...t, status: TorrentStatus.Stopped, rateDownload: 0, rateUpload: 0 }),
        isPaused,
      )
    case 'verify': {
      // Verification can finish quickly, so any change from the old state counts as confirmed.
      const before = new Map(current?.map((t) => [t.id, t.status]))
      return pending.change(
        action.ids,
        (t) => ({ ...t, status: TorrentStatus.CheckWait }),
        (t) => isChecking(t) || t.status !== before.get(t.id),
      )
    }
    case 'remove':
      return pending.remove(action.ids)
    case 'setLocation':
      return pending.change(
        action.ids,
        (t) => ({ ...t, downloadDir: action.location }),
        (t) => t.downloadDir === action.location,
      )
    case 'rename':
      if (current?.find((t) => t.id === action.id)?.name !== action.path) return null
      return pending.change(
        [action.id],
        (t) => ({ ...t, name: action.name }),
        (t) => t.name === action.name,
      )
    default:
      return null
  }
}

/** Convenience wrappers so call sites read like the iOS store's API. */
export function useTorrentActions() {
  const { mutate } = useTorrentMutation()
  return {
    resume: (ids: number[]) => {
      if (ids.length) mutate({ type: 'start', ids })
    },
    /** Starts immediately, bypassing the download queue. */
    resumeNow: (ids: number[]) => {
      if (ids.length) mutate({ type: 'start', ids, now: true })
    },
    pause: (ids: number[]) => {
      if (ids.length) mutate({ type: 'stop', ids })
    },
    togglePaused: (t: Torrent) => mutate(isPaused(t) ? { type: 'start', ids: [t.id] } : { type: 'stop', ids: [t.id] }),
    verify: (ids: number[]) => mutate({ type: 'verify', ids }),
    reannounce: (ids: number[]) => {
      mutate({ type: 'reannounce', ids })
      toast.success(ids.length === 1 ? 'Asked tracker for more peers' : 'Asked trackers for more peers')
    },
    remove: (ids: number[], deleteData: boolean) => mutate({ type: 'remove', ids, deleteData }),
    setLocation: (ids: number[], location: string, move: boolean) =>
      mutate({ type: 'setLocation', ids, location, move }),
    rename: (t: Torrent, name: string) => mutate({ type: 'rename', id: t.id, path: t.name, name }),
    renamePath: (id: number, path: string, name: string) => mutate({ type: 'rename', id, path, name }),
    moveInQueue: (ids: number[], direction: QueueDirection) => mutate({ type: 'queue', ids, direction }),
    setFiles: (id: number, update: FileUpdate) => mutate({ type: 'files', id, update }),
  }
}

/** `session-set` with an optimistic update of the cached session. */
export function useSessionMutation() {
  const transmission = useTransmission()
  const queryClient = useQueryClient()
  const key = torrentKeys.session(transmission)

  return useMutation({
    mutationFn: (update: SessionUpdate) => transmission.client.updateSession(update),
    onMutate: async (update) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<SessionInfo>(key)
      if (previous) queryClient.setQueryData<SessionInfo>(key, { ...previous, ...update })
      return { previous }
    },
    onError: (error, _update, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
      toast.error('Couldn’t update settings', { description: error.message })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

export function useAddTorrent() {
  const transmission = useTransmission()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: AddTorrentArguments) => transmission.client.add(args),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: torrentKeys.list(transmission) }),
  })
}
