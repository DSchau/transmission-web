/*
 * Plays the icon gestures in icon-gestures.ts when a control is hovered, focused from the
 * keyboard or highlighted in a menu. Imported once for its side effect; no component needs
 * to know about it.
 *
 * While a gesture plays, each moving part of the icon is drawn by a clone in an overlay
 * group, the original is hidden, and one requestAnimationFrame loop writes every clone's
 * pose each frame. Clones can be clipped, have their stroke partly drawn, and leave a trail
 * of fading echoes, none of which a CSS animation of lucide's own elements could do. At the
 * end the overlay is removed and the originals shown again; the last frame is the resting
 * drawing, so the hand-back can't be seen.
 *
 * A gesture always plays to the end, even if the pointer leaves, so it never snaps back.
 * Retriggered once mostly done, it morphs from what's on screen into a fresh run.
 */
import { clamp01, easeInOut, type Frame, type Gesture, gestures, lerpFrame, type Slot, slotPose } from './icon-gestures'

const SVG = 'http://www.w3.org/2000/svg'
const TRIGGER =
  'button, a, label, [role="tab"], [role="option"], [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]'
/** Seconds to morph from the frame on screen into a retriggered gesture. */
const BLEND = 0.2
/** How far behind the part each echo is, in seconds, and how strong it is at full speed. */
const ECHOES = [
  [0.03, 0.34],
  [0.06, 0.2],
  [0.09, 0.1],
] as const

const byIcon = new Map(gestures.map((g) => [g.icon, g]))

interface Part {
  slot: Slot
  /** The clone drawing the part, inside the clip group when it has one. */
  body: SVGGElement
  echoes: SVGGElement[]
}

interface Run {
  gesture: Gesture
  svg: SVGSVGElement
  start: number
  /** The frame on screen when it was retriggered, to morph from. */
  from?: Frame
  layer: SVGGElement
  parts: Part[]
  hidden: Element[]
}

const runs = new Map<SVGSVGElement, Run>()
let raf = 0
let clipIds = 0

function sample(run: Run, t: number): Frame {
  const frame = run.gesture.pose(Math.min(Math.max(t, 0), run.gesture.duration))
  return run.from ? lerpFrame(run.from, frame, easeInOut(clamp01(t / BLEND))) : frame
}

function cloneParts(svg: SVGSVGElement, slot: Slot) {
  const g = document.createElementNS(SVG, 'g')
  const children = [...svg.children].filter((el) => !el.hasAttribute('data-icon-motion'))
  for (const i of slot.els) {
    const el = children[i]?.cloneNode() as SVGGeometryElement | undefined
    if (!el) continue
    if (slot.width) el.setAttribute('stroke-width', String(slot.width))
    el.setAttribute('pathLength', '1')
    g.append(el)
  }
  return g
}

function start(svg: SVGSVGElement, gesture: Gesture, now: number, from?: Frame) {
  const layer = document.createElementNS(SVG, 'g')
  layer.setAttribute('data-icon-motion', '')
  const children = [...svg.children]
  const hidden: Element[] = []
  const parts = gesture.slots.map((slot) => {
    let parent: SVGElement = layer
    if (slot.clip) {
      const id = `icon-motion-clip-${++clipIds}`
      const clipPath = document.createElementNS(SVG, 'clipPath')
      clipPath.id = id
      const circle = document.createElementNS(SVG, 'circle')
      const [cx, cy, r] = slot.clip
      circle.setAttribute('cx', String(cx))
      circle.setAttribute('cy', String(cy))
      circle.setAttribute('r', String(r))
      clipPath.append(circle)
      parent = document.createElementNS(SVG, 'g')
      parent.setAttribute('clip-path', `url(#${id})`)
      layer.append(clipPath, parent)
    }
    const echoes = slot.trail ? ECHOES.map(() => cloneParts(svg, slot)) : []
    const body = cloneParts(svg, slot)
    parent.append(...[...echoes].reverse(), body)
    if (!slot.copy) for (const i of slot.els) if (children[i]) hidden.push(children[i])
    return { slot, body, echoes }
  })
  svg.append(layer)
  for (const el of hidden) (el as SVGElement).style.visibility = 'hidden'
  const run: Run = { gesture, svg, start: now, from, layer, parts, hidden }
  runs.set(svg, run)
  draw(run, 0)
}

function stop(run: Run) {
  run.layer.remove()
  for (const el of run.hidden) (el as SVGElement).style.removeProperty('visibility')
  runs.delete(run.svg)
}

/** Writes one slot's pose onto a clone group, at `strength` of its own opacity. */
function paint(g: SVGGElement, slot: Slot, f: Frame, k: number, strength: number) {
  const [x, y, r, sx, sy, o, d0, d1] = slotPose(f, k)
  const [ox, oy] = slot.origin
  g.setAttribute('transform', `translate(${ox + x} ${oy + y}) rotate(${r}) scale(${sx} ${sy}) translate(${-ox} ${-oy})`)
  const drawn = d1 - d0
  g.setAttribute('opacity', String(drawn > 0.001 ? clamp01(o) * strength : 0))
  for (const el of g.children) {
    if (drawn >= 0.999) {
      el.removeAttribute('stroke-dasharray')
      el.removeAttribute('stroke-dashoffset')
    } else {
      el.setAttribute('stroke-dasharray', `${Math.max(drawn, 0)} 2`)
      el.setAttribute('stroke-dashoffset', String(-d0))
    }
  }
}

/** How far a part moved between two frames, in viewBox units (degrees count as their arc at the icon's edge). */
function distance(a: Frame, b: Frame, k: number) {
  const [ax, ay, ar, asx, asy] = slotPose(a, k)
  const [bx, by, br, bsx, bsy] = slotPose(b, k)
  return Math.hypot(ax - bx, ay - by) + Math.abs(ar - br) * 0.14 + (Math.abs(asx - bsx) + Math.abs(asy - bsy)) * 8
}

function draw(run: Run, t: number) {
  const now = sample(run, t)
  run.parts.forEach(({ slot, body, echoes }, k) => {
    paint(body, slot, now, k, 1)
    echoes.forEach((echo, e) => {
      const [lag, strength] = ECHOES[e] ?? ECHOES[0]
      const then = sample(run, t - lag)
      // Echoes only show while the part is moving, so a still icon has no ghost.
      paint(echo, slot, then, k, strength * clamp01(distance(now, then, k) / 1.2))
    })
  })
}

function tick(time: number) {
  for (const run of runs.values()) {
    const t = (time - run.start) / 1000
    if (!run.svg.isConnected || t >= run.gesture.duration) stop(run)
    else draw(run, t)
  }
  raf = runs.size ? requestAnimationFrame(tick) : 0
}

function play(control: Element) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  for (const svg of control.querySelectorAll<SVGSVGElement>('svg.lucide')) {
    const name = [...svg.classList].find((c) => c.startsWith('lucide-') && byIcon.has(c.slice(7)))
    const gesture = name && byIcon.get(name.slice(7))
    if (!gesture || (gesture.only && !control.matches(gesture.only))) continue
    const now = performance.now()
    const running = runs.get(svg)
    if (running) {
      // Let it play out, unless it's mostly settled and has no copies, which would show twice mid-morph.
      const t = (now - running.start) / 1000
      if (t < gesture.duration * 0.6 || gesture.slots.some((s) => s.copy)) continue
      const from = sample(running, t)
      stop(running)
      start(svg, gesture, now, from)
    } else start(svg, gesture, now)
  }
  if (runs.size && !raf) raf = requestAnimationFrame(tick)
}

if (typeof document !== 'undefined') {
  document.addEventListener('pointerover', (e) => {
    const control = (e.target as Element).closest?.(TRIGGER)
    // Moving between the control's own children isn't a new hover.
    if (control && !(e.relatedTarget instanceof Node && control.contains(e.relatedTarget))) play(control)
  })
  document.addEventListener('focusin', (e) => {
    const target = e.target as Element
    const control = target.closest?.(TRIGGER)
    // Menus move focus as the highlight moves; anywhere else only keyboard focus counts.
    if (control && (target.matches(':focus-visible') || control.matches('[role^="menuitem"], [role="option"]')))
      play(control)
  })
}
