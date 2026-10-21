import { getRouteApi, useNavigate, useParams } from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'
import { functionalUpdate, type OnChangeFn, type SortingState } from '@tanstack/react-table'
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo } from 'react'
import { useTorrents, useTrackerUrls } from '@/lib/queries'
import type { Torrent } from '@/lib/rpc/types'
import { filterTorrents, isSortDesc, SORT_INFO, type TorrentSort } from '@/lib/torrent'
import { closeDialog, exitSelectMode, searchOpenAtom, selectedIds, selectionAtom, selectionOf } from '@/lib/ui'
import { HOME_SEARCH, type TorrentsSearch } from '@/routes/_torrents'
import { type TorrentTable, useTorrentTable } from './table-model'

const routeApi = getRouteApi('/_torrents')
const EMPTY: Torrent[] = []

interface TorrentsView {
  table: TorrentTable
  /** Everything the daemon has. */
  torrents: Torrent[]
  /** After filter + search (the table sorts). */
  visible: Torrent[]
  search: TorrentsSearch
  setSearch: (patch: Partial<TorrentsSearch>) => void
  /** Torrents in the multi-selection that still exist. */
  selected: Torrent[]
  openTorrentId: number | undefined
  openTorrent: (id: number) => void
  closeDetail: () => void
  /** Resets everything: closes dialogs and the detail view, clears the selection, and returns the
   * list to its default filter/sort/search. The header wordmark/title acts as the home button. */
  goHome: () => void
}

const TorrentsViewContext = createContext<TorrentsView | null>(null)

export function useTorrentsView(): TorrentsView {
  const value = useContext(TorrentsViewContext)
  if (!value) throw new Error('useTorrentsView must be used inside <TorrentsViewProvider>')
  return value
}

export function TorrentsViewProvider({ children }: { children: ReactNode }) {
  const search = routeApi.useSearch()
  const navigate = useNavigate()
  const { torrentId: openTorrentId } = useParams({ strict: false })
  const { data: torrents = EMPTY } = useTorrents()
  const selection = useSelector(selectionAtom)

  const wantsTrackers = /(^|[\s-])(trackers?|announce):/i.test(search.q)
  const { data: trackerUrls } = useTrackerUrls(wantsTrackers)
  const visible = useMemo(() => {
    if (!wantsTrackers || !trackerUrls) return filterTorrents(torrents, search.filter, search.q)
    const searchable = torrents.map((t) => ({ ...t, trackers: trackerUrls.get(t.id) }))
    // Map matches back to the originals so row identity stays stable for the table.
    const ids = new Set(filterTorrents(searchable, search.filter, search.q).map((t) => t.id))
    return torrents.filter((t) => ids.has(t.id))
  }, [torrents, trackerUrls, wantsTrackers, search.filter, search.q])

  const sorting = useMemo<SortingState>(
    () => [{ id: search.sort, desc: isSortDesc(search.sort, search.dir) }],
    [search.sort, search.dir],
  )

  const setSearch = useCallback(
    (patch: Partial<TorrentsSearch>) => navigate({ to: '.', search: (prev) => ({ ...prev, ...patch }), replace: true }),
    [navigate],
  )

  const onSortingChange: OnChangeFn<SortingState> = useCallback(
    (updater) => {
      const [next] = functionalUpdate(updater, sorting)
      if (!next) return
      const sort = next.id as TorrentSort
      // Keep the URL short: only record the direction when it isn't the sort's natural one.
      setSearch({ sort, dir: next.desc === SORT_INFO[sort].desc ? undefined : next.desc ? 'desc' : 'asc' })
    },
    [sorting, setSearch],
  )

  const table = useTorrentTable({ data: visible, sorting, onSortingChange })

  // Drop anything that no longer exists (removed here or elsewhere) from the selection.
  useEffect(() => {
    const ids = selectedIds(selectionAtom.get())
    if (ids.length === 0) return
    const existing = new Set(torrents.map((t) => t.id))
    if (ids.some((id) => !existing.has(id))) {
      selectionAtom.set(selectionOf(ids.filter((id) => existing.has(id))))
    }
  }, [torrents])

  const selected = useMemo(() => {
    const ids = selectedIds(selection)
    if (!ids.length) return EMPTY
    const byId = new Map(torrents.map((t) => [t.id, t]))
    return ids.flatMap((id) => byId.get(id) ?? [])
  }, [selection, torrents])

  const openTorrent = useCallback(
    (id: number) =>
      navigate({
        to: '/torrents/$torrentId',
        params: { torrentId: id },
        search: true,
      }),
    [navigate],
  )

  const closeDetail = useCallback(() => navigate({ to: '/', search: ({ tab: _tab, ...rest }) => rest }), [navigate])

  const goHome = useCallback(() => {
    closeDialog()
    exitSelectMode()
    searchOpenAtom.set(false)
    navigate({ to: '/', search: HOME_SEARCH, replace: true })
  }, [navigate])

  const value: TorrentsView = {
    table,
    torrents,
    visible,
    search,
    setSearch,
    selected,
    openTorrentId: openTorrentId as number | undefined,
    openTorrent,
    closeDetail,
    goHome,
  }

  return <TorrentsViewContext.Provider value={value}>{children}</TorrentsViewContext.Provider>
}
