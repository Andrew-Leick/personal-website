// Poké Ball opening sequence (spec v4.6), built on the Web Animations API.
//
// Expects, inside `root`:
//   [data-part="ball"]     the whole ball (stays put; fades once the Pokémon is out)
//   [data-part="top"]      the lid: a wrapper around the orange top piece (PokeBall.jsx clips the image inside on the seam)
//   [data-part="flash"]    white burst
//   [data-part="pokemon"]  the Pokémon (optional: section headers have one, rail balls do not)
//
// Order: the lid swings up and right on its hinge (the right end of the seam) while the
// bottom stays still, then the white flash, then the Pokémon pops out. Every function resolves when its sequence ends. None rejects.

import { prefersReducedMotion } from '../motion.js'
import { cancelAnimations, part, settled } from './anim.js'

const OPEN_DURATION = 700
/** How far the lid swings open, clockwise. 90°: it stands upright beside the ball (and a
 * quarter turn keeps the pixel art crisp at rest). */
const LID_ANGLE = 90
/** When the Pokémon starts to appear (section intros sync the title to this). */
export const OPEN_POP_AT = Math.round(OPEN_DURATION * 0.45)

const PARTS = ['ball', 'top', 'flash', 'pokemon']

function run(el, keyframes, options) {
  if (!el || typeof el.animate !== 'function') return null
  return el.animate(keyframes, { duration: OPEN_DURATION, fill: 'forwards', ...options })
}

/** Cancel every sequence so the ball shows its CSS (closed or resting) state again. */
export function resetBall(root) {
  if (root) PARTS.forEach((name) => cancelAnimations(part(root, name)))
}

export function openBall(root) {
  if (!root || prefersReducedMotion()) return Promise.resolve()
  resetBall(root)
  return settled([
    // 1. The lid swings up and right on its hinge (pixel steps); the bottom never moves.
    run(part(root, 'top'), [
      { transform: 'rotate(0deg)', offset: 0, easing: 'steps(5, end)' },
      { transform: `rotate(${LID_ANGLE}deg)`, offset: 0.35 },
      { transform: `rotate(${LID_ANGLE}deg)`, offset: 1 },
    ]),
    // 2. White flash out of the open ball.
    run(part(root, 'flash'), [
      { opacity: 0, transform: 'scale(0.2)', offset: 0 },
      { opacity: 0, transform: 'scale(0.2)', offset: 0.33 },
      { opacity: 1, transform: 'scale(1)', offset: 0.45 },
      { opacity: 0, transform: 'scale(1.4)', offset: 0.62 },
      { opacity: 0, transform: 'scale(1.4)', offset: 1 },
    ], { easing: 'steps(10, end)' }),
    // 3. The Pokémon pops out.
    run(part(root, 'pokemon'), [
      { opacity: 0, transform: 'scale(0)', offset: 0 },
      { opacity: 0, transform: 'scale(0)', offset: 0.45 },
      { opacity: 1, transform: 'scale(0.5)', offset: 0.55 },
      { opacity: 1, transform: 'scale(1.15)', offset: 0.72 },
      { opacity: 1, transform: 'scale(1)', offset: 0.82 },
      { opacity: 1, transform: 'scale(1)', offset: 1 },
    ], { easing: 'steps(8, end)' }),
    // 4. Then the empty ball fades, leaving the Pokémon.
    run(part(root, 'ball'), [
      { opacity: 1, offset: 0 },
      { opacity: 1, offset: 0.75 },
      { opacity: 0, offset: 0.92 },
      { opacity: 0, offset: 1 },
    ], { easing: 'steps(6, end)' }),
  ])
}

/** Short landing bounce for a part that is already showing (2 pixel steps). */
export function hop(el, height = 8) {
  if (!el || prefersReducedMotion() || typeof el.animate !== 'function') return Promise.resolve()
  return el
    .animate(
      [{ translate: '0 0' }, { translate: `0 -${height}px` }, { translate: '0 0' }],
      { duration: 240, easing: 'steps(4, end)', composite: 'add' },
    )
    .finished.catch(() => undefined)
}
