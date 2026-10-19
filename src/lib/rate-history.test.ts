import { describe, expect, test } from 'bun:test'
import {
  downsample,
  formatSpanAgo,
  MIN_SPAN,
  nearestSample,
  niceCeil,
  type RateSample,
  SessionHistory,
  smoothPath,
  splitRuns,
  visibleSpan,
} from './rate-history'

const sample = (time: number, down = 0, up = 0, from = time - 1000, live = true): RateSample => ({
  time,
  from,
  down,
  up,
  live,
})

class MemoryStorage {
  data = new Map<string, string>()
  getItem = (key: string) => this.data.get(key) ?? null
  setItem = (key: string, value: string) => void this.data.set(key, value)
  removeItem = (key: string) => void this.data.delete(key)
}

/** A daemon that started at t=0 (ms), read at `time` with the given counters. */
const reading = (time: number, downloadedBytes: number, uploadedBytes = 0, start = 0) => ({
  time,
  secondsActive: (time - start) / 1000,
  downloadedBytes,
  uploadedBytes,
  maxGap: 10_000,
})

describe('SessionHistory', () => {
  test('covers the whole daemon session: the first reading averages everything since it started', () => {
    const history = new SessionHistory()
    history.record(reading(3_600_000, 3_600_000_000, 360_000_000))
    expect(history.start).toBe(0)
    expect(history.samples()).toEqual([sample(3_600_000, 1_000_000, 100_000, 0, false)])
  })

  test('derives live rates from consecutive counter readings', () => {
    const history = new SessionHistory()
    history.record(reading(100_000, 0))
    history.record(reading(102_000, 4_000_000, 2000))
    history.record(reading(104_000, 6_000_000, 2000))
    expect(history.samples().slice(1)).toEqual([
      sample(102_000, 2_000_000, 1000, 100_000),
      sample(104_000, 1_000_000, 0, 102_000),
    ])
  })

  test('a stretch nobody polled is one exact average, not a hole', () => {
    const history = new SessionHistory()
    history.record(reading(100_000, 0))
    history.record(reading(102_000, 2_000_000))
    history.record(reading(702_000, 602_000_000))
    expect(history.samples().at(-1)).toEqual(sample(702_000, 1_000_000, 0, 102_000, false))
  })

  test('starts over when the daemon restarts', () => {
    const history = new SessionHistory()
    history.record(reading(100_000, 5_000_000))
    history.record(reading(102_000, 6_000_000))
    // Restarted at t=500s: uptime and counters are back near zero.
    history.record(reading(510_000, 1_000_000, 0, 500_000))
    expect(history.start).toBe(500_000)
    expect(history.samples()).toEqual([sample(510_000, 100_000, 0, 500_000, false)])
  })

  test('treats counters going backwards as a new session', () => {
    const history = new SessionHistory()
    history.record(reading(100_000, 5_000_000))
    history.record(reading(102_000, 1000))
    expect(history.samples()).toEqual([sample(102_000, 1000 / 102, 0, 0, false)])
  })

  test('ignores readings that go back in time', () => {
    const history = new SessionHistory()
    history.record(reading(100_000, 0))
    history.record(reading(99_000, 0))
    history.record(reading(100_000, 0))
    expect(history.size).toBe(2)
  })

  test('ignores readings too close together to give a meaningful rate', () => {
    const history = new SessionHistory()
    history.record(reading(100_000, 0))
    history.record(reading(100_050, 50_000_000))
    history.record(reading(102_000, 4_000_000_000))
    expect(history.samples().at(-1)).toEqual(sample(102_000, 2_000_000_000, 0, 100_000))
  })

  test('returns the same snapshot until something changes, and notifies subscribers', () => {
    const history = new SessionHistory()
    let calls = 0
    const unsubscribe = history.subscribe(() => calls++)
    history.record(reading(1000, 1))
    const first = history.samples()
    expect(history.samples()).toBe(first)
    history.record(reading(2000, 2))
    expect(history.samples()).not.toBe(first)
    unsubscribe()
    history.record(reading(3000, 3))
    expect(calls).toBe(2)
  })

  test('persists per connection, so a reload continues the session', () => {
    const storage = new MemoryStorage()
    const first = new SessionHistory({ storageKey: 'k', storage })
    first.record(reading(100_000, 0))
    first.record(reading(102_000, 2_000_000))
    first.save()
    const reloaded = new SessionHistory({ storageKey: 'k', storage })
    expect(reloaded.samples()).toEqual(first.samples())
    reloaded.record(reading(104_000, 4_000_000))
    expect(reloaded.samples().at(-1)).toEqual(sample(104_000, 1_000_000, 0, 102_000))
    expect(new SessionHistory({ storageKey: 'other', storage }).size).toBe(0)
  })

  test('merges what other tabs saved for the same session', () => {
    const storage = new MemoryStorage()
    const a = new SessionHistory({ storageKey: 'k', storage })
    const b = new SessionHistory({ storageKey: 'k', storage })
    a.record(reading(100_000, 0))
    b.record(reading(101_000, 1_000_000))
    a.record(reading(102_000, 2_000_000))
    b.save()
    a.save()
    expect(a.samples().map((s) => [s.time, s.down, s.live])).toEqual([
      [100_000, 0, false],
      [101_000, 1_000_000, true],
      [102_000, 1_000_000, true],
    ])
  })

  test("drops another tab's reading taken at nearly the same moment, instead of spiking", () => {
    const storage = new MemoryStorage()
    const a = new SessionHistory({ storageKey: 'k', storage })
    const b = new SessionHistory({ storageKey: 'k', storage })
    a.record(reading(100_000, 0))
    b.record(reading(102_010, 2_100_000))
    a.record(reading(102_000, 2_000_000))
    b.save()
    a.save()
    expect(a.samples().map((s) => [s.time, s.down])).toEqual([
      [100_000, 0],
      [102_000, 1_000_000],
    ])
  })

  test('ignores corrupt or outdated storage', () => {
    const storage = new MemoryStorage()
    storage.setItem('k', '{"v":1,"start":0,"t":[1,2]')
    expect(new SessionHistory({ storageKey: 'k', storage }).size).toBe(0)
    storage.setItem('k', JSON.stringify({ v: 0, start: 0, t: [0], d: [0], u: [0], l: '0' }))
    expect(new SessionHistory({ storageKey: 'k', storage }).size).toBe(0)
  })

  test('thins old readings without losing a byte', () => {
    const history = new SessionHistory()
    const day = 24 * 3_600_000
    // Two days of 2 s polls at a steady 1 MB/s.
    for (let t = 2000; t <= 2 * day; t += 2000) history.record({ ...reading(t, t * 1000), maxGap: 10_000 })
    expect(history.size).toBeLessThan(1800 + 1440 + 100)
    const samples = history.samples()
    const total = samples.reduce((sum, s) => sum + (s.down * (s.time - s.from)) / 1000, 0)
    expect(Math.round(total)).toBe(2 * day * 1000)
    expect(samples.every((s) => Math.abs(s.down - 1_000_000) < 1)).toBe(true)
    // Thinned stretches of continuous polling stay live.
    expect(samples.slice(1).every((s) => s.live)).toBe(true)
  })
})

describe('downsample', () => {
  test('merges samples within each time bucket, weighted by duration', () => {
    const samples = [sample(500, 10, 0, 0), sample(1500, 30, 4, 500), sample(1600, 100, 0, 1500)]
    expect(downsample(samples, 1000)).toEqual([
      sample(500, 10, 0, 0),
      sample(1600, (30 * 1000 + 100 * 100) / 1100, (4 * 1000) / 1100, 500),
    ])
  })

  test('aligns buckets to absolute time, so later samples do not reshuffle earlier buckets', () => {
    const samples = Array.from({ length: 40 }, (_, i) => sample(i * 250 + 250, i, 0, i * 250))
    const before = downsample(samples.slice(0, 30), 1000)
    const after = downsample(samples, 1000)
    expect(after.slice(0, before.length - 1)).toEqual(before.slice(0, -1))
  })

  test('never merges an unpolled stretch with live samples', () => {
    const samples = [sample(100, 1, 0, 0), sample(400, 2, 0, 100, false), sample(500, 3, 0, 400)]
    expect(downsample(samples, 1000)).toEqual(samples)
  })

  test('caps the point count for a 30-minute history at a 1 s poll', () => {
    const samples = Array.from({ length: 1800 }, (_, i) => sample(i * 1000 + 1000, i, i, i * 1000))
    const points = downsample(samples, (30 * 60_000 * 3) / 600)
    expect(points.length).toBeLessThanOrEqual(201)
    expect(points.length).toBeGreaterThan(150)
  })
})

test('splitRuns keeps live samples together and each unpolled stretch on its own', () => {
  const samples = [
    sample(1000, 0, 0, 0, false),
    sample(2000),
    sample(3000),
    sample(90_000, 0, 0, 3000, false),
    sample(91_000),
  ]
  expect(splitRuns(samples).map((run) => run.map((s) => s.time))).toEqual([[1000], [2000, 3000], [90_000], [91_000]])
  expect(splitRuns([])).toEqual([])
})

test.each([
  [0, 0],
  [0.7, 1],
  [1, 1],
  [1.3, 2],
  [3_400_000, 5_000_000],
  [7_100, 10_000],
])('niceCeil(%p) → %p', (value, expected) => {
  expect(niceCeil(value)).toBe(expected)
})

describe('smoothPath', () => {
  test('starts at the first point and ends at the last', () => {
    const d = smoothPath([
      { x: 0, y: 10 },
      { x: 5, y: 2 },
      { x: 10, y: 8 },
    ])
    expect(d.startsWith('M0,10C')).toBe(true)
    expect(d.endsWith(',10,8')).toBe(true)
  })

  test('never overshoots the data (control points stay within each segment)', () => {
    const points = [0, 10, 0, 0, 10, 10, 3].map((y, i) => ({ x: i * 10, y }))
    const numbers = smoothPath(points).replace(/[MC]/g, ' ').trim().split(/[ ,]+/).map(Number)
    const ys = numbers.filter((_, i) => i % 2 === 1)
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...ys)).toBeLessThanOrEqual(10)
  })

  test('handles a single point', () => {
    expect(smoothPath([{ x: 1, y: 2 }])).toBe('M1,2')
    expect(smoothPath([])).toBe('')
  })
})

test('nearestSample prefers the unpolled stretch under the pointer', () => {
  const samples = [sample(1000), sample(60_000, 0, 0, 1000, false), sample(61_000)]
  expect(nearestSample(samples, 5000)?.time).toBe(60_000)
  expect(nearestSample(samples, 1100)?.time).toBe(60_000)
  expect(nearestSample(samples, 900)?.time).toBe(1000)
})

test('nearestSample finds the closest sample by time', () => {
  const samples = [sample(0), sample(1000), sample(2000)]
  expect(nearestSample(samples, 400)?.time).toBe(0)
  expect(nearestSample(samples, 600)?.time).toBe(1000)
  expect(nearestSample(samples, 9999)?.time).toBe(2000)
  expect(nearestSample(samples, -50)?.time).toBe(0)
  expect(nearestSample([], 0)).toBeUndefined()
})

describe('visibleSpan', () => {
  const at = (from: number, ...times: number[]) =>
    times.map((time, i) => sample(time, 0, 0, i === 0 ? from : times[i - 1]))
  test('spans the history until there is a full range of it', () => {
    expect(visibleSpan(at(0, 1000, 150_000), 300_000)).toBe(150_000)
    expect(visibleSpan(at(0, 1000, 900_000), 300_000)).toBe(300_000)
  })
  test('never spans less than the minimum (or more than the range)', () => {
    expect(visibleSpan([], 300_000)).toBe(MIN_SPAN)
    expect(visibleSpan(at(0, 1000, 2_000), 300_000)).toBe(MIN_SPAN)
    expect(visibleSpan(at(0, 1000, 2_000), 30_000)).toBe(30_000)
  })
  test('spans the whole session for an unbounded range', () => {
    expect(visibleSpan(at(0, 3_600_000, 3_602_000), Number.POSITIVE_INFINITY)).toBe(3_602_000)
  })
  test('labels the left edge in minutes, hours or days', () => {
    expect(formatSpanAgo(150_000)).toBe('3 min ago')
    expect(formatSpanAgo(20_000)).toBe('1 min ago')
    expect(formatSpanAgo(3 * 3_600_000)).toBe('3 h ago')
    expect(formatSpanAgo(5 * 24 * 3_600_000)).toBe('5 days ago')
  })
})
