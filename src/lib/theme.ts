import { useSelector } from '@tanstack/react-store'
import { useEffect } from 'react'
import { useMediaQuery } from '@/hooks/use-media-query'
import { preferencesAtom, type Theme, updatePreferences } from './preferences'

/** Light/dark/system, stored with the other preferences. index.html applies it before first paint. */
export function useTheme() {
  const theme = useSelector(preferencesAtom, (p) => p.theme)
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const resolvedTheme: 'light' | 'dark' = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme
  return { theme, resolvedTheme, setTheme: (next: Theme) => updatePreferences({ theme: next }) }
}

/** Keeps the `dark` class on <html> in sync with the preference and the system setting. */
export function ThemeSync() {
  const { resolvedTheme } = useTheme()
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.style.colorScheme = resolvedTheme
  }, [resolvedTheme])
  return null
}
