import { useEffect, useRef } from 'react'

type Handlers = Record<string, (event: KeyboardEvent) => void>

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

/**
 * Minimal global shortcuts. Keys are `KeyboardEvent.key` values; `|` separates alternatives.
 * Skipped while typing, with modifier keys held, or when a dialog/menu is open.
 */
export function useHotkeys(handlers: Handlers) {
  const ref = useRef(handlers)
  ref.current = handlers

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')) return
      for (const [keys, handler] of Object.entries(ref.current)) {
        if (keys.split('|').includes(event.key)) {
          event.preventDefault()
          handler(event)
          return
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
