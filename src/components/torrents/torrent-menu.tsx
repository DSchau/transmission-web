import { useSelector } from '@tanstack/react-store'
import { ContextMenuLabel } from '@/components/ui/context-menu'
import { DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { torrentCountLabel } from '@/lib/format'
import type { Torrent } from '@/lib/rpc/types'
import { selectedIds, selectionAtom } from '@/lib/ui'
import { ActionMenuItems, useBulkActionGroups, useTorrentActionGroups } from './actions'
import { useTorrentsView } from './torrents-view'

/**
 * Menu content for a row. Opening the menu on a row that's part of a multi-selection acts on
 * the whole selection (like Finder / Mail); otherwise on just that torrent.
 * Rendered lazily by Radix (only while open), so the hooks here don't run per row.
 */
export function TorrentMenuContent({ torrent, kind }: { torrent: Torrent; kind: 'dropdown' | 'context' }) {
  const { selected } = useTorrentsView()
  const selection = useSelector(selectionAtom)
  const bulk = selected.length > 1 && selectedIds(selection).includes(torrent.id)
  return bulk ? <BulkItems torrents={selected} kind={kind} /> : <SingleItems torrent={torrent} kind={kind} />
}

function SingleItems({ torrent, kind }: { torrent: Torrent; kind: 'dropdown' | 'context' }) {
  const groups = useTorrentActionGroups(torrent)
  return <ActionMenuItems groups={groups} kind={kind} />
}

function BulkItems({ torrents, kind }: { torrents: Torrent[]; kind: 'dropdown' | 'context' }) {
  const groups = useBulkActionGroups(torrents)
  const Label = kind === 'context' ? ContextMenuLabel : DropdownMenuLabel
  return (
    <>
      <Label>{torrentCountLabel(torrents.length)}</Label>
      {kind === 'dropdown' && <DropdownMenuSeparator />}
      <ActionMenuItems groups={groups} kind={kind} />
    </>
  )
}
