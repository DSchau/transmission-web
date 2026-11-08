import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

/** How long an undoable action waits before it's carried out. */
export const UNDO_WINDOW = 5000

/**
 * Shows `message` with an Undo button that counts down `UNDO_WINDOW`, then runs `onCommit`.
 * The countdown doesn't pause on hover, so the button always shows when it will really happen.
 */
export function undoToast(message: string, { onUndo, onCommit }: { onUndo: () => void; onCommit: () => void }) {
  const deadline = Date.now() + UNDO_WINDOW
  const timer = setTimeout(() => {
    toast.dismiss(id)
    onCommit()
  }, UNDO_WINDOW)
  const undo = () => {
    clearTimeout(timer)
    toast.dismiss(id)
    onUndo()
  }
  const id = toast(message, {
    duration: Number.POSITIVE_INFINITY,
    action: <UndoButton deadline={deadline} onClick={undo} />,
  })
}

function UndoButton({ deadline, onClick }: { deadline: number; onClick: () => void }) {
  const remaining = () => Math.max(0, deadline - Date.now())
  const [left, setLeft] = useState(remaining)
  // Read once, so the bar drains from wherever the countdown was when it mounted.
  const [duration] = useState(remaining)
  useEffect(() => {
    const interval = setInterval(() => setLeft(Math.max(0, deadline - Date.now())), 100)
    return () => clearInterval(interval)
  }, [deadline])

  return (
    <Button size="sm" className="relative ml-auto shrink-0 overflow-hidden tabular-nums" onClick={onClick}>
      <span
        aria-hidden
        className="absolute inset-0 origin-left animate-drain bg-primary-foreground/25"
        style={{ animationDuration: `${duration}ms` }}
      />
      <span className="relative">
        Undo <span className="opacity-70">{Math.ceil(left / 1000)}s</span>
      </span>
    </Button>
  )
}
