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
 * Transform that puts a rail ball over its hero slot (t = 0) or leaves it in the rail (t = 1).
 * Rects are viewport rects { x, y, width } of the untransformed rail slot and the hero slot.
 * The transform origin is the top-left corner.
 * @returns {{ tx: number, ty: number, scale: number }}
 */
export function ballTransform(rail, hero, t) {
  if (!rail || !hero || !(rail.width > 0)) return { tx: 0, ty: 0, scale: 1 }
  const x = lerp(hero.x, rail.x, t)
  const y = lerp(hero.y, rail.y, t)
  const size = lerp(hero.width, rail.width, t)
  return { tx: x - rail.x, ty: y - rail.y, scale: size / rail.width }
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
