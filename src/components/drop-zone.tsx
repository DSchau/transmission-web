import { FileUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { openDialog } from '@/lib/ui'
import { isMagnetOrUrl, isTorrentFile } from '@/lib/utils'

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName))

/**
 * Web niceties in place of iOS's "Open in…": drop .torrent files anywhere, or paste a
 * magnet link / URL anywhere outside a text field, to start adding it.
 */
export function DropZone() {
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    let depth = 0
    const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false

    const onDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return
      depth++
      setDragging(true)
    }
    const onDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const onDragOver = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault()
    }
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      depth = 0
      setDragging(false)
      const files = Array.from(event.dataTransfer?.files ?? []).filter(isTorrentFile)
      if (files.length) openDialog({ type: 'add', files })
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
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('paste', onPaste)
    }
  }, [])

  if (!dragging) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-background/70 p-6 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-primary/40 border-dashed px-12 py-10 text-center">
        <FileUp className="size-10 text-status-downloading" />
        <p className="font-semibold text-lg">Drop .torrent files to add them</p>
      </div>
    </div>
  )
}
