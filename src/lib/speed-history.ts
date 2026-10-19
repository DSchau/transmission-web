/** One reading of the global transfer rates. `NaN` rates mark a gap (a failed poll). */
export interface SpeedSample {
  /** Epoch milliseconds. */
  time: number
  /** Bytes per second. */
  down: number
  up: number
}

/** How much history is kept: enough for the Statistics view's longest window. */
export const HISTORY_WINDOW_MS = 30 * 60_000
/** The shortest refresh interval is 1s, so this covers the full window at any interval. */
const CAPACITY = HISTORY_WINDOW_MS / 1000 + 1

/** Fixed-size buffer that overwrites its oldest sample once full, so memory never grows. */
export class SampleRing {
  readonly capacity: number
  private readonly times: Float64Array
  private readonly downs: Float64Array
  private readonly ups: Float64Array
  private start = 0
  private count = 0

  constructor(capacity: number) {
    this.capacity = capacity
    this.times = new Float64Array(capacity)
    this.downs = new Float64Array(capacity)
    this.ups = new Float64Array(capacity)
  }

  get size() {
    return this.count
  }

  push({ time, down, up }: SpeedSample) {
    const index = (this.start + this.count) % this.capacity
    this.times[index] = time
    this.downs[index] = down
    this.ups[index] = up
    if (this.count < this.capacity) this.count++
    else this.start = (this.start + 1) % this.capacity
  }

  /** Oldest sample first. */
  at(i: number): SpeedSample {
    const index = (this.start + i) % this.capacity
    return { time: this.times[index]!, down: this.downs[index]!, up: this.ups[index]! }
  }

  /** Samples at or after `since`, oldest first. */
  since(since: number): SpeedSample[] {
    let lo = 0
    let hi = this.count
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (this.times[(this.start + mid) % this.capacity]! < since) lo = mid + 1
      else hi = mid
    }
    const out: SpeedSample[] = []
    for (let i = lo; i < this.count; i++) out.push(this.at(i))
    return out
  }

  clear() {
    this.start = 0
    this.count = 0
  }
}

/**
 * The rolling rate history for one connection, fed by the torrent list poll. Lives outside React
 * so the charts can subscribe to it without re-rendering anything else.
 */
export class SpeedHistory {
  private readonly ring: SampleRing
  private readonly listeners = new Set<() => void>()
  /** Bumped on every change; a cheap snapshot for `useSyncExternalStore`. */
  version = 0

  constructor(capacity = CAPACITY) {
    this.ring = new SampleRing(capacity)
  }

  add(sample: SpeedSample) {
    this.ring.push(sample)
    this.notify()
  }

  /** Records a failed poll, so the chart breaks the line instead of joining across the outage. */
  addGap(time: number) {
    const size = this.ring.size
    if (size > 0 && Number.isNaN(this.ring.at(size - 1).down)) return
    this.add({ time, down: Number.NaN, up: Number.NaN })
  }

  latest(): SpeedSample | undefined {
    const size = this.ring.size
    return size > 0 ? this.ring.at(size - 1) : undefined
  }

  since(time: number) {
    return this.ring.since(time)
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getVersion = () => this.version

  private notify() {
    this.version++
    for (const listener of this.listeners) listener()
  }
}

export const isGap = (sample: SpeedSample) => Number.isNaN(sample.down)

/**
 * Splits samples into continuous runs. A run ends at a gap marker, or when two samples are more
 * than `maxSpacing` ms apart (e.g. polling paused while the tab was hidden).
 */
export function segments(samples: SpeedSample[], maxSpacing: number): SpeedSample[][] {
  const out: SpeedSample[][] = []
  let current: SpeedSample[] = []
  let previous: SpeedSample | undefined
  for (const sample of samples) {
    if (isGap(sample) || (previous && sample.time - previous.time > maxSpacing)) {
      if (current.length > 0) out.push(current)
      current = []
    }
    if (!isGap(sample)) current.push(sample)
    previous = sample
  }
  if (current.length > 0) out.push(current)
  return out
}

/**
 * Reduces a run to at most `buckets` points by averaging samples into equal time buckets, so a
 * long window draws one point per couple of pixels. Empty buckets are skipped (not gaps).
 */
export function downsample(samples: SpeedSample[], from: number, to: number, buckets: number): SpeedSample[] {
  if (samples.length <= buckets || buckets < 1 || to <= from) return samples
  const width = (to - from) / buckets
  const out: SpeedSample[] = []
  let bucket = -1
  let time = 0
  let down = 0
  let up = 0
  let n = 0
  const flush = () => {
    if (n > 0) out.push({ time: time / n, down: down / n, up: up / n })
  }
  for (const sample of samples) {
    const index = Math.min(buckets - 1, Math.max(0, Math.floor((sample.time - from) / width)))
    if (index !== bucket) {
      flush()
      bucket = index
      time = down = up = n = 0
    }
    time += sample.time
    down += sample.down
    up += sample.up
    n++
  }
  flush()
  return out
}

/** Index of the sample closest in time to `time` (samples sorted by time). -1 when empty. */
export function nearestSample(samples: SpeedSample[], time: number): number {
  if (samples.length === 0) return -1
  let lo = 0
  let hi = samples.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (samples[mid]!.time < time) lo = mid + 1
    else hi = mid
  }
  if (lo > 0 && time - samples[lo - 1]!.time < samples[lo]!.time - time) return lo - 1
  return lo
}

/** A round axis maximum (1, 2 or 5 × 10ⁿ) at or above `value`, never below `floor`. */
export function niceMax(value: number, floor = 10_000): number {
  const v = Math.max(value, floor)
  const magnitude = 10 ** Math.floor(Math.log10(v))
  for (const step of [1, 2, 5, 10]) {
    if (v <= step * magnitude) return step * magnitude
  }
  return 10 * magnitude
}

/**
 * A smooth SVG path through `points` using monotone cubic interpolation (Fritsch–Carlson): the
 * curve never overshoots the data, so rates never dip below zero between two samples.
 */
export function monotonePath(points: readonly (readonly [number, number])[]): string {
  const n = points.length
  if (n === 0) return ''
  const fmt = (v: number) => Math.round(v * 100) / 100
  const [x0, y0] = points[0]!
  if (n === 1) return `M${fmt(x0)},${fmt(y0)}`
  if (n === 2) return `M${fmt(x0)},${fmt(y0)}L${fmt(points[1]![0])},${fmt(points[1]![1])}`

  const slopes: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1]![0] - points[i]![0]
    slopes.push(dx === 0 ? 0 : (points[i + 1]![1] - points[i]![1]) / dx)
  }
  const tangents: number[] = [slopes[0]!]
  for (let i = 1; i < n - 1; i++) {
    const a = slopes[i - 1]!
    const b = slopes[i]!
    // Harmonic mean of the neighbouring slopes; zero at local extrema. Keeps each segment monotone.
    tangents.push(a * b <= 0 ? 0 : (2 * a * b) / (a + b))
  }
  tangents.push(slopes[n - 2]!)

  let d = `M${fmt(x0)},${fmt(y0)}`
  for (let i = 0; i < n - 1; i++) {
    const [xa, ya] = points[i]!
    const [xb, yb] = points[i + 1]!
    const h = (xb - xa) / 3
    d += `C${fmt(xa + h)},${fmt(ya + tangents[i]! * h)},${fmt(xb - h)},${fmt(yb - tangents[i + 1]! * h)},${fmt(xb)},${fmt(yb)}`
  }
  return d
}
