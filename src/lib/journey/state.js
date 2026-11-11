// Small shared state for the v4 journey, kept outside React so scroll handlers never
// re-render the page.

/** Rail ball element per page id: where intros throw from and recall to. */
const balls = new Map()

export function registerBall(id, element) {
  if (element) balls.set(id, element)
  else balls.delete(id)
}

export function getBall(id) {
  return balls.get(id) ?? null
}

/**
 * Programmatic scrolling (src/lib/journey/glide.js). While it runs, the scroll spy does not
 * rewrite the URL, and section intros the page only passes on the way do not play.
 * `target` is the journey section id the glide is heading to (null = top or unknown).
 */
let gliding = false
let glideTarget = null
const glideEndListeners = new Set()

export function beginGlide(target = null) {
  gliding = true
  glideTarget = target
}

export function endGlide() {
  gliding = false
  glideTarget = null
}

export function isAutoScrolling() {
  return gliding
}

export function autoScrollTarget() {
  return glideTarget
}

/** Run `callback({ target, cancelled })` at every glide end. Returns an unsubscribe. */
export function onGlideEnd(callback) {
  glideEndListeners.add(callback)
  return () => glideEndListeners.delete(callback)
}

export function emitGlideEnd(info) {
  ;[...glideEndListeners].forEach((listener) => listener(info))
}
