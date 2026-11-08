import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

/** How long an undoable action waits before it's carried out. */
export const UNDO_WINDOW = 5000

/**
 * Shows `message` with an Undo button that counts down `UNDO_WINDOW` from when it appears, pausing
 * while the toast is hovered, then runs `onCommit`. Dismissing the toast commits straight away.
 */
export function undoToast(message: string, { onUndo, onCommit }: { onUndo: () => void; onCommit: () => void }) {
  let settled = false
  const settle = (fn: () => void) => {
    if (settled) return
    settled = true
    toast.dismiss(id)
    fn()
  }
  const id = toast(message, {
    duration: Number.POSITIVE_INFINITY,
    action: <UndoButton onUndo={() => settle(onUndo)} onExpire={() => settle(onCommit)} />,
    onDismiss: () => settle(onCommit),
  })
}

function UndoButton({ onUndo, onExpire }: { onUndo: () => void; onExpire: () => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  const [left, setLeft] = useState(UNDO_WINDOW)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const toastEl = ref.current?.closest('[data-sonner-toast]')
    if (!toastEl) return
    const pause = () => setPaused(true)
    const resume = () => setPaused(false)
    toastEl.addEventListener('pointerenter', pause)
    toastEl.addEventListener('pointerleave', resume)
    return () => {
      toastEl.removeEventListener('pointerenter', pause)
      toastEl.removeEventListener('pointerleave', resume)
    }
  }, [])

  useEffect(() => {
    if (paused) return
    let last = Date.now()
    const interval = setInterval(() => {
      const now = Date.now()
      const elapsed = now - last
      last = now
      setLeft((l) => Math.max(0, l - elapsed))
    }, 100)
    return () => clearInterval(interval)
  }, [paused])

  useEffect(() => {
    if (left === 0) onExpire()
  }, [left, onExpire])

  return (
    <Button ref={ref} size="xs" className="relative ml-auto shrink-0 overflow-hidden tabular-nums" onClick={onUndo}>
      <span
        aria-hidden
        className="absolute inset-0 origin-left animate-drain bg-primary-foreground/25"
        style={{ animationDuration: `${UNDO_WINDOW}ms`, animationPlayState: paused ? 'paused' : 'running' }}
      />
      <span className="relative">
        Undo <span className="opacity-70">{Math.ceil(left / 1000)}s</span>
      </span>
    </Button>
  )
}
