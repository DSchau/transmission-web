import { useEffect, useRef } from 'react'

type Handlers = Record<string, (event: KeyboardEvent) => void>

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

/**
 * Minimal global shortcuts. Keys are `KeyboardEvent.key` values; `|` separates alternatives, and a
 * `Mod+` prefix means ⌘ (or Ctrl) must be held. Other keys only fire with no modifiers held.
 * Skipped while typing (including IME composition) or when a dialog, menu or listbox is open.
 */
export function useHotkeys(handlers: Handlers) {
  const ref = useRef(handlers)
  ref.current = handlers

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.altKey || isTyping(event.target)) return
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]')) return
      const key = event.metaKey || event.ctrlKey ? `Mod+${event.key}` : event.key
      for (const [keys, handler] of Object.entries(ref.current)) {
        if (keys.split('|').includes(key)) {
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
