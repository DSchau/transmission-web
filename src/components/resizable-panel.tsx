import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from 'react'
import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * A fixed-width side panel with a drag handle on one edge. `width` is null until the user
 * resizes, so the default (responsive) width comes from `className`. Double-click the handle
 * to go back to it; arrow keys resize when the handle is focused.
 */
export function ResizablePanel({
  edge,
  width,
  onWidthChange,
  min,
  max,
  maxViewportFraction = 1,
  label,
  className,
  children,
}: {
  /** The edge the handle sits on: `right` for a left sidebar, `left` for a right inspector. */
  edge: 'left' | 'right'
  width: number | null
  onWidthChange: (width: number | null) => void
  min: number
  max: number
  /** Also caps the width at this share of the window, so the middle column keeps its room. */
  maxViewportFraction?: number
  label: string
  className?: string
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  // The width while dragging; committed to `onWidthChange` on release.
  const [live, setLive] = useState<number | null>(null)
  const drag = useRef<{ x: number; width: number } | null>(null)

  const clamp = (value: number) =>
    Math.round(Math.min(Math.max(value, min), Math.max(min, Math.min(max, window.innerWidth * maxViewportFraction))))
  const current = () => panelRef.current?.getBoundingClientRect().width ?? min
  const effective = live ?? width

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, width: current() }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const delta = (event.clientX - drag.current.x) * (edge === 'right' ? 1 : -1)
    setLive(clamp(drag.current.width + delta))
  }
  const onPointerUp = () => {
    if (!drag.current) return
    drag.current = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    if (live != null) onWidthChange(live)
    setLive(null)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 64 : 16
    const grow = edge === 'right' ? 'ArrowRight' : 'ArrowLeft'
    const shrink = edge === 'right' ? 'ArrowLeft' : 'ArrowRight'
    if (event.key !== grow && event.key !== shrink) return
    event.preventDefault()
    onWidthChange(clamp(current() + (event.key === grow ? step : -step)))
  }

  const style: CSSProperties = {
    maxWidth: `${maxViewportFraction * 100}vw`,
    ...(effective != null && { width: effective }),
  }

  return (
    <div ref={panelRef} className={cn('relative flex shrink-0 flex-col', className)} style={style}>
      {children}
      {/* biome-ignore lint/a11y/useSemanticElements: an <hr> can't be focused or dragged */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={label}
        aria-valuenow={Math.round(effective ?? 0) || undefined}
        aria-valuemin={min}
        aria-valuemax={max}
        tabIndex={0}
        data-dragging={live != null || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => onWidthChange(null)}
        onKeyDown={onKeyDown}
        title="Drag to resize, double-click to reset"
        className={cn(
          'absolute inset-y-0 z-20 w-2 cursor-col-resize touch-none outline-none',
          edge === 'right' ? '-right-1' : '-left-1',
          // A hairline that brightens on hover / drag / focus, centred over the panel border.
          'before:absolute before:inset-y-0 before:left-1/2 before:w-0.5 before:-translate-x-1/2 before:transition-colors',
          'hover:before:bg-ring/60 focus-visible:before:bg-ring data-dragging:before:bg-ring',
        )}
      />
    </div>
  )
}
