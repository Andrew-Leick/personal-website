// Small shared state for the v4 journey, kept outside React so scroll handlers never
// re-render the page.

/** Page ids whose section intro has already played (or must not play) this page load. */
const revealed = new Set()

export function isRevealed(id) {
  return revealed.has(id)
}

export function markRevealed(id) {
  revealed.add(id)
}

/** Rail ball element per page id, so a hero click can open the ball shown over its slot. */
const balls = new Map()

export function registerBall(id, element) {
  if (element) balls.set(id, element)
  else balls.delete(id)
}

export function getBall(id) {
  return balls.get(id) ?? null
}

/**
 * Programmatic scrolling (a link click gliding to a section). While it runs, the scroll
 * spy must not rewrite the URL to each section the page passes on the way.
 */
let autoScrollUntil = 0

export function startAutoScroll(maxMs = 1500) {
  autoScrollUntil = performance.now() + maxMs
}

export function endAutoScroll() {
  autoScrollUntil = 0
}

export function isAutoScrolling() {
  return performance.now() < autoScrollUntil
}
