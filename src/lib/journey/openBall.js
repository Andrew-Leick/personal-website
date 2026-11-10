// Poké Ball opening sequence (spec v4), built on the Web Animations API.
//
// Expects, inside `root`:
//   [data-part="ball"]     the ball (wobbles, then fades)
//   [data-part="top"]      top half of the sprite (flips open on its hinge)
//   [data-part="flash"]    white burst
//   [data-part="pokemon"]  the Pokémon (optional; pops out of the ball)
// Resolves when the sequence ends. Never rejects.

import { prefersReducedMotion } from '../motion.js'

export const OPEN_DURATION = 760

const part = (root, name) => root.querySelector(`[data-part="${name}"]`)

function run(el, keyframes, options) {
  if (!el || typeof el.animate !== 'function') return null
  return el.animate(keyframes, { duration: OPEN_DURATION, fill: 'forwards', ...options })
}

/** Cancel a previous sequence so the ball shows its CSS (closed or resting) state again. */
export function resetBall(root) {
  if (!root) return
  for (const name of ['ball', 'top', 'flash', 'pokemon']) {
    part(root, name)?.getAnimations?.().forEach((animation) => animation.cancel())
  }
}

export function openBall(root) {
  if (!root || prefersReducedMotion()) return Promise.resolve()
  resetBall(root)

  const animations = [
    run(part(root, 'ball'), [
      { transform: 'rotate(0deg)', opacity: 1, offset: 0 },
      { transform: 'rotate(-14deg)', offset: 0.1 },
      { transform: 'rotate(12deg)', offset: 0.2 },
      { transform: 'rotate(-8deg)', offset: 0.3 },
      { transform: 'rotate(0deg)', opacity: 1, offset: 0.38 },
      { transform: 'rotate(0deg)', opacity: 1, offset: 0.7 },
      { transform: 'rotate(0deg)', opacity: 0, offset: 1 },
    ], { easing: 'steps(18, end)' }),
    run(part(root, 'top'), [
      { transform: 'translateY(0) rotate(0deg)', offset: 0 },
      { transform: 'translateY(0) rotate(0deg)', offset: 0.38 },
      { transform: 'translateY(-18%) rotate(-55deg)', offset: 0.55 },
      { transform: 'translateY(-18%) rotate(-55deg)', offset: 1 },
    ], { easing: 'steps(12, end)' }),
    run(part(root, 'flash'), [
      { opacity: 0, transform: 'scale(0.2)', offset: 0 },
      { opacity: 0, transform: 'scale(0.2)', offset: 0.45 },
      { opacity: 1, transform: 'scale(1)', offset: 0.6 },
      { opacity: 0, transform: 'scale(1.4)', offset: 0.8 },
      { opacity: 0, transform: 'scale(1.4)', offset: 1 },
    ], { easing: 'steps(10, end)' }),
    run(part(root, 'pokemon'), [
      { opacity: 0, transform: 'scale(0)', offset: 0 },
      { opacity: 0, transform: 'scale(0)', offset: 0.5 },
      { opacity: 1, transform: 'scale(0.5)', offset: 0.62 },
      { opacity: 1, transform: 'scale(1.15)', offset: 0.82 },
      { opacity: 1, transform: 'scale(1)', offset: 1 },
    ], { easing: 'steps(8, end)' }),
  ].filter(Boolean)

  if (animations.length === 0) return Promise.resolve()
  return Promise.all(animations.map((a) => a.finished.catch(() => undefined))).then(() => undefined)
}
