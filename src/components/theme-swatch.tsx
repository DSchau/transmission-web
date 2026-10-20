import type { ColorTheme } from '@/lib/preferences'
import { COLOR_THEMES } from '@/lib/theme'

/** A tiny preview of a color theme: its background with a few accent dots. */
export function ThemeSwatch({ theme, mode }: { theme: ColorTheme; mode: 'light' | 'dark' }) {
  const info = COLOR_THEMES.find((t) => t.id === theme)
  if (!info) return null
  const { bg, accents } = info[mode]
  return (
    <span
      aria-hidden
      className="inline-flex h-4 shrink-0 items-center gap-0.5 rounded-sm px-1 ring-1 ring-foreground/15"
      style={{ backgroundColor: bg }}
    >
      {accents.map((color) => (
        <span key={color} className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      ))}
    </span>
  )
}
