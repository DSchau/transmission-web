import { useForm } from '@tanstack/react-form'
import { useSelector } from '@tanstack/react-store'
import { ClipboardPaste, FileUp, Link2, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ResponsiveDialog } from '@/components/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useHasFinePointer } from '@/hooks/use-media-query'
import { connectionAtom, rpcUrlFor } from '@/lib/connection'
import { useAddTorrent } from '@/lib/mutations'
import { persistedAtom, safeSessionStorage } from '@/lib/persisted'
import { useSession } from '@/lib/queries'
import type { AddTorrentArguments } from '@/lib/rpc/types'
import { fileToBase64, isMagnetOrUrl, isTorrentFile, torrentFileAccept } from '@/lib/utils'

/**
 * The folder the last torrent was added to, so adding several to the same place doesn't mean
 * retyping it. Tab-scoped (sessionStorage) and tied to the server it was used on; `dir: ''` means
 * the daemon's default.
 */
const lastDownloadDirAtom = persistedAtom(
  'transmission-web.last-download-dir',
  { server: '', dir: '' },
  safeSessionStorage(),
)

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialLink?: string
  initialFiles?: File[]
}

export function AddTorrentDialog({ open, onOpenChange, initialLink, initialFiles }: Props) {
  const formId = useId()
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add Torrent"
      description="Paste a magnet link or URL, or choose .torrent files."
    >
      <AddTorrentForm
        // Start over when something new is dropped or pasted while the dialog is already open.
        key={[
          initialLink,
          ...(initialFiles ?? []).map((file) => `${file.name}:${file.size}:${file.lastModified}`),
        ].join('\n')}
        formId={formId}
        initialLink={initialLink}
        initialFiles={initialFiles}
        onDone={() => onOpenChange(false)}
      />
    </ResponsiveDialog>
  )
}

function AddTorrentForm({
  formId,
  initialLink = '',
  initialFiles = [],
  onDone,
}: {
  formId: string
  initialLink?: string
  initialFiles?: File[]
  onDone: () => void
}) {
  const { data: session } = useSession()
  const server = rpcUrlFor(useSelector(connectionAtom))
  const lastDir = useSelector(lastDownloadDirAtom)
  const { mutateAsync: add } = useAddTorrent()
  const fileInput = useRef<HTMLInputElement>(null)
  // On touch screens the keyboard would cover the sheet (and the file button) before you've chosen.
  const hasFinePointer = useHasFinePointer()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      link: initialLink,
      files: initialFiles,
      downloadDir: (lastDir.server === server && lastDir.dir) || session?.['download-dir'] || '',
      start: session?.['start-added-torrents'] ?? true,
    },
    validators: {
      onSubmit: ({ value }) =>
        value.files.length === 0 && !value.link.trim()
          ? { fields: { link: 'Enter a magnet link or URL, or choose a file.' } }
          : undefined,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null)
      const base: AddTorrentArguments = { paused: !value.start }
      const dir = value.downloadDir.trim()
      if (dir && dir !== session?.['download-dir']) base['download-dir'] = dir

      const requests: { label: string; args: () => Promise<AddTorrentArguments> }[] =
        value.files.length > 0
          ? value.files.map((file) => ({
              label: file.name,
              args: async () => ({ ...base, metainfo: await fileToBase64(file) }),
            }))
          : [{ label: value.link.trim(), args: async () => ({ ...base, filename: value.link.trim() }) }]

      const added: string[] = []
      const problems: string[] = []
      for (const request of requests) {
        try {
          const result = await add(await request.args())
          if (result.kind === 'added') added.push(result.torrent.name)
          else problems.push(`“${result.torrent.name}” has already been added.`)
        } catch (error) {
          problems.push(
            requests.length > 1 ? `${request.label}: ${(error as Error).message}` : (error as Error).message,
          )
        }
      }

      if (added.length > 0) {
        lastDownloadDirAtom.set({ server, dir: base['download-dir'] ?? '' })
        toast.success(added.length === 1 ? `Added “${added[0]}”` : `Added ${added.length} torrents`)
      }
      if (problems.length > 0) setSubmitError(problems.join('\n'))
      else onDone()
    },
  })

  return (
    <form
      id={formId}
      onSubmit={(event) => {
        event.preventDefault()
        form.handleSubmit()
      }}
      className="pb-4 md:pb-0"
    >
      <FieldGroup>
        <form.Field name="files">
          {(filesField) =>
            filesField.state.value.length > 0 ? (
              <Field>
                <FieldLabel>Torrent Files</FieldLabel>
                <ul className="divide-y rounded-lg border">
                  {filesField.state.value.map((file, index) => (
                    <li
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      className="flex items-center gap-2 py-1.5 pr-1.5 pl-3 text-sm"
                    >
                      <FileUp className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Remove ${file.name}`}
                        onClick={() => filesField.removeValue(index)}
                      >
                        <X />
                      </Button>
                    </li>
                  ))}
                </ul>
              </Field>
            ) : (
              <form.Field name="link">
                {(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor={`${formId}-link`}>
                      <Link2 className="size-4" /> Magnet Link or URL
                    </FieldLabel>
                    <Textarea
                      id={`${formId}-link`}
                      autoFocus={hasFinePointer}
                      rows={3}
                      placeholder="magnet:?xt=… or https://…"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      className="resize-none break-all font-mono text-base md:text-xs"
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      onBlur={field.handleBlur}
                      aria-invalid={field.state.meta.errors.length > 0}
                    />
                    <FieldError errors={field.state.meta.errors.map((message) => ({ message: String(message) }))} />
                    <div className="flex flex-wrap gap-2">
                      {'clipboard' in navigator && window.isSecureContext && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const text = await navigator.clipboard.readText().catch(() => '')
                            if (text) field.handleChange(text.trim())
                          }}
                        >
                          <ClipboardPaste data-icon="inline-start" /> Paste
                        </Button>
                      )}
                      <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                        <FileUp data-icon="inline-start" /> Choose .torrent Files…
                      </Button>
                      {field.state.value && !isMagnetOrUrl(field.state.value) && (
                        <span className="self-center text-muted-foreground text-xs">
                          Doesn’t look like a magnet link or URL.
                        </span>
                      )}
                    </div>
                  </Field>
                )}
              </form.Field>
            )
          }
        </form.Field>

        <input
          ref={fileInput}
          type="file"
          accept={torrentFileAccept()}
          multiple
          hidden
          onChange={(event) => {
            const chosen = Array.from(event.target.files ?? [])
            event.target.value = ''
            const files = chosen.filter(isTorrentFile)
            // The picker can't always filter (see torrentFileAccept), so say what was left out.
            const skipped = chosen.filter((file) => !isTorrentFile(file))
            if (skipped.length > 0) {
              toast.error(
                skipped.length === 1
                  ? `“${skipped[0]?.name}” isn’t a .torrent file.`
                  : `${skipped.length} of the chosen files aren’t .torrent files.`,
              )
            }
            if (files.length) form.setFieldValue('files', files)
          }}
        />

        <form.Field name="downloadDir">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={`${formId}-dir`}>Download To</FieldLabel>
              <Input
                id={`${formId}-dir`}
                className="font-mono text-base md:text-xs"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Default folder"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="start">
          {(field) => (
            <Field orientation="horizontal">
              <FieldLabel htmlFor={`${formId}-start`} className="flex-1">
                Start When Added
              </FieldLabel>
              <Switch id={`${formId}-start`} checked={field.state.value} onCheckedChange={field.handleChange} />
            </Field>
          )}
        </form.Field>

        {submitError && (
          <FieldDescription className="whitespace-pre-line text-destructive">{submitError}</FieldDescription>
        )}

        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onDone}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner data-icon="inline-start" />}
                Add
              </Button>
            </div>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  )
}
