import { useSyncExternalStore } from 'react'

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** ≥ 1024px: sidebar + table + inspector. */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')
/** ≥ 768px: list and detail side by side. */
export const useIsSplit = () => useMediaQuery('(min-width: 768px)')
/** A mouse or trackpad — focusing a field won't pop up an on-screen keyboard over everything. */
export const useHasFinePointer = () => useMediaQuery('(pointer: fine)')
export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)')
