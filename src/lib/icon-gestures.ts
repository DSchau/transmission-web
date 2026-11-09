/*
 * The hover gestures some icons act out (see icon-motion.ts, which plays them).
 *
 * A gesture is a pure function of time. Each icon is split into slots: one or more of
 * its SVG children that move together. For every slot the gesture returns the same
 * eight numbers, so a frame is a flat array with a fixed layout. Two frames of the
 * same icon can always be interpolated, which is how a gesture picks up from whatever
 * is on screen when it's retriggered instead of jumping back to the start.
 *
 * Motion comes from springs and smooth bells, not keyframe segments, so velocity is
 * continuous throughout. Each gesture starts and ends exactly on the resting drawing
 * (icon-gestures.test.ts checks this), so nothing snaps when the gesture begins or ends.
 *
 * Every icon in the main app has a gesture, so none sits still while its neighbours move.
 * Each acts out what it stands for: the gear turns, the bin lid lifts, chevrons point the
 * way, a status shows its state and a category its kind. The spinner already spins, and
 * icons only used on the settings pages don't need one.
 */

/** x, y, rotation (deg), scale x, scale y, opacity, and the drawn span of the stroke (0–1). */
export const CHANNELS = 8
const REST = [0, 0, 0, 1, 1, 1, 0, 1]

export type Frame = number[]
export type SlotPose = [x: number, y: number, r: number, sx: number, sy: number, o: number, d0: number, d1: number]

/** The channels of slot `k` in a frame. */
export const slotPose = (f: Frame, k: number) => f.slice(k * CHANNELS, (k + 1) * CHANNELS) as SlotPose

export interface Slot {
  /** Indexes of the icon's SVG children that move together. */
  els: number[]
  /** Pivot for rotation and scale, in viewBox units. */
  origin: [x: number, y: number]
  /** A copy of the elements that only exists mid-gesture, rather than the elements themselves. */
  copy?: boolean
  /** Stroke width of the copy. */
  width?: number
  /** Fills the copy solid and gives it a glow, for a flash. */
  fill?: boolean
  /** Leaves a trail of fading echoes behind it while it moves. */
  trail?: boolean
  /** Clips it to this circle, so it slides out through the edge rather than fading. */
  clip?: [cx: number, cy: number, r: number]
  /** Turning it this many degrees leaves it looking the same (a gear one tooth on). */
  period?: number
}

export interface Gesture {
  /** Icon name, as in its `icon-…` class. */
  icon: string
  /** Only plays when the hovered control matches this selector. */
  only?: string
  /** Seconds. */
  duration: number
  slots: Slot[]
  pose: (t: number) => Frame
}

interface Pose {
  x?: number
  y?: number
  r?: number
  /** Uniform scale, multiplied into sx and sy. */
  s?: number
  sx?: number
  sy?: number
  o?: number
  d0?: number
  d1?: number
}

const frame = (...slots: Pose[]): Frame =>
  slots.flatMap(({ x = 0, y = 0, r = 0, s = 1, sx = 1, sy = 1, o = 1, d0 = 0, d1 = 1 }) => [
    x,
    y,
    r,
    s * sx,
    s * sy,
    o,
    d0,
    d1,
  ])

export const restFrame = (gesture: Gesture): Frame => gesture.slots.flatMap(() => REST)

export const lerpFrame = (a: Frame, b: Frame, w: number): Frame => a.map((v, i) => v + ((b[i] ?? v) - v) * w)

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** Progress through [start, end], clamped to 0–1. */
const span = (t: number, start: number, end: number) => clamp01((t - start) / (end - start))

/** CSS cubic-bezier easing. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const at = (a: number, b: number, u: number) => 3 * a * u * (1 - u) ** 2 + 3 * b * u * u * (1 - u) + u ** 3
  return (x: number) => {
    if (x <= 0 || x >= 1) return clamp01(x)
    let lo = 0
    let hi = 1
    let u = x
    for (let i = 0; i < 24; i++) {
      if (at(x1, x2, u) < x) lo = u
      else hi = u
      u = (lo + hi) / 2
    }
    return at(y1, y2, u)
  }
}

export const easeInOut = cubicBezier(0.65, 0, 0.35, 1)
const easeOut = cubicBezier(0.16, 1, 0.3, 1)

/** 0 → 1 → 0 with zero velocity at both ends. */
const bell = (u: number) => Math.sin(Math.PI * clamp01(u)) ** 2

/** Brings `v` to exactly `to` over the last part of a motion, so a spring's tail can't leave a residue. */
const settleTo = (v: number, to: number, t: number, end: number) => v + (to - v) * easeInOut(span(t, end * 0.6, end))

/**
 * A flick: a damped sine that leaps out to about ±1, recoils, and dies away to exactly 0
 * by `end` (seconds after it starts). `hz` sets how quick it is, `damping` how fast it settles.
 */
function flick(t: number, end: number, hz = 2.2, damping = 0.34) {
  if (t <= 0) return 0
  const w = 2 * Math.PI * hz
  const v = (Math.exp(-damping * w * t) * Math.sin(w * Math.sqrt(1 - damping ** 2) * t)) / 0.62
  return settleTo(v, 0, t, end)
}

/** A spring from 0 that overshoots 1 and lands exactly on it by `end`. */
function arrive(t: number, end: number, hz = 2, damping = 0.5) {
  if (t <= 0) return 0
  const w = 2 * Math.PI * hz
  const wd = w * Math.sqrt(1 - damping ** 2)
  const v = 1 - Math.exp(-damping * w * t) * (Math.cos(wd * t) + ((damping * w) / wd) * Math.sin(wd * t))
  return settleTo(v, 1, t, end)
}

/** A sideways shake that fades in and out over `end` seconds, `hz` times a second. */
const shake = (t: number, end: number, hz = 6) => Math.sin(2 * Math.PI * hz * t) * bell(span(t, 0, end))

/** A part, or the whole icon, nudging the way it points, with a springy recoil. */
const nudge = (icon: string, dx: number, dy: number, els = [0]): Gesture => ({
  icon,
  duration: 0.6,
  slots: [{ els, origin: [12, 12], trail: true }],
  pose: (t) => {
    const k = flick(t, 0.6, 2.4)
    return frame({ x: dx * k, y: dy * k })
  },
})

/** A turn that lands on the resting drawing because the part looks the same `deg` round. */
const spin = (icon: string, deg: number, rest: Slot[], turning: Slot, pop = 0): Gesture => ({
  icon,
  duration: 0.8,
  slots: [...rest, { ...turning, period: deg }],
  pose: (t) =>
    frame(...rest.map(() => ({ s: 1 - 0.06 * bell(span(t, 0.1, 0.5)) })), {
      r: deg * arrive(t - 0.04, 0.74, 1.6, 0.55),
      s: 1 + pop * bell(span(t, 0, 0.5)),
    }),
})

/** A tick or bar that undraws, then draws itself back, while its frame pops as it lands. `fromEnd` is for paths drawn from their long end. */
const redraw = (icon: string, frameEls: number[], mark: number[], fromEnd = false): Gesture => ({
  icon,
  duration: 0.8,
  slots: [
    ...(frameEls.length ? [{ els: frameEls, origin: [12, 12] as [number, number] }] : []),
    { els: mark, origin: [12, 12] },
  ],
  pose: (t) => {
    const shown = t < 0.12 ? 1 - easeInOut(span(t, 0, 0.12)) : easeOut(span(t, 0.14, 0.46))
    const tick = fromEnd ? { d0: 1 - shown } : { d1: shown }
    const pop = { s: 1 - 0.08 * bell(span(t, 0, 0.24)) + 0.07 * flick(t - 0.38, 0.4, 2.6) }
    return frame(...(frameEls.length ? [pop] : []), tick)
  },
})

/** Parts that each hop in turn, `gap` seconds apart, like a wave running through them. */
const wave = (
  icon: string,
  still: number[],
  parts: [els: number[], origin: [number, number]][],
  height = 2,
  gap = 0.08,
): Gesture => ({
  icon,
  duration: 0.4 + gap * parts.length,
  slots: [
    ...(still.length ? [{ els: still, origin: [12, 12] as [number, number] }] : []),
    ...parts.map(([els, origin]) => ({ els, origin })),
  ],
  pose: (t) =>
    frame(
      ...(still.length ? [{}] : []),
      ...parts.map((_, i) => ({ y: -height * bell(span(t, i * gap, i * gap + 0.32)) })),
    ),
})

/** The arrow of move-to-top/bottom pushes into its wall, which gives a little under the hit. */
const toLine = (icon: string, dir: 1 | -1, arrow: number[], line: number[], lineY: number): Gesture => ({
  icon,
  duration: 0.7,
  slots: [
    { els: arrow, origin: [12, 12], trail: true },
    { els: line, origin: [12, lineY] },
  ],
  pose: (t) => {
    const push = 2.4 * flick(t - 0.08, 0.6, 2.2) - 0.9 * bell(span(t, 0, 0.16))
    const give = 0.8 * flick(t - 0.17, 0.5, 3, 0.4)
    return frame({ y: dir * push }, { y: dir * give, sx: 1 - 0.06 * bell(span(t, 0.14, 0.4)) })
  },
})

/** Downloading/Seeding: the arrow slides out through the circle and a new one slides in behind it. */
const pass = (icon: string, dir: 1 | -1, arrow: number[]): Gesture => {
  const clip: [number, number, number] = [12, 12, 9]
  const travel = 15
  return {
    icon,
    duration: 0.75,
    slots: [
      { els: [0], origin: [12, 12] },
      { els: arrow, origin: [12, 12], clip },
      { els: arrow, origin: [12, 12], clip, copy: true },
    ],
    pose: (t) => {
      const y = dir * (travel * arrive(t - 0.08, 0.67, 1.7, 0.62) - 1.1 * bell(span(t, 0, 0.18)))
      return frame({ s: 1 - 0.05 * bell(span(t, 0.12, 0.5)) }, { y }, { y: y - dir * travel })
    },
  }
}

/** Sort direction: the bars shuffle into order and the arrow nudges the way the list runs. */
const sortBars = (icon: string): Gesture => ({
  icon,
  duration: 0.7,
  slots: [
    { els: [0], origin: [4, 6] },
    { els: [1], origin: [4, 12] },
    { els: [2], origin: [4, 18] },
    { els: [3, 4], origin: [18, 12], trail: true },
  ],
  pose: (t) =>
    frame(...[0, 1, 2].map((i) => ({ sx: 1 - 0.45 * bell(span(t, i * 0.07, i * 0.07 + 0.34)) })), {
      y: 2 * flick(t - 0.05, 0.6, 2.4),
    }),
})

/** A flash of light: snaps on by `at` and decays fast. */
const strobe = (t: number, at: number) => (t < at ? easeOut(span(t, at - 0.045, at)) : Math.exp(-(t - at) / 0.06))

/** Paused: one bar after the other takes a slow breath. */
const breathe = (t: number, delay: number) => 1 - 0.55 * bell(span(t, delay, delay + 0.6))

/** The pause bars breathe in turn; `rest` are the parts that stay put. */
const pauseBars = (icon: string, rest: number[], bars: [number, number], x: [number, number]): Gesture => ({
  icon,
  duration: 0.8,
  slots: [
    ...(rest.length ? [{ els: rest, origin: [12, 12] as [number, number] }] : []),
    { els: [bars[0]], origin: [x[0], 12] },
    { els: [bars[1]], origin: [x[1], 12] },
  ],
  pose: (t) => frame(...(rest.length ? [{}] : []), { sy: breathe(t, 0) }, { sy: breathe(t, 0.12) }),
})

export const gestures: Gesture[] = [
  // Navigation and layout.
  {
    // Settings: the gear clicks round two teeth (90°, so it lands on its resting look) and the hub tightens.
    icon: 'settings-gear-2',
    duration: 0.8,
    slots: [
      { els: [0], origin: [12, 12], period: 45 },
      { els: [1], origin: [12, 12] },
    ],
    pose: (t) =>
      frame(
        { r: 90 * arrive(t - 0.06, 0.74, 1.9, 0.5) - 6 * bell(span(t, 0, 0.14)) },
        { s: 1 - 0.2 * bell(span(t, 0.06, 0.4)) },
      ),
  },
  {
    // Shrink to the rail: the arrow points the way the panel is about to go, and the divider follows it.
    icon: 'sidebar-wide-left-arrow',
    duration: 0.65,
    slots: [
      { els: [2], origin: [8, 12] },
      { els: [0], origin: [14, 12], trail: true },
    ],
    pose: (t) => frame({ x: -1.3 * flick(t - 0.05, 0.6, 2.2) }, { x: -2.6 * flick(t, 0.6, 2.2) }),
  },
  {
    // Hide the rail: its handle tucks away to the left, thinning as it goes, and springs back.
    icon: 'sidebar-hidden-left-wide',
    duration: 0.65,
    slots: [{ els: [1], origin: [7, 12], trail: true }],
    pose: (t) => {
      const k = flick(t, 0.6, 2.2)
      return frame({ x: -2 * Math.max(0, k) + 0.6 * Math.max(0, -k), sy: 1 - 0.35 * bell(span(t, 0, 0.36)) })
    },
  },
  {
    // Bring the sidebar back: the divider sweeps open to the right.
    icon: 'sidebar-simple-left-wide',
    duration: 0.65,
    slots: [{ els: [1], origin: [9, 12], trail: true }],
    pose: (t) => frame({ x: 2.6 * flick(t, 0.6, 2.2) }),
  },
  nudge('chevron-right-medium', 2.2, 0),
  nudge('chevron-left-medium', -2.2, 0),
  nudge('chevron-down-medium', 0, 2.2),
  nudge('chevron-top-medium', 0, -2.2),
  {
    // Columns: the dividers slide apart and settle back.
    icon: 'columns-3',
    duration: 0.65,
    slots: [
      { els: [1], origin: [9.34, 12] },
      { els: [2], origin: [14.66, 12] },
    ],
    pose: (t) => frame({ x: -1.4 * flick(t, 0.6, 2.2) }, { x: 1.4 * flick(t - 0.04, 0.6, 2.2) }),
  },
  {
    // View options: the filter's lines narrow one after the other, like something passing through.
    icon: 'filter-2',
    duration: 0.65,
    slots: [
      { els: [0], origin: [12, 5] },
      { els: [2], origin: [12, 12] },
      { els: [1], origin: [12, 19] },
    ],
    pose: (t) => frame(...[0, 1, 2].map((i) => ({ sx: 1 - 0.4 * bell(span(t, i * 0.08, i * 0.08 + 0.36)) }))),
  },
  {
    // Sort: one arrow springs up while the other springs down.
    icon: 'arrow-top-bottom',
    duration: 0.7,
    slots: [
      { els: [0, 2], origin: [7, 12], trail: true },
      { els: [1, 3], origin: [17, 12], trail: true },
    ],
    pose: (t) => frame({ y: -2 * flick(t, 0.6, 2.4) }, { y: 2 * flick(t - 0.07, 0.6, 2.4) }),
  },
  sortBars('filter-asc'),
  sortBars('filter-desc'),
  {
    // Search: the magnifier swings across, scanning.
    icon: 'magnifying-glass',
    duration: 0.7,
    slots: [{ els: [0, 1], origin: [11, 11], trail: true }],
    pose: (t) => frame({ x: -1.6 * flick(t, 0.65, 2, 0.3), r: -12 * flick(t - 0.03, 0.65, 2, 0.3) }),
  },
  // Close and add: the cross and the plus spin a quarter turn.
  spin('cross-medium', 90, [], { els: [0], origin: [12, 12] }, -0.12),
  spin('plus-medium', 90, [], { els: [0], origin: [12, 12] }, 0.12),
  wave(
    'dot-grid-1x3-horizontal',
    [],
    [
      [[2], [4, 12]],
      [[0], [12, 12]],
      [[1], [20, 12]],
    ],
  ),
  wave(
    'circle-dots-center-1',
    [0],
    [
      [[1], [8, 12]],
      [[2], [12, 12]],
      [[3], [16, 12]],
    ],
    1.6,
  ),

  // Torrent actions: each previews what it does.
  nudge('play', 2, 0),
  pauseBars('pause', [], [0, 1], [7, 17]),
  {
    // Resume now: the triangles dash forward, the leading one first.
    icon: 'fast-forward',
    duration: 0.7,
    slots: [
      { els: [1], origin: [17, 12], trail: true },
      { els: [0], origin: [9, 12], trail: true },
    ],
    pose: (t) => frame({ x: 2.2 * flick(t, 0.6, 2.4) }, { x: 2.2 * flick(t - 0.07, 0.6, 2.4) }),
  },
  toLine('arrow-wall-down', 1, [0, 1], [2], 21),
  toLine('arrow-wall-up', -1, [0, 1], [2], 3),
  nudge('arrow-up', 0, -2.2, [0, 1]),
  nudge('arrow-down', 0, 2.2, [0, 1]),
  {
    // Queue: the numbers hop in turn and their rows stretch.
    icon: 'numbered-list',
    duration: 0.65,
    slots: [
      { els: [2], origin: [5, 7] },
      { els: [1], origin: [12, 7] },
      { els: [3], origin: [5.6, 17] },
      { els: [0], origin: [12, 17] },
    ],
    pose: (t) =>
      frame(
        { y: -1.6 * bell(span(t, 0, 0.3)) },
        { sx: 1 - 0.3 * bell(span(t, 0.04, 0.36)) },
        { y: -1.6 * bell(span(t, 0.12, 0.42)) },
        { sx: 1 - 0.3 * bell(span(t, 0.16, 0.48)) },
      ),
  },
  {
    // Rename: the pencil scribbles from its tip.
    icon: 'pencil',
    duration: 0.65,
    slots: [{ els: [0, 1], origin: [3, 21] }],
    pose: (t) => frame({ x: 1.2 * shake(t, 0.6, 5), r: -5 * bell(span(t, 0, 0.6)) }),
  },
  {
    // Set location: the folder flips open on its spine and shuts.
    icon: 'folder-1',
    duration: 0.7,
    slots: [{ els: [0], origin: [3, 19] }],
    pose: (t) => frame({ r: -9 * flick(t, 0.65, 2, 0.4), sy: 1 - 0.06 * bell(span(t, 0.3, 0.55)) }),
  },
  // Verify: the shield's tick checks itself again.
  redraw('shield-check', [0], [1]),
  {
    // Ask for more peers: the signal pulses out from the tower, inner wave then outer.
    icon: 'signal-tower',
    duration: 0.75,
    slots: [
      { els: [1], origin: [12, 9.5] },
      { els: [2], origin: [12, 9.5] },
      { els: [0], origin: [12, 9.5] },
    ],
    pose: (t) => {
      const ring = (delay: number) => ({
        s: 1 + 0.16 * bell(span(t, delay, delay + 0.4)),
        o: 1 - 0.6 * bell(span(t, delay, delay + 0.4)),
      })
      return frame(ring(0.06), ring(0.18), { s: 1 + 0.5 * bell(span(t, 0, 0.3)) })
    },
  },
  {
    // Copy magnet link: the links pull apart and snap back together.
    icon: 'chain-link-1',
    duration: 0.65,
    slots: [
      { els: [0], origin: [8, 16] },
      { els: [1], origin: [16, 8] },
    ],
    pose: (t) => {
      const k = 1.1 * flick(t, 0.6, 2.4, 0.4)
      return frame({ x: -k, y: k }, { x: k, y: -k })
    },
  },
  {
    // Magnet link field: the same pull and snap, side to side.
    icon: 'chain-link-2',
    duration: 0.65,
    slots: [
      { els: [2], origin: [5, 12] },
      { els: [1], origin: [19, 12] },
      { els: [0], origin: [12, 12] },
    ],
    pose: (t) => {
      const k = 1.4 * flick(t, 0.6, 2.4, 0.4)
      return frame({ x: -k }, { x: k }, { sx: 1 + 0.15 * flick(t, 0.6, 2.4, 0.4) })
    },
  },
  {
    // Copy: a new sheet peels off the back one and lands on the front one, nudging it.
    icon: 'square-behind-square-1',
    duration: 0.75,
    slots: [
      { els: [1], origin: [15, 15] },
      { els: [1], origin: [15, 15], copy: true },
    ],
    pose: (t) => {
      const back = -6 * (1 - arrive(t, 0.5, 2.1, 0.6))
      const shove = 1.3 * flick(t - 0.2, 0.5, 2.4)
      const o = easeOut(span(t, 0, 0.12)) * (1 - easeInOut(span(t, 0.4, 0.6)))
      return frame({ x: shove, y: shove }, { x: back, y: back, o })
    },
  },
  {
    // Remove: the lid lifts off the bin on its hinge and drops back on; the bin takes the landing.
    icon: 'trash-can',
    duration: 0.75,
    slots: [
      { els: [3, 4], origin: [3.5, 6] },
      { els: [0, 1, 2], origin: [12, 21] },
    ],
    pose: (t) => {
      const k = flick(t, 0.7, 1.8, 0.4)
      const lift = k > 0 ? k : 0.35 * k
      return frame({ y: -2 * lift, r: -16 * lift }, { sy: 1 - 0.06 * bell(span(t, 0.26, 0.5)) })
    },
  },
  {
    // Remove and delete data: the page shudders and its cross spins a quarter turn.
    icon: 'page-cross',
    duration: 0.8,
    slots: [
      { els: [0], origin: [12, 12] },
      { els: [1], origin: [19, 19], period: 90 },
    ],
    pose: (t) =>
      frame(
        { x: 0.7 * shake(t, 0.5, 7) },
        { r: 90 * arrive(t - 0.04, 0.74, 1.6, 0.55), s: 1 + 0.25 * bell(span(t, 0, 0.5)) },
      ),
  },

  // Adding torrents.
  {
    // Add a file: the arrow springs into the page.
    icon: 'file-arrow-left-in',
    duration: 0.6,
    slots: [{ els: [2, 3], origin: [8, 19], trail: true }],
    pose: (t) => frame({ x: 2.4 * flick(t - 0.06, 0.54, 2.4) - 0.7 * bell(span(t, 0, 0.14)) }),
  },
  {
    // Paste: the clipboard hops and lands with a squash.
    icon: 'clipboard',
    duration: 0.7,
    slots: [{ els: [0], origin: [12, 21] }],
    pose: (t) => {
      const land = flick(t - 0.3, 0.38, 3, 0.4)
      return frame({ y: -2 * bell(span(t, 0, 0.34) ** 0.8), sy: 1 - 0.08 * land })
    },
  },

  // App menu.
  redraw('square-check', [0], [1], true),
  {
    // Alternative speeds: the needle drops back, then eases up to where it was.
    icon: 'limit',
    duration: 0.8,
    slots: [{ els: [0], origin: [12, 13] }],
    pose: (t) => frame({ r: -40 * flick(t, 0.75, 1.5, 0.4) }),
  },
  {
    // Appearance: the dark half rocks to and fro, like a dial between light and dark.
    icon: 'appearance-light-mode',
    duration: 0.75,
    slots: [{ els: [1], origin: [12, 12] }],
    pose: (t) => frame({ r: -40 * flick(t, 0.7, 1.8, 0.35) }),
  },
  {
    // Light: the sun turns one ray on and glows.
    icon: 'sun',
    duration: 0.8,
    slots: [{ els: [0], origin: [12, 12], period: 45 }],
    pose: (t) => frame({ r: 45 * arrive(t - 0.04, 0.74, 1.6, 0.55), s: 1 + 0.1 * bell(span(t, 0, 0.5)) }),
  },
  {
    // Dark: the moon rocks like a cradle.
    icon: 'moon',
    duration: 0.75,
    slots: [{ els: [0], origin: [12, 12] }],
    pose: (t) => frame({ r: -16 * flick(t, 0.7, 1.8, 0.3) }),
  },
  {
    // Theme: the paint dabs pop one after the other.
    icon: 'color-palette-2',
    duration: 0.7,
    slots: [
      { els: [4], origin: [7.05, 13.25] },
      { els: [3], origin: [8.25, 8.15] },
      { els: [2], origin: [13.35, 6.95] },
      { els: [1], origin: [17.25, 10.65] },
    ],
    pose: (t) => frame(...[0, 1, 2, 3].map((i) => ({ s: 1 + 0.7 * bell(span(t, i * 0.07, i * 0.07 + 0.3)) }))),
  },
  {
    // Statistics: the chart dips and its bars spring back up.
    icon: 'line-chart-1',
    duration: 0.7,
    slots: [{ els: [0], origin: [12, 20] }],
    pose: (t) => frame({ sy: 1 - 0.18 * bell(span(t, 0, 0.2)) + 0.1 * flick(t - 0.16, 0.5, 2.4) }),
  },
  {
    // Connection: the plug pushes up into its socket and the cord follows.
    icon: 'plugin-1',
    duration: 0.7,
    slots: [
      { els: [0, 2, 3], origin: [12, 12] },
      { els: [1], origin: [12, 21] },
    ],
    pose: (t) => {
      const k = flick(t - 0.04, 0.6, 2.2)
      return frame({ y: -1.8 * k }, { y: -1.8 * k, sy: 1 + 0.4 * Math.max(0, k) })
    },
  },

  // Checks in menus and the select list, and the indeterminate checkbox.
  redraw('checkmark-1', [], [0]),
  {
    icon: 'minus-medium',
    duration: 0.6,
    slots: [{ els: [0], origin: [12, 12] }],
    pose: (t) => frame({ sx: 1 - 0.4 * bell(span(t, 0, 0.22)) + 0.12 * flick(t - 0.18, 0.4, 2.6) }),
  },

  // Categories, shown on each torrent: each acts out its kind.
  {
    // Movies: the clapper's stripes run along like film.
    icon: 'clapboard',
    duration: 0.65,
    slots: [{ els: [2, 3], origin: [12, 6.5] }],
    pose: (t) => frame({ x: 1.6 * flick(t, 0.6, 2.4) }),
  },
  {
    // TV: the screen switches on with a flick.
    icon: 'television',
    duration: 0.6,
    slots: [{ els: [0], origin: [12, 10] }],
    pose: (t) =>
      frame({
        sy: 1 - 0.3 * bell(span(t, 0, 0.18)) + 0.08 * flick(t - 0.14, 0.45, 2.8),
        o: 1 - 0.5 * bell(span(t, 0, 0.2)),
      }),
  },
  {
    // Books: the lines of text are read, one after the other.
    icon: 'book',
    duration: 0.6,
    slots: [
      { els: [1], origin: [9, 7] },
      { els: [2], origin: [9, 11] },
    ],
    pose: (t) => frame({ sx: 1 - 0.7 * bell(span(t, 0, 0.36)) }, { sx: 1 - 0.7 * bell(span(t, 0.12, 0.48)) }),
  },
  {
    // Music: the notes sway to a beat.
    icon: 'audio',
    duration: 0.7,
    slots: [{ els: [0, 1, 2], origin: [12, 20] }],
    pose: (t) => frame({ r: 9 * shake(t, 0.66, 3), y: -1 * bell(span(t, 0, 0.66)) }),
  },
  {
    // Software: the disc spins half a turn; its shine looks the same either way up.
    icon: 'cd',
    duration: 1,
    slots: [{ els: [1], origin: [12, 12], period: 180 }],
    pose: (t) => frame({ r: 180 * arrive(t, 0.94, 1.1, 0.6) }),
  },
  {
    // Other: the page's corner folds in and springs out.
    icon: 'file-bend',
    duration: 0.6,
    slots: [{ els: [1], origin: [18.5, 3.5] }],
    pose: (t) => frame({ s: 1 - 0.45 * bell(span(t, 0, 0.3)) + 0.12 * flick(t - 0.24, 0.34, 2.8) }),
  },

  // Status: each acts out what it means.
  {
    // All: the tray hops and catches something as it lands.
    icon: 'inbox-empty',
    duration: 0.75,
    slots: [
      { els: [0], origin: [12, 19] },
      { els: [1], origin: [12, 19] },
    ],
    pose: (t) => {
      const hop = -2 * bell(span(t, 0, 0.34) ** 0.8)
      const land = flick(t - 0.3, 0.42, 3, 0.4)
      return frame({ y: hop, sy: 1 - 0.1 * land }, { y: hop + 1.2 * Math.max(0, land), sy: 1 - 0.1 * land })
    },
  },
  {
    // Active: the bolt goes dark, current strikes down its outline, and when it lands the
    // bolt flashes solid twice, like lightning, with a jolt.
    icon: 'zap',
    duration: 0.9,
    slots: [
      { els: [0], origin: [12, 12] },
      { els: [0], origin: [12, 12], copy: true, width: 2.5 },
      { els: [0], origin: [12, 12], copy: true, fill: true },
    ],
    pose: (t) => {
      const jolt = 1 + 0.14 * flick(t - 0.3, 0.55, 3, 0.36)
      const dim = easeInOut(span(t, 0, 0.08)) * (1 - easeInOut(span(t, 0.4, 0.62)))
      const strike = easeInOut(span(t, 0.04, 0.3))
      const flash = Math.min(1, strobe(t, 0.32) + 0.65 * strobe(t, 0.47))
      return frame(
        { s: jolt, o: 1 - 0.85 * dim },
        { s: jolt, d1: strike, o: 1 - easeInOut(span(t, 0.5, 0.75)) },
        { s: jolt, o: settleTo(flash, 0, t, 0.85) },
      )
    },
  },
  pass('arrow-down-circle', 1, [1]),
  pass('arrow-up-circle', -1, [1, 2]),
  pauseBars('pause-circle', [0], [1, 2], [10, 14]),
  // Completed: the tick draws itself back in reverse, then forwards again, and the ring pops as it lands.
  redraw('check-circle', [0], [1], true),
  {
    // Errors: the sign rocks on its base and the dot swells like a warning light.
    icon: 'exclamation-triangle',
    duration: 0.75,
    slots: [
      { els: [0, 1], origin: [12, 19] },
      { els: [2, 3], origin: [12, 15] },
    ],
    pose: (t) => {
      const r = -10 * flick(t, 0.7, 2.2, 0.28)
      const a = (r * Math.PI) / 180
      // The dot rides the rocking sign: (12, 15) turned about the base at (12, 19).
      return frame({ r }, { r, x: -4 * Math.sin(a), y: 4 - 4 * Math.cos(a), s: 1 + 0.8 * bell(span(t, 0.06, 0.42)) })
    },
  },
  // A failed check: the cross turns a quarter and the ring pops.
  spin('circle-x', 90, [{ els: [0], origin: [12, 12] }], { els: [1, 2], origin: [12, 12] }),
  {
    // Warning: the exclamation shakes.
    icon: 'exclamation-circle',
    duration: 0.6,
    slots: [{ els: [1, 2], origin: [12, 12] }],
    pose: (t) => frame({ x: 1.2 * shake(t, 0.5, 7) }),
  },
  {
    // Info: the dot hops off the stem and lands on it.
    icon: 'circle-info',
    duration: 0.65,
    slots: [
      { els: [2], origin: [12, 8] },
      { els: [1], origin: [12, 16] },
    ],
    pose: (t) => {
      const land = flick(t - 0.3, 0.34, 3, 0.4)
      return frame({ y: -2 * bell(span(t, 0, 0.34) ** 0.8) }, { sy: 1 - 0.12 * Math.max(0, land) })
    },
  },
  {
    // Help: the question mark tilts its head.
    icon: 'circle-questionmark',
    duration: 0.7,
    slots: [{ els: [1, 2], origin: [12, 16] }],
    pose: (t) => frame({ r: -14 * flick(t, 0.65, 2, 0.3) }),
  },
  {
    // Encrypted: the shackle lifts and clicks shut.
    icon: 'lock',
    duration: 0.65,
    slots: [
      { els: [1], origin: [12, 10] },
      { els: [0, 2], origin: [12, 21] },
    ],
    pose: (t) => {
      const k = flick(t, 0.6, 2.2, 0.4)
      return frame({ y: -1.8 * Math.max(0, k) }, { sy: 1 - 0.05 * Math.max(0, -k) })
    },
  },
  {
    // Can't connect: the cloud drifts off and back.
    icon: 'cloud-off',
    duration: 0.7,
    slots: [{ els: [0], origin: [12, 12] }],
    pose: (t) => frame({ x: 1.4 * flick(t, 0.65, 1.8, 0.4), o: 1 - 0.35 * bell(span(t, 0, 0.5)) }),
  },
  {
    // Sign in: the key turns in the lock.
    icon: 'key-2',
    duration: 0.7,
    slots: [{ els: [0, 1], origin: [15.5, 8.5] }],
    pose: (t) => frame({ r: 25 * flick(t, 0.65, 2, 0.4) }),
  },
]
