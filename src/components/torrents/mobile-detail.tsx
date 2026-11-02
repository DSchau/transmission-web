import { useCanGoBack, useRouter } from '@tanstack/react-router'
import { type ReactNode, useEffect, useLayoutEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useTorrentsView } from './torrents-view'

const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)'
/** How far from the left edge a swipe-back has to start, like iOS. */
const EDGE = 24
/** A flick faster than this dismisses even when it hasn't travelled far (px/ms). */
const DISMISS_VELOCITY = 0.11

let panel: HTMLElement | null = null

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Slides the phone's detail page back out, from wherever a swipe left it.
 * The route content unmounts as soon as the URL changes, so this animates a static copy instead.
 */
function slideOut() {
  if (!panel || panel.classList.contains('hidden')) return
  const ghost = panel.cloneNode(true) as HTMLElement
  ghost.setAttribute('aria-hidden', 'true')
  ghost.inert = true
  ghost.classList.remove('animate-push-in')
  panel.after(ghost)

  // cloneNode copies neither canvas pixels nor scroll positions.
  const from = panel.querySelectorAll('*')
  const to = ghost.querySelectorAll('*')
  from.forEach((source, i) => {
    const copy = to[i]
    if (!copy) return
    if (source instanceof HTMLCanvasElement && copy instanceof HTMLCanvasElement) {
      copy.getContext('2d')?.drawImage(source, 0, 0)
    }
    if (source.scrollTop || source.scrollLeft) {
      copy.scrollTop = source.scrollTop
      copy.scrollLeft = source.scrollLeft
    }
  })

  const offset = new DOMMatrix(getComputedStyle(panel).transform).m41
  const remaining = 1 - offset / panel.offsetWidth
  panel.style.visibility = 'hidden'
  const animation = reducedMotion()
    ? ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'ease-out' })
    : ghost.animate([{ transform: `translateX(${offset}px)` }, { transform: 'translateX(100%)' }], {
        duration: Math.max(120, 280 * remaining),
        easing: EASE_DRAWER,
      })
  animation.finished.finally(() => ghost.remove())
}

/** The phone detail page's back action; it slides the page out like a navigation pop. */
export function useDetailBack() {
  const { closeDetail } = useTorrentsView()
  const router = useRouter()
  const canGoBack = useCanGoBack()

  return () => {
    // A browser back (button or iOS edge swipe) skips this: the browser animated it already.
    slideOut()
    if (canGoBack) router.history.back()
    else closeDetail()
  }
}

/**
 * The phone's detail page, pushed over the list (which stays mounted to keep its scroll position).
 * Swiping right from the left edge drags it back off, like a navigation controller.
 */
export function MobileDetail({ open, children }: { open: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const back = useDetailBack()
  const backRef = useRef(back)
  backRef.current = back

  useEffect(() => {
    panel = ref.current
    return () => {
      panel = null
    }
  }, [])

  // A swipe or slide-out leaves the panel moved or hidden; the next push starts clean.
  useLayoutEffect(() => {
    if (!open || !ref.current) return
    ref.current.style.transform = ''
    ref.current.style.visibility = ''
  }, [open])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let start: { x: number; y: number } | null = null
    let dragging = false
    let offset = 0
    let velocity = 0
    let last = { x: 0, time: 0 }

    const onStart = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (event.touches.length !== 1 || !touch || touch.clientX > EDGE) return
      start = { x: touch.clientX, y: touch.clientY }
      last = { x: touch.clientX, time: event.timeStamp }
      dragging = false
      offset = 0
      velocity = 0
    }

    const onMove = (event: TouchEvent) => {
      if (!start) return
      const touch = event.touches[0]
      if (!touch) return
      const dx = touch.clientX - start.x
      const dy = touch.clientY - start.y
      if (!dragging) {
        // Mostly vertical: it's a scroll, let it go.
        if (Math.abs(dy) > 10 && Math.abs(dy) > dx) {
          start = null
          return
        }
        if (dx < 10) return
        dragging = true
      }
      event.preventDefault()
      const dt = event.timeStamp - last.time
      if (dt > 0) velocity = (touch.clientX - last.x) / dt
      last = { x: touch.clientX, time: event.timeStamp }
      offset = Math.max(0, dx)
      el.style.transform = `translateX(${offset}px)`
    }

    const onEnd = (event: TouchEvent) => {
      if (!start) return
      start = null
      if (!dragging) return
      dragging = false
      // A cancel means the browser took the gesture over (e.g. Safari's own edge-swipe back): just settle.
      if (event.type === 'touchend' && (offset > el.offsetWidth / 2 || velocity > DISMISS_VELOCITY)) {
        backRef.current()
        return
      }
      el.style.transform = ''
      el.animate([{ transform: `translateX(${offset}px)` }, { transform: 'translateX(0)' }], {
        duration: 200,
        easing: EASE_DRAWER,
      })
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  return (
    <div ref={ref} className={cn('animate-push-in fixed inset-0 z-40 flex flex-col bg-background', !open && 'hidden')}>
      {open && children}
    </div>
  )
}
