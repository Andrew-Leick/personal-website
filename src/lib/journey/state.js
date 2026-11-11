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
 * Every glide gets a sequence number, so a listener can wait for a glide that has not
 * started yet without catching the end of one that is already running.
 */
let gliding = false
let glideTarget = null
let glideSeq = 0
const glideEndListeners = new Set()

/** Start a glide: returns its sequence number. */
export function beginGlide(target = null) {
  gliding = true
  glideTarget = target
  glideSeq += 1
  return glideSeq
}

export function endGlide() {
  gliding = false
  glideTarget = null
}

/** Sequence number of the latest glide (0 before the first). */
export function lastGlideSeq() {
  return glideSeq
}

export function isAutoScrolling() {
  return gliding
}

export function autoScrollTarget() {
  return glideTarget
}

/** Run `callback({ target, cancelled, seq })` at every glide end. Returns an unsubscribe. */
export function onGlideEnd(callback) {
  glideEndListeners.add(callback)
  return () => glideEndListeners.delete(callback)
}

/**
 * Run `callback` once, at the end of the next glide numbered above `after` (default: any).
 * Returns an unsubscribe.
 */
export function onNextGlideEnd(callback, { after = -1 } = {}) {
  const unsubscribe = onGlideEnd((info) => {
    if (info.seq <= after) return
    unsubscribe()
    callback(info)
  })
  return unsubscribe
}

export function emitGlideEnd(info) {
  ;[...glideEndListeners].forEach((listener) => listener(info))
}
