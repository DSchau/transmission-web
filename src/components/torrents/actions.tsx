import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Copy,
  FastForward,
  Folder,
  Link,
  ListOrdered,
  type LucideIcon,
  Pause,
  Pencil,
  Play,
  RadioTower,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { Fragment } from 'react'
import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu'
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import { copyText } from '@/lib/clipboard'
import { torrentCountLabel } from '@/lib/format'
import { useTorrentActions } from '@/lib/mutations'
import type { Torrent } from '@/lib/rpc/types'
import { isPaused } from '@/lib/torrent'
import { useTransmission } from '@/lib/transmission'
import { openDialog } from '@/lib/ui'

export interface ActionItem {
  id: string
  label: string
  icon: LucideIcon
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
  shortcut?: string
}

export interface ActionSubmenu {
  id: string
  label: string
  icon: LucideIcon
  items: ActionItem[]
}

export type ActionGroup = (ActionItem | ActionSubmenu)[]

const isSubmenu = (item: ActionItem | ActionSubmenu): item is ActionSubmenu => 'items' in item

/** Mirrors the Transmission web UI's context menu (and the iOS app's long-press menu). */
export function useTorrentActionGroups(torrent: Torrent, { includePauseResume = true } = {}): ActionGroup[] {
  const actions = useTorrentActions()
  const { client } = useTransmission()
  const ids = [torrent.id]
  const paused = isPaused(torrent)

  const lifecycle: ActionGroup = []
  if (paused) {
    if (includePauseResume)
      lifecycle.push({ id: 'resume', label: 'Resume', icon: Play, onSelect: () => actions.resume(ids) })
    lifecycle.push({ id: 'resume-now', label: 'Resume Now', icon: FastForward, onSelect: () => actions.resumeNow(ids) })
  } else if (includePauseResume) {
    lifecycle.push({ id: 'pause', label: 'Pause', icon: Pause, onSelect: () => actions.pause(ids) })
  }

  return [
    lifecycle,
    [
      { id: 'rename', label: 'Rename…', icon: Pencil, onSelect: () => openDialog({ type: 'rename', torrent }) },
      {
        id: 'location',
        label: 'Set Location…',
        icon: Folder,
        onSelect: () => openDialog({ type: 'location', torrents: [torrent] }),
      },
      queueSubmenu(actions, ids),
    ],
    [
      { id: 'verify', label: 'Verify Local Data', icon: ShieldCheck, onSelect: () => actions.verify(ids) },
      {
        id: 'reannounce',
        label: 'Ask Tracker for More Peers',
        icon: RadioTower,
        onSelect: () => actions.reannounce(ids),
      },
    ],
    [
      {
        id: 'copy-magnet',
        label: 'Copy Magnet Link',
        icon: Link,
        // Magnet links aren't part of the list payload (they're long); fetch on demand.
        onSelect: async () => {
          const link = torrent.magnetLink ?? (await client.magnetLink(torrent.id).catch(() => undefined))
          if (link) copyText(link, 'Magnet link copied')
        },
      },
      { id: 'copy-name', label: 'Copy Name', icon: Copy, onSelect: () => copyText(torrent.name, 'Name copied') },
    ],
    [
      {
        id: 'remove',
        label: 'Remove…',
        icon: Trash2,
        destructive: true,
        shortcut: '⌫',
        onSelect: () => openDialog({ type: 'remove', ids, names: [torrent.name] }),
      },
    ],
  ].filter((group) => group.length > 0)
}

/** Actions for a multi-selection. */
export function useBulkActionGroups(torrents: Torrent[]): ActionGroup[] {
  const actions = useTorrentActions()
  const ids = torrents.map((t) => t.id)
  const paused = torrents.filter(isPaused).map((t) => t.id)
  const running = torrents.filter((t) => !isPaused(t)).map((t) => t.id)

  return [
    [
      {
        id: 'resume',
        label: 'Resume',
        icon: Play,
        disabled: paused.length === 0,
        onSelect: () => actions.resume(paused),
      },
      {
        id: 'pause',
        label: 'Pause',
        icon: Pause,
        disabled: running.length === 0,
        onSelect: () => actions.pause(running),
      },
    ],
    [
      {
        id: 'location',
        label: 'Set Location…',
        icon: Folder,
        onSelect: () => openDialog({ type: 'location', torrents }),
      },
      queueSubmenu(actions, ids),
    ],
    [
      { id: 'verify', label: 'Verify Local Data', icon: ShieldCheck, onSelect: () => actions.verify(ids) },
      {
        id: 'reannounce',
        label: 'Ask Trackers for More Peers',
        icon: RadioTower,
        onSelect: () => actions.reannounce(ids),
      },
      {
        id: 'copy-names',
        label: 'Copy Names',
        icon: Copy,
        onSelect: () => copyText(torrents.map((t) => t.name).join('\n'), 'Names copied'),
      },
    ],
    [
      {
        id: 'remove',
        label: `Remove ${torrentCountLabel(ids.length)}…`,
        icon: Trash2,
        destructive: true,
        shortcut: '⌫',
        onSelect: () => openDialog({ type: 'remove', ids, names: torrents.map((t) => t.name) }),
      },
    ],
  ]
}

function queueSubmenu(actions: ReturnType<typeof useTorrentActions>, ids: number[]): ActionSubmenu {
  return {
    id: 'queue',
    label: 'Queue',
    icon: ListOrdered,
    items: [
      { id: 'top', label: 'Move to Top', icon: ArrowUpToLine, onSelect: () => actions.moveInQueue(ids, 'top') },
      { id: 'up', label: 'Move Up', icon: ArrowUp, onSelect: () => actions.moveInQueue(ids, 'up') },
      { id: 'down', label: 'Move Down', icon: ArrowDown, onSelect: () => actions.moveInQueue(ids, 'down') },
      {
        id: 'bottom',
        label: 'Move to Bottom',
        icon: ArrowDownToLine,
        onSelect: () => actions.moveInQueue(ids, 'bottom'),
      },
    ],
  }
}

// MARK: Renderers

const PARTS = {
  dropdown: {
    Item: DropdownMenuItem,
    Separator: DropdownMenuSeparator,
    Shortcut: DropdownMenuShortcut,
    Sub: DropdownMenuSub,
    SubTrigger: DropdownMenuSubTrigger,
    SubContent: DropdownMenuSubContent,
  },
  context: {
    Item: ContextMenuItem,
    Separator: ContextMenuSeparator,
    Shortcut: ContextMenuShortcut,
    Sub: ContextMenuSub,
    SubTrigger: ContextMenuSubTrigger,
    SubContent: ContextMenuSubContent,
  },
} as const

/** Renders action groups as dropdown-menu or context-menu items. */
export function ActionMenuItems({ groups, kind }: { groups: ActionGroup[]; kind: keyof typeof PARTS }) {
  const { Item, Separator, Shortcut, Sub, SubTrigger, SubContent } = PARTS[kind]
  return groups.map((group, index) => (
    <Fragment key={group[0]?.id ?? index}>
      {index > 0 && <Separator />}
      {group.map((item) =>
        isSubmenu(item) ? (
          <Sub key={item.id}>
            <SubTrigger>
              <item.icon />
              {item.label}
            </SubTrigger>
            <SubContent>
              {item.items.map((sub) => (
                <Item key={sub.id} onSelect={sub.onSelect} disabled={sub.disabled}>
                  <sub.icon />
                  {sub.label}
                </Item>
              ))}
            </SubContent>
          </Sub>
        ) : (
          <Item
            key={item.id}
            onSelect={item.onSelect}
            disabled={item.disabled}
            variant={item.destructive ? 'destructive' : 'default'}
          >
            <item.icon />
            {item.label}
            {item.shortcut && <Shortcut>{item.shortcut}</Shortcut>}
          </Item>
        ),
      )}
    </Fragment>
  ))
}
