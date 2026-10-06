import { useNavigate, useParams } from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'
import { Folder } from 'lucide-react'
import { useId, useState } from 'react'
import { ResponsiveDialog } from '@/components/responsive-dialog'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { torrentCountLabel } from '@/lib/format'
import { useTorrentActions } from '@/lib/mutations'
import { useSession, useTorrents } from '@/lib/queries'
import type { Torrent } from '@/lib/rpc/types'
import { clearSelection, closeDialog, type DialogRequest, dialogAtom, selectModeAtom } from '@/lib/ui'
import { AddTorrentDialog } from './add-torrent-dialog'

/** Presents whatever `dialogAtom` asks for. Mounted once, at the root. */
export function GlobalDialogs() {
  const request = useSelector(dialogAtom)
  // Keep the last request around while the close animation runs.
  const [last, setLast] = useState<DialogRequest | null>(request)
  if (request && request !== last) setLast(request)
  const shown = request ?? last
  const onOpenChange = (open: boolean) => {
    if (!open) closeDialog()
  }

  return (
    <>
      <AddTorrentDialog
        open={request?.type === 'add'}
        onOpenChange={onOpenChange}
        initialLink={shown?.type === 'add' ? shown.link : undefined}
        initialFiles={shown?.type === 'add' ? shown.files : undefined}
      />
      <RemoveDialog
        open={request?.type === 'remove'}
        onOpenChange={onOpenChange}
        request={shown?.type === 'remove' ? shown : null}
      />
      <RenameDialog
        open={request?.type === 'rename'}
        onOpenChange={onOpenChange}
        torrent={shown?.type === 'rename' ? shown.torrent : null}
      />
      <SetLocationDialog
        open={request?.type === 'location'}
        onOpenChange={onOpenChange}
        torrents={shown?.type === 'location' ? shown.torrents : []}
      />
    </>
  )
}

// MARK: Remove

function RemoveDialog({
  open,
  onOpenChange,
  request,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: Extract<DialogRequest, { type: 'remove' }> | null
}) {
  const { remove } = useTorrentActions()
  const navigate = useNavigate()
  const { torrentId } = useParams({ strict: false })
  const ids = request?.ids ?? []
  const title = ids.length === 1 ? `Remove “${request?.names[0] ?? ''}”?` : `Remove ${torrentCountLabel(ids.length)}?`

  const confirm = (deleteData: boolean) => {
    remove(ids, deleteData)
    clearSelection()
    selectModeAtom.set(false)
    if (torrentId != null && ids.includes(Number(torrentId))) navigate({ to: '/' })
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="break-words">{title}</AlertDialogTitle>
          <AlertDialogDescription>Removing from the list keeps downloaded files on the server.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:flex-wrap">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="outline" onClick={() => confirm(false)}>
            Remove From List
          </Button>
          <Button variant="destructive" onClick={() => confirm(true)}>
            Trash Data and Remove
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// MARK: Rename

function RenameDialog({
  open,
  onOpenChange,
  torrent,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  torrent: Torrent | null
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Rename Torrent"
      description="This renames the torrent’s top-level file or folder on the server."
    >
      {torrent && <RenameForm torrent={torrent} onDone={() => onOpenChange(false)} />}
    </ResponsiveDialog>
  )
}

function RenameForm({ torrent, onDone }: { torrent: Torrent; onDone: () => void }) {
  const { rename } = useTorrentActions()
  const id = useId()
  const [name, setName] = useState(torrent.name)
  const trimmed = name.trim()
  const error = trimmed.includes('/') ? 'Names can’t contain “/”.' : null
  const canSave = trimmed !== '' && trimmed !== torrent.name && !error

  return (
    <form
      className="pb-4 md:pb-0"
      onSubmit={(event) => {
        event.preventDefault()
        if (!canSave) return
        rename(torrent, trimmed)
        onDone()
      }}
    >
      <FieldGroup>
        <Field data-invalid={!!error}>
          <FieldLabel htmlFor={id}>Name</FieldLabel>
          <Input
            id={id}
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={!!error}
          />
          {error && <FieldError>{error}</FieldError>}
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSave}>
            Rename
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

// MARK: Set Location

function SetLocationDialog({
  open,
  onOpenChange,
  torrents,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  torrents: Torrent[]
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Set Location"
      description={torrents.length === 1 ? torrents[0]?.name : torrentCountLabel(torrents.length)}
    >
      {torrents.length > 0 && <SetLocationForm torrents={torrents} onDone={() => onOpenChange(false)} />}
    </ResponsiveDialog>
  )
}

const selectLocations = (torrents: Torrent[]) => torrents.map((t) => t.downloadDir)

function SetLocationForm({ torrents, onDone }: { torrents: Torrent[]; onDone: () => void }) {
  const { setLocation } = useTorrentActions()
  const { data: session } = useSession()
  const { data: dirs = [] } = useTorrents(selectLocations)
  const id = useId()
  const current = torrents[0]?.downloadDir ?? ''
  const [location, setLocationText] = useState(current)
  const [move, setMove] = useState(true)
  const trimmed = location.trim()
  const unchanged = torrents.every((t) => t.downloadDir === trimmed)

  // Every folder currently in use — handy suggestions.
  const suggestions = [...new Set([session?.['download-dir'] ?? '', ...dirs])].filter((dir) => dir && dir !== trimmed)

  return (
    <form
      className="pb-4 md:pb-0"
      onSubmit={(event) => {
        event.preventDefault()
        if (!trimmed || unchanged) return
        setLocation(
          torrents.map((t) => t.id),
          trimmed,
          move,
        )
        onDone()
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={id}>Location</FieldLabel>
          <Input
            id={id}
            autoFocus
            className="font-mono text-xs"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="/path/to/folder"
            value={location}
            onChange={(event) => setLocationText(event.target.value)}
          />
        </Field>
        <Field orientation="horizontal">
          <div className="flex flex-1 flex-col gap-1">
            <FieldLabel htmlFor={`${id}-move`}>Move Data</FieldLabel>
            <FieldDescription>
              {move
                ? 'Files will be moved from the current folder to the new location.'
                : 'Transmission will look for existing files in the new location.'}
            </FieldDescription>
          </div>
          <Switch id={`${id}-move`} checked={move} onCheckedChange={setMove} />
        </Field>
        {suggestions.length > 0 && (
          <Field>
            <FieldLabel>Recent Folders</FieldLabel>
            <ul className="max-h-40 divide-y overflow-y-auto rounded-lg border">
              {suggestions.slice(0, 12).map((dir) => (
                <li key={dir}>
                  <button
                    type="button"
                    onClick={() => setLocationText(dir)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-xs hover:bg-muted"
                  >
                    <Folder className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{dir}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Field>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={!trimmed || unchanged}>
            {move ? 'Move' : 'Apply'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
