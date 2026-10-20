const UNITS = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB']

/** Decimal (SI) byte count, like Finder / Apple's `.file` style: "4.2 GB", "512 kB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 bytes'
  if (bytes < 1000) return `${bytes} bytes`
  let exponent = Math.min(Math.floor(Math.log10(bytes) / 3), UNITS.length - 1)
  let value = bytes / 1000 ** exponent
  // 999.5+ would round to "1000 MB"; promote to the next unit instead.
  if (Math.round(value) >= 1000 && exponent < UNITS.length - 1) {
    exponent++
    value /= 1000
  }
  const digits = value >= 100 || exponent === 1 ? 0 : value >= 10 ? 1 : 2
  return `${trimZeros(value.toFixed(digits))} ${UNITS[exponent]}`
}

/** Speeds never drop below kB/s, so they keep a steady width ("0.3 kB/s", not "307 bytes/s"). */
export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond <= 0) return '0 kB/s'
  if (bytesPerSecond < 1000) return `${trimZeros((bytesPerSecond / 1000).toFixed(1))} kB/s`
  return `${formatBytes(bytesPerSecond)}/s`
}

/** Speed limits are in KB/s on the wire. */
export const formatKBps = (kbps: number) => `${numberFormat.format(kbps)} kB/s`

function trimZeros(text: string): string {
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text
}

/** Transmission's ratio of two byte counts: -1 ("—") when nothing moved, -2 ("∞") when only uploads did. */
export function transferRatio(uploaded: number, downloaded: number): number {
  if (downloaded > 0) return uploaded / downloaded
  return uploaded > 0 ? -2 : -1
}

/** Transmission uses -1 for "not available" and -2 for "infinite". */
export function formatRatio(ratio: number): string {
  if (ratio === -1) return '—'
  if (ratio === -2) return '∞'
  return ratio.toFixed(2)
}

const percent0 = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 0 })
const percent1 = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 })
const numberFormat = new Intl.NumberFormat()

export const formatPercent = (fraction: number, precise = false) =>
  (precise ? percent1 : percent0).format(Math.min(Math.max(fraction, 0), 1))

export const formatNumber = (value: number) => numberFormat.format(value)

/** "2d 4h", "12m 5s" — the two most significant units. */
export function formatDuration(seconds: number): string {
  if (seconds < 0 || !Number.isFinite(seconds)) return '—'
  const parts: string[] = []
  const units: [string, number][] = [
    ['d', 86400],
    ['h', 3600],
    ['m', 60],
    ['s', 1],
  ]
  let remaining = Math.round(seconds)
  for (const [label, size] of units) {
    if (remaining >= size || (parts.length === 0 && size === 1)) {
      parts.push(`${Math.floor(remaining / size)}${label}`)
      remaining %= size
    }
    if (parts.length === 2) break
  }
  return parts.join(' ')
}

/** Torrent ETA: `null` when unknown (-1) or infinite (-2). */
export const formatEta = (eta: number): string | null => (eta >= 0 ? formatDuration(eta) : null)

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const dateOnly = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

const clockTime = new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' })

/** "2:41:07 PM" — for points on the speed charts. */
export const formatClockTime = (ms: number) => clockTime.format(ms)

const shortTime = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' })
const shortDateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' })

/** "2:41 PM", or with the date when it isn't today. */
export function formatShortTime(ms: number, now = Date.now()): string {
  return new Date(ms).toDateString() === new Date(now).toDateString() ? shortTime.format(ms) : shortDateTime.format(ms)
}

export const formatDateTime = (unixSeconds: number) => dateTime.format(unixSeconds * 1000)
export const formatDate = (unixSeconds: number) => dateOnly.format(unixSeconds * 1000)

/** "3 days ago", "in 5 minutes" */
export function formatRelative(unixSeconds: number, now = Date.now()): string {
  const diff = unixSeconds - now / 1000
  const abs = Math.abs(diff)
  if (abs < 60) return relative.format(Math.round(diff), 'second')
  if (abs < 3600) return relative.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return relative.format(Math.round(diff / 3600), 'hour')
  if (abs < 86400 * 30) return relative.format(Math.round(diff / 86400), 'day')
  if (abs < 86400 * 365) return relative.format(Math.round(diff / (86400 * 30)), 'month')
  return relative.format(Math.round(diff / (86400 * 365)), 'year')
}

export const torrentCountLabel = (count: number) => (count === 1 ? '1 torrent' : `${formatNumber(count)} torrents`)
