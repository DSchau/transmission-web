import { formatPercent, formatSpeed } from './format'
import type { Torrent } from './rpc/types'
import { haveBytes, isChecking, isComplete, isDownloading } from './torrent'

/** What the browser tab shows, most urgent first: error, downloading, verifying, finished, idle. */
export type TabStatus =
  | { kind: 'idle' }
  | { kind: 'done' }
  | { kind: 'error'; count: number }
  | { kind: 'downloading'; progress: number; rate: number }
  | { kind: 'checking'; progress: number }

/**
 * Errors that need you. Tracker warnings and errors on seeding or paused torrents are common
 * and harmless, so they'd keep the tab red for no reason; only flag local errors (disk full,
 * missing files) and downloads whose tracker is failing.
 */
export const needsAttention = (t: Torrent) => t.error === 3 || (t.error === 2 && isDownloading(t))

export function tabStatus(torrents: Torrent[], finishedWhileAway: boolean): TabStatus {
  const errors = torrents.filter(needsAttention).length
  if (errors > 0) return { kind: 'error', count: errors }

  const downloading = torrents.filter((t) => isDownloading(t) && !isComplete(t))
  if (downloading.length > 0) {
    let have = 0
    let size = 0
    let rate = 0
    for (const t of downloading) {
      have += haveBytes(t)
      size += t.sizeWhenDone
      rate += t.rateDownload
    }
    return { kind: 'downloading', progress: size > 0 ? have / size : 0, rate }
  }

  const checking = torrents.filter(isChecking)
  if (checking.length > 0) {
    const progress = checking.reduce((sum, t) => sum + t.recheckProgress, 0) / checking.length
    return { kind: 'checking', progress }
  }

  return finishedWhileAway ? { kind: 'done' } : { kind: 'idle' }
}

// Floor so a nearly finished download doesn't read "100%".
const percent = (fraction: number) => formatPercent(Math.floor(fraction * 100) / 100)

export function tabTitle(status: TabStatus, base: string): string {
  switch (status.kind) {
    case 'idle':
      return base
    case 'done':
      return `✓ Downloaded · ${base}`
    case 'error':
      return `⚠ ${status.count === 1 ? '1 error' : `${status.count} errors`} · ${base}`
    case 'downloading':
      return status.rate > 0
        ? `${percent(status.progress)} ↓ ${formatSpeed(status.rate)} · ${base}`
        : `${percent(status.progress)} · ${base}`
    case 'checking':
      return `Verifying ${percent(status.progress)} · ${base}`
  }
}

// Fixed colours: the icon sits on the browser's tab strip, not on the app's themed background.
const COLORS = { downloading: '#3b82f6', checking: '#f59e0b', error: '#ef4444', done: '#22c55e' }

// White glyphs drawn on a 32×32 grid, centred in the inner disc.
const stroke = 'fill="none" stroke="#fff" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"'
const GLYPHS = {
  downloading: `<path d="M16 10v11m-4.5-4.25 4.5 4.5 4.5-4.5" ${stroke}/>`,
  checking: `<circle cx="14.75" cy="14.75" r="3.75" ${stroke}/><path d="m17.6 17.6 3 3" ${stroke}/>`,
  error: `<path d="M16 10.5V17" ${stroke}/><circle cx="16" cy="21.25" r="1.7" fill="#fff"/>`,
  done: `<path d="m11 16.5 3.5 3.5 6.5-7.5" ${stroke}/>`,
}

/** A progress ring around a coloured state glyph, or null for the regular app icon. */
export function faviconSvg(status: TabStatus): string | null {
  if (status.kind === 'idle') return null
  const color = COLORS[status.kind]
  const progress = status.kind === 'downloading' || status.kind === 'checking' ? status.progress : 1
  const ring = 'cx="16" cy="16" r="14" fill="none" stroke-width="3.5"'
  const arc =
    progress >= 1
      ? `<circle ${ring} stroke="${color}"/>`
      : progress > 0
        ? `<circle ${ring} stroke="${color}" stroke-linecap="round" pathLength="100" stroke-dasharray="${(progress * 100).toFixed(1)} 100" transform="rotate(-90 16 16)"/>`
        : ''
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">',
    `<circle ${ring} stroke="#9ca3af" stroke-opacity=".45"/>`,
    arc,
    `<circle cx="16" cy="16" r="10.25" fill="${color}"/>`,
    GLYPHS[status.kind],
    '</svg>',
  ].join('')
}
