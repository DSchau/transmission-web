import { type ComponentProps, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * A button that only fires after being held down for `duration` ms — by pointer, or by holding
 * Space/Enter. A fill sweeps across while held and snaps back on release, so it reads as a
 * deliberate confirmation without making anyone type anything.
 */
export function HoldButton({
  onConfirm,
  duration = 1000,
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof Button>, 'onClick'> & { onConfirm: () => void; duration?: number }) {
  const [holding, setHolding] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const start = () => {
    if (timer.current) return
    setHolding(true)
    timer.current = setTimeout(() => {
      timer.current = undefined
      setHolding(false)
      onConfirm()
    }, duration)
  }
  const cancel = () => {
    clearTimeout(timer.current)
    timer.current = undefined
    setHolding(false)
  }
  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <Button
      {...props}
      className={cn('relative isolate overflow-hidden', className)}
      onPointerDown={(event) => {
        if (event.button === 0) start()
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault()
          if (!event.repeat) start()
        }
      }}
      onKeyUp={(event) => {
        if (event.key === ' ' || event.key === 'Enter') cancel()
      }}
      onBlur={cancel}
    >
      <span
        aria-hidden
        className="absolute inset-0 -z-10 origin-left bg-current opacity-20 ease-linear"
        style={{
          transform: `scaleX(${holding ? 1 : 0})`,
          transition: `transform ${holding ? duration : 150}ms`,
        }}
      />
      {children}
    </Button>
  )
}
