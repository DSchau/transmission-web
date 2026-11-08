import { describe, expect, test } from 'vitest'
import { CHANNELS, type Frame, type Gesture, gestures, type Slot, type SlotPose, slotPose } from './icon-gestures'

const REST = [0, 0, 0, 1, 1, 1, 0, 1]

/** Whether a slot draws nothing: transparent, no stroke left, or slid out of its clip (the arrows reach 4 units from their centre). */
function invisible(slot: Slot, [x, y, , , , o, d0, d1]: SlotPose) {
  return o <= 0.001 || d1 - d0 <= 0.001 || (slot.clip !== undefined && Math.hypot(x, y) >= slot.clip[2] + 4)
}

/** What's visible, by the elements drawn: each must sit exactly where it rests. */
function visible(gesture: Gesture, f: Frame) {
  const drawn = new Map<string, number[]>()
  gesture.slots.forEach((slot, k) => {
    const p = slotPose(f, k)
    if (slot.period) p[2] %= slot.period
    if (!invisible(slot, p))
      drawn.set(
        slot.els.join(),
        p.map((v) => Math.round(v * 1e4) / 1e4 + 0),
      )
  })
  return drawn
}

describe.each(gestures.map((g) => [g.icon, g] as const))('%s', (_, gesture) => {
  const rest = new Map(gesture.slots.filter((s) => !s.copy).map((s) => [s.els.join(), REST]))

  test('starts and ends on the resting drawing', () => {
    expect(visible(gesture, gesture.pose(0))).toEqual(rest)
    expect(visible(gesture, gesture.pose(gesture.duration))).toEqual(rest)
  })

  test('never jumps between frames', () => {
    const step = 1 / 240
    for (let t = step; t <= gesture.duration; t += step) {
      const a = gesture.pose(t - step)
      const b = gesture.pose(t)
      for (let i = 0; i < a.length; i++)
        expect(Math.abs(b[i]! - a[i]!), `channel ${i} at ${t.toFixed(3)}s`).toBeLessThan(i % CHANNELS === 2 ? 4 : 0.5)
    }
  })
})
