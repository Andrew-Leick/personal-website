// Pure math for the v4 scroll journey (Poké Balls gliding from the hero into the rail).
// No DOM access here, so it is unit-tested in Node.

export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value))

export const lerp = (from, to, t) => from + (to - from) * t

/** Smooth start and stop (cubic in-out). */
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

/**
 * Journey progress: 0 at the top of the page, 1 once the page has scrolled `travel` px.
 * A travel of 0 or less means the hero is already gone (progress 1).
 */
export function heroProgress(scrollY, travel) {
  if (!(travel > 0)) return 1
  return clamp(scrollY / travel)
}

/** Progress after a hold: 0 until `p` passes `hold`, then 0 to 1 over the rest. */
export const afterHold = (p, hold) => (hold > 0 ? clamp((p - hold) / (1 - hold)) : clamp(p))

/**
 * Progress of ball `index` of `count`. Later balls start a little later, so the balls
 * leave the hero one after another. Every ball still ends at 1 when `p` reaches 1.
 */
export function staggered(p, index, count, spread = 0.18) {
  if (count <= 1) return clamp(p)
  const start = (spread * index) / (count - 1)
  return clamp((p - start) / (1 - spread))
}

/**
 * Point at `t` on a quadratic curve from `from` to `to` whose control point sits `lift` px
 * above the midpoint, so a positive lift gives a throw-like arc. lift 0 is a straight line.
 * @param {{ x: number, y: number }} from
 * @param {{ x: number, y: number }} to
 */
export function arcPoint(from, to, lift, t) {
  const cx = (from.x + to.x) / 2
  const cy = (from.y + to.y) / 2 - lift
  const u = 1 - t
  return {
    x: u * u * from.x + 2 * u * t * cx + t * t * to.x,
    y: u * u * from.y + 2 * u * t * cy + t * t * to.y,
  }
}

/** Arc height for a throw of this length: a quarter of the distance, at most 120px. */
export function arcLift(from, to, max = 120) {
  return Math.min(max, Math.hypot(to.x - from.x, to.y - from.y) * 0.25)
}

/**
 * Transform that puts a rail ball over its hero slot (t = 0) or leaves it in the rail (t = 1),
 * travelling on an arc `lift` px high (0 = straight).
 * Rects are viewport rects { x, y, width } of the untransformed rail slot and the hero slot.
 * The transform origin is the top-left corner.
 * @returns {{ tx: number, ty: number, scale: number }}
 */
export function ballTransform(rail, hero, t, lift = 0) {
  if (!rail || !hero || !(rail.width > 0)) return { tx: 0, ty: 0, scale: 1 }
  const { x, y } = arcPoint(hero, rail, lift, t)
  const size = lerp(hero.width, rail.width, t)
  return { tx: x - rail.x, ty: y - rail.y, scale: size / rail.width }
}

/** In-flight tilt in degrees: 0 at both ends, up to -max mid-flight, in `steps` pixel steps. */
export function tilt(t, max = 12, steps = 3) {
  return (-max * Math.round(Math.sin(Math.PI * clamp(t)) * steps)) / steps
}

/**
 * Spin of a thrown ball, in degrees, at flight time `t` (0 to 1). It turns forward from
 * `start` to the next full turn over the first `share` of the flight, slowing smoothly into
 * upright (ease-out), so the spin is easy to see and the ball is upright (a multiple of
 * 360°) for the slow final approach: it lands upright, never snapping at the slot.
 */
export function spinAngle(t, start = 0, share = 0.6) {
  const from = ((start % 360) + 360) % 360
  const remaining = from === 0 ? 360 : 360 - from
  const x = clamp(t / share)
  return from + remaining * (1 - (1 - x) ** 2)
}

/**
 * Launch order for the balls: the shortest path leaves first, so the balls never bunch.
 * Returns each ball's rank (0 = first) in input order. Ties keep input order.
 * @param {number[]} distances
 */
export function staggerOrder(distances) {
  const order = distances.map((d, i) => [d, i]).sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const ranks = new Array(distances.length)
  order.forEach(([, i], rank) => {
    ranks[i] = rank
  })
  return ranks
}

/**
 * Rail track fill (0 to 1) that reaches ball i exactly when section i becomes active and
 * moves through each section in proportion: like Pac-Man eating the dots.
 * 0 while the hero is showing; 1 once the last section is active.
 * @param {number[]} tops  viewport tops of the sections, in document order
 * @param {number} line    the activation line (viewport y)
 */
export function trackProgress(tops, line) {
  const n = tops.length
  if (n === 0 || tops[0] > line) return 0
  if (n === 1) return 1
  let i = 0
  while (i + 1 < n && tops[i + 1] <= line) i += 1
  if (i === n - 1) return 1
  const span = tops[i + 1] - tops[i]
  const within = span > 0 ? clamp((line - tops[i]) / span) : 0
  return (i + within) / (n - 1)
}

/**
 * Active section: the last one whose top is at or above `line` (a viewport y, e.g. 40% of
 * the height). Returns `fallback` (the hero) when none has reached the line yet.
 * @param {{ id: string, top: number }[]} sections  in document order, viewport tops
 */
export function pickActive(sections, line, fallback = 'home') {
  let active = fallback
  for (const section of sections) {
    if (section.top <= line) active = section.id
    else break
  }
  return active
}
