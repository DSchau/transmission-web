/**
 * Global transfer rate over one stretch of time, in bytes per second.
 *
 * Rates come from the daemon's own session byte counters (`session-stats`), so every stretch since
 * the daemon started is covered, even while no tab was open: a long stretch nobody polled is one
 * `live: false` sample holding the exact average over it.
 */
export interface RateSample {
  /** End of the stretch, in milliseconds since the epoch. */
  time: number
  /** Start of the stretch. */
  from: number
  down: number
  up: number
  /** False when the stretch wasn't polled continuously, so the rate is only its average. */
  live: boolean
}

/** One reading of `session-stats`' `current-stats` counters. */
export interface CounterReading {
  /** When the reading arrived (ms since the epoch). */
  time: number
  /** `current-stats.secondsActive`: how long the daemon has been running. */
  secondsActive: number
  downloadedBytes: number
  uploadedBytes: number
  /** Longer than this between readings and the stretch counts as unpolled (not `live`). */
  maxGap: number
}

/** Daemon start estimates within this of each other are the same daemon session. */
const SAME_SESSION = 60_000
/** Older readings are thinned to one per bucket: [max age, bucket size]. Recent ones are all kept. */
const TIERS: readonly (readonly [number, number])[] = [
  [60 * 60_000, 0],
  [24 * 60 * 60_000, 60_000],
  [7 * 24 * 60 * 60_000, 15 * 60_000],
  [Number.POSITIVE_INFINITY, 2 * 60 * 60_000],
]
const COMPACT_EVERY = 60_000
/** Readings closer than this are dropped: request timing jitter would dominate the rate. */
const MIN_SPACING = 750
const SAVE_DELAY = 10_000
const STORAGE_VERSION = 1

interface Stored {
  v: number
  start: number
  /** Reading times, as ms after `start`. */
  t: number[]
  d: number[]
  u: number[]
  /** '1' where the stretch ending at that reading was live. */
  l: string
}

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>

function defaultStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/**
 * Transfer history for the daemon's current session (since `transmission-daemon` started), not
 * just since this page loaded.
 *
 * Transmission keeps no rate history, but it does count every byte transferred this session. This
 * stores readings of those counters (cumulative bytes) and derives rates from their differences:
 * the first reading, against the daemon's start, covers everything before the page was ever
 * opened, and a reading after the tab was closed covers the time in between — exactly, as an
 * average. Readings persist per connection (localStorage), so a reload or a new tab carries on,
 * and a daemon restart (new start time, or counters going backwards) starts a fresh session.
 *
 * Storing counters (not rates) makes thinning old history exact: dropping a reading just merges
 * two stretches into one with the right average.
 */
export class SessionHistory {
  /** When the daemon started (ms since the epoch), once known. */
  start: number | null = null
  private times: number[] = []
  private downs: number[] = []
  private ups: number[] = []
  private lives: boolean[] = []
  private maxGap = 10_000
  private snapshot: readonly RateSample[] = []
  private dirty = false
  private lastCompact = 0
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private readonly listeners = new Set<() => void>()
  private readonly storageKey: string | null
  private readonly storage: Storage | null
  private readonly onHide = () => {
    if (typeof document === 'undefined' || document.visibilityState === 'hidden') this.save()
  }

  constructor({
    storageKey = null,
    storage = defaultStorage(),
  }: { storageKey?: string | null; storage?: Storage | null } = {}) {
    this.storageKey = storageKey
    this.storage = storageKey ? storage : null
    const stored = this.load()
    if (stored) this.adopt(stored)
  }

  /** Saves whenever the page is hidden or closed. Returns a cleanup that saves and detaches. */
  attach() {
    if (typeof window === 'undefined') return () => {}
    window.addEventListener('pagehide', this.onHide)
    document.addEventListener('visibilitychange', this.onHide)
    return () => {
      window.removeEventListener('pagehide', this.onHide)
      document.removeEventListener('visibilitychange', this.onHide)
      this.save()
    }
  }

  get size() {
    return this.times.length
  }

  /** Adds a `session-stats` reading. */
  record({ time, secondsActive, downloadedBytes, uploadedBytes, maxGap }: CounterReading) {
    this.maxGap = maxGap
    const start = time - secondsActive * 1000
    const n = this.times.length
    const restarted =
      this.start == null ||
      Math.abs(start - this.start) > SAME_SESSION ||
      (n > 0 && (downloadedBytes < this.downs[n - 1]! || uploadedBytes < this.ups[n - 1]!))
    if (restarted) {
      this.start = start
      // The daemon started with zeroed counters: the first stretch is everything until now.
      this.times = [start]
      this.downs = [0]
      this.ups = [0]
      this.lives = [false]
    } else if (time - this.times[n - 1]! < MIN_SPACING) {
      // Too close to the last reading to measure a rate, or out of order (clocks can step back).
      return
    }
    const previous = this.times[this.times.length - 1]!
    this.times.push(time)
    this.downs.push(downloadedBytes)
    this.ups.push(uploadedBytes)
    this.lives.push(!restarted && time - previous <= maxGap)
    if (time - this.lastCompact >= COMPACT_EVERY) {
      this.lastCompact = time
      this.compact(time)
    }
    this.changed()
    this.scheduleSave()
  }

  /** Rates, oldest first. The same array is returned until the next change (for `useSyncExternalStore`). */
  samples = (): readonly RateSample[] => {
    if (!this.dirty) return this.snapshot
    const n = this.times.length
    const out: RateSample[] = []
    for (let i = 1; i < n; i++) {
      const from = this.times[i - 1]!
      const time = this.times[i]!
      const seconds = (time - from) / 1000
      out.push({
        time,
        from,
        down: Math.max(0, (this.downs[i]! - this.downs[i - 1]!) / seconds),
        up: Math.max(0, (this.ups[i]! - this.ups[i - 1]!) / seconds),
        live: this.lives[i]!,
      })
    }
    this.snapshot = out
    this.dirty = false
    return out
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Writes to storage now, merging with what other tabs on the same daemon saved meanwhile. */
  save() {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = null
    if (!this.storage || !this.storageKey || this.start == null) return
    const stored = this.load()
    if (stored && Math.abs(stored.start - this.start) <= SAME_SESSION && stored.t.length > 0) {
      this.merge(stored)
      this.compact(this.times[this.times.length - 1]!)
      this.changed()
    }
    const start = this.start
    const data: Stored = {
      v: STORAGE_VERSION,
      start,
      t: this.times.map((t) => Math.round(t - start)),
      d: this.downs.map(Math.round),
      u: this.ups.map(Math.round),
      l: this.lives.map((live) => (live ? '1' : '0')).join(''),
    }
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(data))
    } catch {
      // Storage full or unavailable: the history still works for this page.
    }
  }

  private scheduleSave() {
    if (!this.storage || this.saveTimer) return
    this.saveTimer = setTimeout(() => this.save(), SAVE_DELAY)
  }

  private changed() {
    this.dirty = true
    for (const listener of this.listeners) listener()
  }

  private load(): Stored | null {
    if (!this.storage || !this.storageKey) return null
    try {
      const raw = this.storage.getItem(this.storageKey)
      if (!raw) return null
      const data = JSON.parse(raw) as Stored
      const n = data.t?.length ?? 0
      if (data.v !== STORAGE_VERSION || data.d?.length !== n || data.u?.length !== n || data.l?.length !== n)
        return null
      return data
    } catch {
      return null
    }
  }

  private adopt(data: Stored) {
    this.start = data.start
    this.times = data.t.map((t) => data.start + t)
    this.downs = data.d.slice()
    this.ups = data.u.slice()
    this.lives = Array.from(data.l, (c) => c === '1')
    this.changed()
  }

  /** Union with another tab's readings of the same session. */
  private merge(data: Stored) {
    const times: number[] = []
    const downs: number[] = []
    const ups: number[] = []
    const lives: boolean[] = []
    let i = 0
    let j = 0
    const n = this.times.length
    const m = data.t.length
    while (i < n || j < m) {
      const mine = i < n ? this.times[i]! : Number.POSITIVE_INFINITY
      const theirs = j < m ? data.start + data.t[j]! : Number.POSITIVE_INFINITY
      let time: number
      let down: number
      let up: number
      let live: boolean
      if (mine <= theirs) {
        ;[time, down, up, live] = [mine, this.downs[i]!, this.ups[i]!, this.lives[i]!]
        i++
        if (Math.abs(theirs - mine) < 1) j++
      } else {
        ;[time, down, up, live] = [theirs, data.d[j]!, data.u[j]!, data.l[j] === '1']
        j++
      }
      const k = times.length
      // A reading can only come between two others, which shortens the stretch before it.
      if (k > 0 && (down < downs[k - 1]! || up < ups[k - 1]!)) continue
      // Another tab polled at nearly the same moment.
      if (k > 0 && time - times[k - 1]! < MIN_SPACING) continue
      if (k > 0 && time - times[k - 1]! <= this.maxGap) live = true
      if (k === 0) live = false
      times.push(time)
      downs.push(down)
      ups.push(up)
      lives.push(live)
    }
    this.times = times
    this.downs = downs
    this.ups = ups
    this.lives = lives
  }

  /** Thins older readings to one per bucket (see `TIERS`). The first and last are always kept. */
  private compact(now: number) {
    const n = this.times.length
    if (n < 3) return
    const bucketOf = (time: number) => {
      const age = now - time
      for (const [maxAge, size] of TIERS)
        if (age <= maxAge) return size === 0 ? null : Math.floor(time / size) * size + size
      return null
    }
    const keep: number[] = [0]
    let live = true
    for (let i = 1; i < n - 1; i++) {
      live = live && this.lives[i]!
      const bucket = bucketOf(this.times[i]!)
      if (bucket == null || bucket !== bucketOf(this.times[i + 1]!)) {
        keep.push(i)
        this.lives[i] = live
        live = true
      }
    }
    this.lives[n - 1] = live && this.lives[n - 1]!
    keep.push(n - 1)
    if (keep.length === n) return
    this.times = keep.map((i) => this.times[i]!)
    this.downs = keep.map((i) => this.downs[i]!)
    this.ups = keep.map((i) => this.ups[i]!)
    this.lives = keep.map((i) => this.lives[i]!)
  }
}

/**
 * Merges samples into fixed time buckets so a long history draws a few hundred points instead of
 * thousands. Merged rates are time-weighted, so each bucket's rate is the exact average over it.
 * Buckets are aligned to absolute time (not to the window's edge), so they don't reshuffle on every
 * poll and the line doesn't wobble as it scrolls. Unpolled stretches are never merged with live ones.
 */
export function downsample(samples: readonly RateSample[], bucketMs: number): RateSample[] {
  if (bucketMs <= 0 || samples.length < 2) return samples.slice()
  const out: RateSample[] = []
  let current: RateSample | null = null
  let bucket = Number.NaN
  for (const s of samples) {
    const b = Math.floor(s.time / bucketMs)
    if (current?.live && s.live && b === bucket) {
      const a = current.time - current.from
      const c = s.time - s.from
      const total = a + c || 1
      current.down = (current.down * a + s.down * c) / total
      current.up = (current.up * a + s.up * c) / total
      current.time = s.time
      continue
    }
    if (current) out.push(current)
    current = { ...s }
    bucket = b
  }
  if (current) out.push(current)
  return out
}

/**
 * Splits samples into runs drawn as one smooth curve: consecutive live samples together, and each
 * unpolled stretch on its own (drawn flat, at its average).
 */
export function splitRuns(samples: readonly RateSample[]): RateSample[][] {
  const runs: RateSample[][] = []
  let run: RateSample[] = []
  for (const s of samples) {
    if (!s.live) {
      if (run.length > 0) runs.push(run)
      runs.push([s])
      run = []
      continue
    }
    run.push(s)
  }
  if (run.length > 0) runs.push(run)
  return runs
}

/** Until a full range of history exists, charts start at the oldest sample (but span at least this). */
export const MIN_SPAN = 60_000

/** How much time a chart of `range` should span: all of it once there's enough history, so a fresh session still fills the width. */
export function visibleSpan(samples: readonly RateSample[], range: number): number {
  const first = samples[0]
  const last = samples[samples.length - 1]
  if (!first || !last) return Math.min(MIN_SPAN, range)
  return Math.min(range, Math.max(MIN_SPAN, last.time - first.from))
}

/** "3 min ago", "5 h ago", "2 days ago" for a chart's left edge. */
export function formatSpanAgo(span: number): string {
  const minutes = Math.max(1, Math.round(span / 60_000))
  if (minutes < 90) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} h ago`
  return `${Math.round(hours / 24)} days ago`
}

/** Rounds up to 1, 2 or 5 × 10ⁿ so the chart's scale only changes on real swings, not jitter. */
export function niceCeil(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const fraction = value / magnitude
  const step = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return step * magnitude
}

export interface Point {
  x: number
  y: number
}

/**
 * A smooth SVG path through the points (monotone cubic interpolation, Fritsch–Carlson), so the
 * curve never overshoots: no dips below zero, no fake peaks above the real ones.
 */
export function smoothPath(points: readonly Point[]): string {
  const n = points.length
  if (n === 0) return ''
  const fmt = (v: number) => Math.round(v * 100) / 100
  const first = points[0]!
  if (n === 1) return `M${fmt(first.x)},${fmt(first.y)}`
  // Tangents per d3's monotoneX: a weighted mean of the neighbouring secants, clamped so the
  // curve stays within each segment's range, and flat at local extremes.
  const tangents: number[] = new Array(n)
  const secant = (i: number) => (points[i + 1]!.y - points[i]!.y) / (points[i + 1]!.x - points[i]!.x || 1)
  tangents[0] = secant(0)
  tangents[n - 1] = secant(n - 2)
  for (let i = 1; i < n - 1; i++) {
    const h0 = points[i]!.x - points[i - 1]!.x
    const h1 = points[i + 1]!.x - points[i]!.x
    const s0 = secant(i - 1)
    const s1 = secant(i)
    const p = (s0 * h1 + s1 * h0) / (h0 + h1 || 1)
    tangents[i] = (Math.sign(s0) + Math.sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0
  }
  let d = `M${fmt(first.x)},${fmt(first.y)}`
  for (let i = 0; i < n - 1; i++) {
    const a = points[i]!
    const b = points[i + 1]!
    const h = (b.x - a.x) / 3
    d += `C${fmt(a.x + h)},${fmt(a.y + tangents[i]! * h)},${fmt(b.x - h)},${fmt(b.y - tangents[i + 1]! * h)},${fmt(b.x)},${fmt(b.y)}`
  }
  return d
}

/**
 * The sample under `time`: the unpolled stretch containing it, or else the nearest live sample
 * (binary search over time-ordered samples).
 */
export function nearestSample(samples: readonly RateSample[], time: number): RateSample | undefined {
  if (samples.length === 0) return undefined
  let lo = 0
  let hi = samples.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (samples[mid]!.time < time) lo = mid + 1
    else hi = mid
  }
  const after = samples[lo]!
  if (!after.live && after.from <= time) return after
  const before = samples[lo - 1]
  return before && time - before.time < after.time - time ? before : after
}
