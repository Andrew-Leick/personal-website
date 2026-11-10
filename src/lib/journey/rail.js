// Which rail balls are "out" (spec v4.2). A ball goes out when it is thrown to its section's
// heading: its rail slot then shows a small dot ([data-out] on the rail link). It returns to
// the rail (dot → ball, [data-return] for the drop-in) once a different section is entered.

import { getBall } from './state.js'

const out = new Set()
const RETURN_MS = 400

const linkOf = (id) => getBall(id)?.closest('[data-rail-link]') ?? null

export function isOut(id) {
  return out.has(id)
}

export function outIds() {
  return [...out]
}

/** The ball leaves the rail (thrown to its heading, or its section re-entered). */
export function sendOut(id) {
  if (!id || out.has(id)) return
  out.add(id)
  const link = linkOf(id)
  if (!link) return
  link.removeAttribute('data-return')
  link.setAttribute('data-out', '')
}

/** The ball comes back to the rail: the dot grows back into the ball with a small drop. */
export function recall(id) {
  if (!out.delete(id)) return
  const link = linkOf(id)
  if (!link) return
  link.removeAttribute('data-out')
  link.setAttribute('data-return', '')
  window.setTimeout(() => {
    if (!out.has(id)) link.removeAttribute('data-return')
  }, RETURN_MS)
}

/** Forget every ball's state (the journey unmounted). */
export function resetRail() {
  out.forEach((id) => linkOf(id)?.removeAttribute('data-out'))
  out.clear()
}
