// Which rail balls are "out" (spec v4.2). A ball goes out when it is thrown to its section's
// heading: its rail slot then shows a small dot ([data-out] on the rail link). It returns to
// the rail (dot → ball, [data-return] for the drop-in) once a different section is entered.
// The heading's intro slot carries the same [data-out] (markOut), which its landing ring needs.

import { getBall } from './state.js'

const out = new Set()
const RETURN_MS = 400

const linkOf = (id) => getBall(id)?.closest('[data-rail-link]') ?? null
const slotOf = (id) => document.querySelector(`[data-intro="${id}"]`)

/**
 * The only writer of [data-out] (spec v4.9, I1). The rail link and its heading's intro slot are
 * marked together, in one synchronous call, so no frame can paint one without the other. The
 * heading's dashed ring needs [data-out] on its slot (JourneyPage.module.css), so the ring can
 * never show while the ball still rests in the rail.
 */
function markOut(id, link, on) {
  link?.toggleAttribute('data-out', on)
  slotOf(id)?.toggleAttribute('data-out', on)
}

/** The ball leaves the rail (thrown to its heading, or its section re-entered). */
export function sendOut(id) {
  if (!id || out.has(id)) return
  out.add(id)
  const link = linkOf(id)
  if (!link) return
  link.removeAttribute('data-return')
  markOut(id, link, true)
}

/** The ball comes back to the rail: the dot grows back into the ball with a small drop. */
export function recall(id) {
  if (!out.delete(id)) return
  const link = linkOf(id)
  if (!link) return
  markOut(id, link, false)
  link.setAttribute('data-return', '')
  window.setTimeout(() => {
    if (!out.has(id)) link.removeAttribute('data-return')
  }, RETURN_MS)
}

/** Forget every ball's state (the journey unmounted). */
export function resetRail() {
  out.forEach((id) => markOut(id, linkOf(id), false))
  out.clear()
}
