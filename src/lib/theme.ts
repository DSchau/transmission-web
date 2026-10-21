import { useSelector } from '@tanstack/react-store'
import { useEffect } from 'react'
import { useMediaQuery } from '@/hooks/use-media-query'
import { type ColorTheme, preferencesAtom, type Theme, updatePreferences } from './preferences'

interface ColorThemeInfo {
  id: ColorTheme
  name: string
  /** Background and accent colors for previews and the browser chrome (light, dark). */
  light: { bg: string; accents: string[] }
  dark: { bg: string; accents: string[] }
}

/** Palettes live in src/themes.css; this lists them for pickers. Order is the menu order. */
export const COLOR_THEMES: ColorThemeInfo[] = [
  {
    id: 'default',
    name: 'Default',
    light: { bg: '#ffffff', accents: ['#171717', '#2b7fff', '#00a63e'] },
    dark: { bg: '#0a0a0a', accents: ['#e5e5e5', '#51a2ff', '#05df72'] },
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    light: { bg: '#ffffff', accents: ['#0f4a85', '#b5200d', '#1e6b1e'] },
    dark: { bg: '#000000', accents: ['#6fc3df', '#f38518', '#89d185'] },
  },
  {
    id: 'github',
    name: 'GitHub',
    light: { bg: '#ffffff', accents: ['#0969da', '#1a7f37', '#d1242f'] },
    dark: { bg: '#0d1117', accents: ['#4493f8', '#3fb950', '#f85149'] },
  },
  {
    id: 'one',
    name: 'One',
    light: { bg: '#fafafa', accents: ['#4078f2', '#50a14f', '#e45649'] },
    dark: { bg: '#282c34', accents: ['#61afef', '#98c379', '#e06c75'] },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    light: { bg: '#fffbeb', accents: ['#644ac9', '#14710a', '#a3144d'] },
    dark: { bg: '#282a36', accents: ['#bd93f9', '#50fa7b', '#ff79c6'] },
  },
  {
    id: 'catppuccin',
    name: 'Catppuccin',
    light: { bg: '#eff1f5', accents: ['#8839ef', '#40a02b', '#fe640b'] },
    dark: { bg: '#1e1e2e', accents: ['#cba6f7', '#a6e3a1', '#fab387'] },
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    light: { bg: '#e1e2e7', accents: ['#2e7de9', '#587539', '#9854f1'] },
    dark: { bg: '#1a1b26', accents: ['#7aa2f7', '#9ece6a', '#bb9af7'] },
  },
  {
    id: 'solarized',
    name: 'Solarized',
    light: { bg: '#fdf6e3', accents: ['#268bd2', '#859900', '#cb4b16'] },
    dark: { bg: '#002b36', accents: ['#268bd2', '#859900', '#b58900'] },
  },
  {
    id: 'gruvbox',
    name: 'Gruvbox',
    light: { bg: '#fbf1c7', accents: ['#af3a03', '#79740e', '#076678'] },
    dark: { bg: '#282828', accents: ['#fe8019', '#b8bb26', '#83a598'] },
  },
  {
    id: 'nord',
    name: 'Nord',
    light: { bg: '#eceff4', accents: ['#5e81ac', '#5e7d46', '#bf616a'] },
    dark: { bg: '#2e3440', accents: ['#88c0d0', '#a3be8c', '#bf616a'] },
  },
  {
    id: 'dracula-pro',
    name: 'Dracula PRO',
    light: { bg: '#f5f5f5', accents: ['#644ac9', '#14710a', '#a3144d'] },
    dark: { bg: '#22212c', accents: ['#9580ff', '#8aff80', '#ff80bf'] },
  },
]

/** Light/dark/system plus a color theme, stored with the other preferences. index.html applies both before first paint. */
export function useTheme() {
  const theme = useSelector(preferencesAtom, (p) => p.theme)
  const stored = useSelector(preferencesAtom, (p) => p.colorTheme)
  // Stored state may name a theme that no longer exists.
  const colorTheme = COLOR_THEMES.some((t) => t.id === stored) ? stored : 'default'
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const resolvedTheme: 'light' | 'dark' = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme
  return {
    theme,
    resolvedTheme,
    colorTheme,
    setTheme: (next: Theme) => updatePreferences({ theme: next }),
    setColorTheme: (next: ColorTheme) => updatePreferences({ colorTheme: next }),
  }
}

/** Keeps the `dark` class, `data-theme`, and the browser chrome color in sync with the preferences. */
export function ThemeSync() {
  const { resolvedTheme, colorTheme } = useTheme()
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.dataset.theme = colorTheme
    root.style.colorScheme = resolvedTheme
    const info = COLOR_THEMES.find((t) => t.id === colorTheme)
    if (!info) return
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.setAttribute('content', info[resolvedTheme].bg)
    }
  }, [resolvedTheme, colorTheme])
  return null
}
