import { createAtom } from '@tanstack/react-store'
import type { RowSelectionState } from '@tanstack/react-table'
import type { Torrent } from './rpc/types'

/** Something that needs extra input or confirmation before it runs. */
export type DialogRequest =
  | { type: 'add'; link?: string; files?: File[] }
  | { type: 'remove'; ids: number[]; names: string[] }
  | { type: 'rename'; torrent: Torrent }
  | { type: 'location'; torrents: Torrent[] }

export const dialogAtom = createAtom<DialogRequest | null>(null)
export const openDialog = (request: DialogRequest) => dialogAtom.set(request)
export const closeDialog = () => dialogAtom.set(null)

/** Multi-selection, keyed by torrent id (as strings, the way TanStack Table keys rows). */
export const selectionAtom = createAtom<RowSelectionState>({})
export const clearSelection = () => selectionAtom.set({})
export const selectionOf = (ids: (number | string)[]): RowSelectionState =>
  Object.fromEntries(ids.map((id) => [String(id), true as const]))
export const selectedIds = (selection: RowSelectionState) =>
  Object.keys(selection)
    .filter((id) => selection[id])
    .map(Number)

/** Select mode on touch layouts (like Mail's Edit). Desktop multi-selects with modifier keys. */
export const selectModeAtom = createAtom(false)

/** The sign-in dialog opens on 401s; this remembers that the user dismissed it. */
export const signInDismissedAtom = createAtom(false)

/** Whether the search field is open. The toolbar's field collapses to an icon, the phone/tablet
 * header reveals its search row, and "/" opens either — all share this one flag. */
export const searchOpenAtom = createAtom(false)
