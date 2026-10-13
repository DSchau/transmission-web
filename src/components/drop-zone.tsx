import { useSelector } from '@tanstack/react-store'
import { FileUp } from 'lucide-react'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { fileDragAtom, openDialog } from '@/lib/ui'
import { cn, isMagnetOrUrl, isTorrentFile } from '@/lib/utils'

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName))

const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false

/**
 * Web niceties in place of iOS's "Open in…": drop .torrent files anywhere in the window, or paste a
 * magnet link / URL anywhere outside a text field, to start adding it. Mounted once; the torrent
 * list shows where to drop with `<DropOverlay />`.
 */
export function DropZone() {
  useEffect(() => {
    // dragenter/dragleave fire for every element crossed, so count them to know when the drag
    // has really left the window.
    let depth = 0
    const end = () => {
      depth = 0
      fileDragAtom.set(false)
    }

    const onDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return
      depth++
      fileDragAtom.set(true)
    }
    const onDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) end()
    }
    const onDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) return
      // Accept the drop anywhere, not only over the list.
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
    }
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      end()
      const dropped = Array.from(event.dataTransfer?.files ?? [])
      const files = dropped.filter(isTorrentFile)
      if (files.length) openDialog({ type: 'add', files })
      else if (dropped.length) {
        toast.error(
          dropped.length === 1 ? `“${dropped[0]?.name}” isn’t a .torrent file.` : 'Those aren’t .torrent files.',
        )
      }
    }
    const onPaste = (event: ClipboardEvent) => {
      if (isEditable(event.target) || document.querySelector('[role="dialog"]')) return
      const text = event.clipboardData?.getData('text/plain')?.trim()
      if (text && isMagnetOrUrl(text)) {
        event.preventDefault()
        openDialog({ type: 'add', link: text })
      }
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    window.addEventListener('dragend', end)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('dragend', end)
      window.removeEventListener('paste', onPaste)
    }
  }, [])

  return null
}

/** The visible drop target while files are dragged over the window. Place inside a `relative` box. */
export function DropOverlay({ className }: { className?: string }) {
  const dragging = useSelector(fileDragAtom)
  if (!dragging) return null
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-background/80 p-3 backdrop-blur-sm animate-in fade-in-0',
        className,
      )}
    >
      <div className="flex size-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-status-downloading/50 border-dashed bg-status-downloading/5 p-6 text-center">
        <FileUp className="size-10 text-status-downloading" />
        <div>
          <p className="font-semibold text-lg">Drop to Add</p>
          <p className="text-muted-foreground text-sm">.torrent files are added to Transmission</p>
        </div>
      </div>
    </div>
  )
}
