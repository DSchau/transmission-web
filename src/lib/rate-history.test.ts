import { describe, expect, test } from 'bun:test'
import {
  downsample,
  formatSpanAgo,
  MIN_SPAN,
  nearestSample,
  niceCeil,
  RateHistory,
  smoothPath,
  splitAtGaps,
  totalRates,
  visibleSpan,
} from './rate-history'

const sample = (time: number, down = 0, up = 0) => ({ time, down, up })

describe('RateHistory', () => {
  test('keeps samples oldest first', () => {
    const history = new RateHistory({ window: 60_000, capacity: 8 })
    history.push(1000, 10, 1)
    history.push(2000, 20, 2)
    expect(history.samples()).toEqual([sample(1000, 10, 1), sample(2000, 20, 2)])
  })

  test('drops samples older than the window', () => {
    const history = new RateHistory({ window: 10_000, capacity: 64 })
    for (let t = 0; t <= 30_000; t += 1000) history.push(t, t, 0)
    const times = history.samples().map((s) => s.time)
    expect(times[0]).toBe(20_000)
    expect(times.at(-1)).toBe(30_000)
  })

  test('never grows past its capacity, wrapping around the ring', () => {
    const history = new RateHistory({ window: Number.POSITIVE_INFINITY, capacity: 5 })
    for (let t = 1; t <= 23; t++) history.push(t, t, 0)
    expect(history.size).toBe(5)
    expect(history.samples().map((s) => s.time)).toEqual([19, 20, 21, 22, 23])
  })

  test('ignores samples that go back in time', () => {
    const history = new RateHistory()
    history.push(2000, 1, 1)
    history.push(1000, 9, 9)
    history.push(2000, 9, 9)
    expect(history.samples()).toEqual([sample(2000, 1, 1)])
  })

  test('clamps negative rates to zero', () => {
    const history = new RateHistory()
    history.push(1, -5, -1)
    expect(history.samples()).toEqual([sample(1, 0, 0)])
  })

  test('returns the same snapshot until something changes, and notifies subscribers', () => {
    const history = new RateHistory()
    let calls = 0
    const unsubscribe = history.subscribe(() => calls++)
    history.push(1, 1, 1)
    const first = history.samples()
    expect(history.samples()).toBe(first)
    history.push(2, 1, 1)
    expect(history.samples()).not.toBe(first)
    history.clear()
    expect(history.samples()).toEqual([])
    unsubscribe()
    history.push(3, 1, 1)
    expect(calls).toBe(3)
  })
})

test('totalRates sums every torrent', () => {
  expect(
    totalRates([
      { rateDownload: 100, rateUpload: 1 },
      { rateDownload: 50, rateUpload: 2 },
    ]),
  ).toEqual({ down: 150, up: 3 })
})

describe('downsample', () => {
  test('averages samples within each time bucket', () => {
    const samples = [sample(0, 10, 0), sample(500, 30, 4), sample(1000, 100, 0), sample(1900, 200, 2)]
    expect(downsample(samples, 1000)).toEqual([sample(250, 20, 2), sample(1450, 150, 1)])
  })

  test('aligns buckets to absolute time, so later samples do not reshuffle earlier buckets', () => {
    const samples = Array.from({ length: 40 }, (_, i) => sample(i * 250, i, 0))
    const before = downsample(samples.slice(0, 30), 1000)
    const after = downsample(samples, 1000)
    expect(after.slice(0, before.length - 1)).toEqual(before.slice(0, -1))
  })

  test('caps the point count for a 30-minute history at a 1 s poll', () => {
    const samples = Array.from({ length: 1800 }, (_, i) => sample(i * 1000, i, i))
    const points = downsample(samples, (30 * 60_000 * 3) / 600)
    expect(points.length).toBeLessThanOrEqual(201)
    expect(points.length).toBeGreaterThan(150)
  })
})

test('splitAtGaps breaks runs where samples are missing', () => {
  const samples = [sample(0), sample(1000), sample(2000), sample(20_000), sample(21_000)]
  expect(splitAtGaps(samples, 5000).map((run) => run.map((s) => s.time))).toEqual([
    [0, 1000, 2000],
    [20_000, 21_000],
  ])
  expect(splitAtGaps([], 5000)).toEqual([])
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

test('nearestSample finds the closest sample by time', () => {
  const samples = [sample(0), sample(1000), sample(2000)]
  expect(nearestSample(samples, 400)?.time).toBe(0)
  expect(nearestSample(samples, 600)?.time).toBe(1000)
  expect(nearestSample(samples, 9999)?.time).toBe(2000)
  expect(nearestSample(samples, -50)?.time).toBe(0)
  expect(nearestSample([], 0)).toBeUndefined()
})

describe('visibleSpan', () => {
  const at = (...times: number[]) => times.map((time) => ({ time, down: 0, up: 0 }))
  test('spans the history until there is a full range of it', () => {
    expect(visibleSpan(at(0, 150_000), 300_000)).toBe(150_000)
    expect(visibleSpan(at(0, 900_000), 300_000)).toBe(300_000)
  })
  test('never spans less than the minimum (or more than the range)', () => {
    expect(visibleSpan([], 300_000)).toBe(MIN_SPAN)
    expect(visibleSpan(at(0, 2_000), 300_000)).toBe(MIN_SPAN)
    expect(visibleSpan(at(0, 2_000), 30_000)).toBe(30_000)
  })
  test('labels the left edge in whole minutes', () => {
    expect(formatSpanAgo(150_000)).toBe('3 min ago')
    expect(formatSpanAgo(20_000)).toBe('1 min ago')
  })
})
