/** One point of global transfer activity: summed torrent rates, in bytes per second. */
export interface RateSample {
  /** Milliseconds since the epoch. */
  time: number
  down: number
  up: number
}

/** The Statistics graph's longest range; the inline chart shows the last few minutes of it. */
export const HISTORY_WINDOW = 30 * 60_000

/**
 * A bounded, in-memory history of global rates, fed by the existing torrent-list poll (no extra
 * RPC calls). It lives outside React so charts can mount and unmount without losing history,
 * and it belongs to one connection, so switching daemons starts fresh.
 *
 * Storage is a fixed-size ring: samples older than `window` are dropped as new ones arrive, and
 * `capacity` caps memory even at the fastest poll interval (1 s × 30 min = 1,800 samples).
 */
export class RateHistory {
  readonly window: number
  private readonly times: Float64Array
  private readonly downs: Float64Array
  private readonly ups: Float64Array
  private start = 0
  private count = 0
  private snapshot: readonly RateSample[] = []
  private dirty = false
  private readonly listeners = new Set<() => void>()

  constructor({ window = HISTORY_WINDOW, capacity = 2048 }: { window?: number; capacity?: number } = {}) {
    this.window = window
    this.times = new Float64Array(capacity)
    this.downs = new Float64Array(capacity)
    this.ups = new Float64Array(capacity)
  }

  get size() {
    return this.count
  }

  get capacity() {
    return this.times.length
  }

  push(time: number, down: number, up: number) {
    const capacity = this.capacity
    // Clocks can step backwards (sleep, NTP); never store samples out of order.
    if (this.count > 0 && time <= this.times[(this.start + this.count - 1) % capacity]!) return
    while (this.count > 0 && this.times[this.start]! < time - this.window) this.drop()
    if (this.count === capacity) this.drop()
    const index = (this.start + this.count) % capacity
    this.times[index] = time
    this.downs[index] = Math.max(0, down)
    this.ups[index] = Math.max(0, up)
    this.count++
    this.dirty = true
    for (const listener of this.listeners) listener()
  }

  clear() {
    this.start = 0
    this.count = 0
    this.dirty = true
    for (const listener of this.listeners) listener()
  }

  /** Oldest first. The same array is returned until the next change (for `useSyncExternalStore`). */
  samples = (): readonly RateSample[] => {
    if (!this.dirty) return this.snapshot
    const out: RateSample[] = new Array(this.count)
    for (let i = 0; i < this.count; i++) {
      const index = (this.start + i) % this.capacity
      out[i] = { time: this.times[index]!, down: this.downs[index]!, up: this.ups[index]! }
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

  private drop() {
    this.start = (this.start + 1) % this.capacity
    this.count--
  }
}

/** Global rates for one poll: the sum over every torrent (the list always has them all). */
export function totalRates(torrents: readonly { rateDownload: number; rateUpload: number }[]) {
  let down = 0
  let up = 0
  for (const t of torrents) {
    down += t.rateDownload
    up += t.rateUpload
  }
  return { down, up }
}

/**
 * Averages samples into fixed time buckets so a 30-minute history at a 1 s poll draws a few
 * hundred points instead of 1,800. Buckets are aligned to absolute time (not to the window's
 * edge), so they don't reshuffle on every poll and the line doesn't wobble as it scrolls.
 */
export function downsample(samples: readonly RateSample[], bucketMs: number): RateSample[] {
  if (bucketMs <= 0 || samples.length < 2) return samples.slice()
  const out: RateSample[] = []
  let bucket = Number.NaN
  let n = 0
  let time = 0
  let down = 0
  let up = 0
  const flush = () => {
    if (n > 0) out.push({ time: time / n, down: down / n, up: up / n })
  }
  for (const s of samples) {
    const b = Math.floor(s.time / bucketMs)
    if (b !== bucket) {
      flush()
      bucket = b
      n = time = down = up = 0
    }
    n++
    time += s.time
    down += s.down
    up += s.up
  }
  flush()
  return out
}

/**
 * Splits samples into runs without gaps. A gap (the tab was hidden, the daemon was unreachable,
 * the app was on another page) is drawn as a break, never interpolated across.
 */
export function splitAtGaps(samples: readonly RateSample[], gapMs: number): RateSample[][] {
  const runs: RateSample[][] = []
  let run: RateSample[] = []
  for (const s of samples) {
    const last = run[run.length - 1]
    if (last && s.time - last.time > gapMs) {
      runs.push(run)
      run = []
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
  return Math.min(range, Math.max(MIN_SPAN, last.time - first.time))
}

/** "3 min ago" for a chart's left edge. */
export function formatSpanAgo(span: number): string {
  return `${Math.max(1, Math.round(span / 60_000))} min ago`
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

/** The sample nearest to `time` (binary search over time-ordered samples). */
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
  const before = samples[lo - 1]
  return before && time - before.time < after.time - time ? before : after
}
