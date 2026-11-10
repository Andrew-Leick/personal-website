// Small shared state for the v4 journey, kept outside React so scroll handlers never
// re-render the page.

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
 * Programmatic scrolling (src/lib/journey/glide.js). While it runs, the scroll spy does not
 * rewrite the URL, and section intros the page only passes on the way do not play.
 * `target` is the journey section id the glide is heading to (null = top or unknown).
 */
let gliding = false
let glideTarget = null
const glideEndListeners = new Set()

export function setAutoScroll(on, target = null) {
  gliding = on
  glideTarget = on ? target : null
}

export function isAutoScrolling() {
  return gliding
}

export function autoScrollTarget() {
  return glideTarget
}

/** Run `callback({ target, cancelled })` once, when the next glide ends. Returns an unsubscribe. */
export function onNextGlideEnd(callback) {
  const once = (info) => {
    glideEndListeners.delete(once)
    callback(info)
  }
  glideEndListeners.add(once)
  return () => glideEndListeners.delete(once)
}

export function emitGlideEnd(info) {
  ;[...glideEndListeners].forEach((listener) => listener(info))
}
