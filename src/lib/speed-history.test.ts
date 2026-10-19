/// <reference types="bun" />
import { describe, expect, it } from 'bun:test'
import {
  downsample,
  monotonePath,
  nearestSample,
  niceMax,
  SampleRing,
  SpeedHistory,
  type SpeedSample,
  segments,
} from './speed-history'

const sample = (time: number, down = time, up = 0): SpeedSample => ({ time, down, up })

describe('SampleRing', () => {
  it('keeps samples oldest first', () => {
    const ring = new SampleRing(4)
    for (const t of [1, 2, 3]) ring.push(sample(t))
    expect(ring.size).toBe(3)
    expect(ring.since(0).map((s) => s.time)).toEqual([1, 2, 3])
  })

  it('overwrites the oldest samples once full, never growing past capacity', () => {
    const ring = new SampleRing(3)
    for (let t = 1; t <= 10; t++) ring.push(sample(t))
    expect(ring.size).toBe(3)
    expect(ring.since(0).map((s) => s.time)).toEqual([8, 9, 10])
    expect(ring.at(0).time).toBe(8)
  })

  it('returns samples from a time onwards across the wrap point', () => {
    const ring = new SampleRing(5)
    for (let t = 1; t <= 7; t++) ring.push(sample(t * 10))
    expect(ring.since(45).map((s) => s.time)).toEqual([50, 60, 70])
    expect(ring.since(50).map((s) => s.time)).toEqual([50, 60, 70])
    expect(ring.since(1000)).toEqual([])
  })

  it('clears', () => {
    const ring = new SampleRing(2)
    ring.push(sample(1))
    ring.clear()
    expect(ring.size).toBe(0)
    expect(ring.since(0)).toEqual([])
  })
})

describe('SpeedHistory', () => {
  it('notifies subscribers and bumps its version on every sample', () => {
    const history = new SpeedHistory(10)
    let calls = 0
    const unsubscribe = history.subscribe(() => calls++)
    history.add(sample(1))
    history.add(sample(2))
    expect(calls).toBe(2)
    expect(history.getVersion()).toBe(2)
    expect(history.latest()?.time).toBe(2)
    unsubscribe()
    history.add(sample(3))
    expect(calls).toBe(2)
  })

  it('records one gap marker per outage', () => {
    const history = new SpeedHistory(10)
    history.add(sample(1))
    history.addGap(2)
    history.addGap(3)
    expect(history.since(0)).toHaveLength(2)
    expect(Number.isNaN(history.latest()?.down)).toBe(true)
  })
})

describe('segments', () => {
  it('breaks the line at gap markers and long pauses', () => {
    const gap = { time: 4, down: Number.NaN, up: Number.NaN }
    const runs = segments([sample(1), sample(2), sample(3), gap, sample(5), sample(6), sample(20)], 2)
    expect(runs.map((run) => run.map((s) => s.time))).toEqual([[1, 2, 3], [5, 6], [20]])
  })

  it('returns nothing for no samples or only gaps', () => {
    expect(segments([], 1)).toEqual([])
    expect(segments([{ time: 1, down: Number.NaN, up: Number.NaN }], 1)).toEqual([])
  })
})

describe('downsample', () => {
  it('leaves short runs untouched', () => {
    const samples = [sample(0), sample(1)]
    expect(downsample(samples, 0, 10, 5)).toBe(samples)
  })

  it('averages samples into time buckets', () => {
    const samples = Array.from({ length: 100 }, (_, i) => ({ time: i, down: i, up: 100 - i }))
    const out = downsample(samples, 0, 100, 10)
    expect(out).toHaveLength(10)
    expect(out[0]).toEqual({ time: 4.5, down: 4.5, up: 95.5 })
    expect(out[9]).toEqual({ time: 94.5, down: 94.5, up: 5.5 })
  })

  it('skips empty buckets and clamps samples outside the range', () => {
    const samples = [sample(-5), sample(0), sample(1), sample(2), sample(90), sample(150)]
    const out = downsample(samples, 0, 100, 4)
    expect(out.map((s) => s.time)).toEqual([-0.5, 120])
  })
})

describe('nearestSample', () => {
  const samples = [sample(0), sample(10), sample(20)]
  it('finds the closest sample', () => {
    expect(nearestSample(samples, -3)).toBe(0)
    expect(nearestSample(samples, 4)).toBe(0)
    expect(nearestSample(samples, 6)).toBe(1)
    expect(nearestSample(samples, 18)).toBe(2)
    expect(nearestSample(samples, 99)).toBe(2)
    expect(nearestSample([], 1)).toBe(-1)
  })
})

describe('niceMax', () => {
  it('rounds up to 1, 2 or 5 × 10ⁿ', () => {
    expect(niceMax(12_000)).toBe(20_000)
    expect(niceMax(20_000)).toBe(20_000)
    expect(niceMax(3_400_000)).toBe(5_000_000)
    expect(niceMax(5_100_000)).toBe(10_000_000)
  })

  it('never goes below the floor (an idle chart stays flat at the bottom)', () => {
    expect(niceMax(0)).toBe(10_000)
    expect(niceMax(0, 100)).toBe(100)
  })
})

describe('monotonePath', () => {
  it('handles short inputs', () => {
    expect(monotonePath([])).toBe('')
    expect(monotonePath([[0, 1]])).toBe('M0,1')
    expect(
      monotonePath([
        [0, 1],
        [2, 3],
      ]),
    ).toBe('M0,1L2,3')
  })

  it('draws cubic segments through every point', () => {
    const d = monotonePath([
      [0, 0],
      [1, 1],
      [2, 0],
    ])
    expect(d.startsWith('M0,0C')).toBe(true)
    expect(d.endsWith(',2,0')).toBe(true)
    expect(d.split('C')).toHaveLength(3)
  })

  it('never overshoots: control points stay within the neighbouring values', () => {
    const points: [number, number][] = [
      [0, 0],
      [1, 0],
      [2, 10],
      [3, 10],
      [4, 0],
    ]
    const controlYs = [...monotonePath(points).matchAll(/C([^C]+)/g)].flatMap((m) =>
      m[1]!
        .split(',')
        .filter((_, i) => i % 2 === 1)
        .map(Number),
    )
    for (const y of controlYs) {
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(10)
    }
  })
})
