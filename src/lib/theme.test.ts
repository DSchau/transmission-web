import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { COLOR_THEMES } from './theme'

const KEYS = [
  'bg',
  'fg',
  'card',
  'sidebar',
  'muted',
  'muted-fg',
  'border',
  'primary',
  'primary-fg',
  'red',
  'green',
  'blue',
  'orange',
] as const
type Palette = Record<(typeof KEYS)[number], string>

const css = readFileSync(new URL('../themes.css', import.meta.url), 'utf8')

const rules = [...css.matchAll(/\[data-theme(\^?)="([^"]+)"\](\.dark)?\s*\{([^}]*)\}/g)].map(
  ([, prefix, name = '', dark, body = '']) => ({
    matches: (id: string) => (prefix ? id.startsWith(name) : id === name),
    dark: Boolean(dark),
    vars: new Map([...body.matchAll(/--t-([\w-]+):\s*([^;]+);/g)].map(([, k, v]) => [k, v?.trim()])),
  }),
)

/** The palette an element with this theme and mode ends up with (rules apply in source order). */
function palette(id: string, mode: 'light' | 'dark') {
  const vars = new Map<string | undefined, string | undefined>()
  for (const rule of rules) {
    if (rule.matches(id) && (!rule.dark || mode === 'dark')) for (const [k, v] of rule.vars) vars.set(k, v)
  }
  return { keys: [...vars.keys()], get: (key: keyof Palette) => vars.get(key) ?? '' }
}

function luminance(hex: string) {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

describe('color themes', () => {
  test('ids are unique', () => {
    expect(new Set(COLOR_THEMES.map((t) => t.id)).size).toBe(COLOR_THEMES.length)
  })

  for (const theme of COLOR_THEMES.filter((t) => t.id !== 'default')) {
    for (const mode of ['light', 'dark'] as const) {
      describe(`${theme.id} (${mode})`, () => {
        const p = palette(theme.id, mode)

        test('defines the full palette as hex colors', () => {
          expect(p.keys.sort()).toEqual([...KEYS].sort())
          for (const key of KEYS) expect(p.get(key)).toMatch(/^#[0-9a-f]{6}$/i)
        })

        test('preview matches its background', () => {
          expect(p.get('bg').toLowerCase()).toBe(theme[mode].bg.toLowerCase())
        })

        test('text is legible (WCAG AA)', () => {
          for (const surface of [p.get('bg'), p.get('card'), p.get('sidebar')]) {
            expect(contrast(p.get('fg'), surface)).toBeGreaterThanOrEqual(4.5)
            expect(contrast(p.get('muted-fg'), surface)).toBeGreaterThanOrEqual(4.5)
          }
          expect(contrast(p.get('fg'), p.get('muted'))).toBeGreaterThanOrEqual(4.5)
          expect(contrast(p.get('primary-fg'), p.get('primary'))).toBeGreaterThanOrEqual(4.5)
        })

        test('accent and status colors stand out from the background', () => {
          for (const key of ['primary', 'red', 'green', 'blue', 'orange'] as const) {
            expect(contrast(p.get(key), p.get('bg'))).toBeGreaterThanOrEqual(3)
          }
        })
      })
    }
  }
})
