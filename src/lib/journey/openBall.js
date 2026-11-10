// Poké Ball open and close sequences (spec v4 / v4.1), built on the Web Animations API.
//
// Expects, inside `root`:
//   [data-part="ball"]     the ball (wobbles, then fades)
//   [data-part="top"]      top half of the sprite (flips open on its hinge)
//   [data-part="flash"]    white burst
//   [data-part="pokemon"]  the Pokémon (optional; pops out of the ball)
// Every function resolves when its sequence ends. None rejects.

import { prefersReducedMotion } from '../motion.js'

export const OPEN_DURATION = 600
/** When the flash peaks: a hero click hands over to the page glide here. */
export const OPEN_HANDOFF = 300
/** When the Pokémon starts to appear (section intros sync the title to this). */
export const OPEN_POP_AT = 270
export const CLOSE_DURATION = 220

const PARTS = ['ball', 'top', 'flash', 'pokemon']
const part = (root, name) => root.querySelector(`[data-part="${name}"]`)

function run(el, keyframes, options) {
  if (!el || typeof el.animate !== 'function') return null
  return el.animate(keyframes, { duration: OPEN_DURATION, fill: 'forwards', ...options })
}

function settled(animations) {
  const list = animations.filter(Boolean)
  if (list.length === 0) return Promise.resolve()
  return Promise.all(list.map((a) => a.finished.catch(() => undefined))).then(() => undefined)
}

/** Cancel every sequence so the ball shows its CSS (closed or resting) state again. */
export function resetBall(root) {
  if (!root) return
  for (const name of PARTS) part(root, name)?.getAnimations?.().forEach((animation) => animation.cancel())
}

export function openBall(root) {
  if (!root || prefersReducedMotion()) return Promise.resolve()
  resetBall(root)
  return settled([
    run(part(root, 'ball'), [
      { transform: 'rotate(0deg)', opacity: 1, offset: 0 },
      { transform: 'rotate(-14deg)', offset: 0.08 },
      { transform: 'rotate(12deg)', offset: 0.16 },
      { transform: 'rotate(-6deg)', offset: 0.24 },
      { transform: 'rotate(0deg)', opacity: 1, offset: 0.3 },
      { transform: 'rotate(0deg)', opacity: 1, offset: 0.6 },
      { transform: 'rotate(0deg)', opacity: 0, offset: 0.85 },
      { transform: 'rotate(0deg)', opacity: 0, offset: 1 },
    ], { easing: 'steps(15, end)' }),
    run(part(root, 'top'), [
      { transform: 'translateY(0) rotate(0deg)', offset: 0 },
      { transform: 'translateY(0) rotate(0deg)', offset: 0.3 },
      { transform: 'translateY(-18%) rotate(-55deg)', offset: 0.45 },
      { transform: 'translateY(-18%) rotate(-55deg)', offset: 1 },
    ], { easing: 'steps(10, end)' }),
    run(part(root, 'flash'), [
      { opacity: 0, transform: 'scale(0.2)', offset: 0 },
      { opacity: 0, transform: 'scale(0.2)', offset: 0.38 },
      { opacity: 1, transform: 'scale(1)', offset: 0.5 },
      { opacity: 0, transform: 'scale(1.4)', offset: 0.7 },
      { opacity: 0, transform: 'scale(1.4)', offset: 1 },
    ], { easing: 'steps(10, end)' }),
    run(part(root, 'pokemon'), [
      { opacity: 0, transform: 'scale(0)', offset: 0 },
      { opacity: 0, transform: 'scale(0)', offset: 0.45 },
      { opacity: 1, transform: 'scale(0.5)', offset: 0.58 },
      { opacity: 1, transform: 'scale(1.15)', offset: 0.8 },
      { opacity: 1, transform: 'scale(1)', offset: 1 },
    ], { easing: 'steps(8, end)' }),
  ])
}

/**
 * Reverse of openBall: the Pokémon shrinks back in while the ball fades in closed, then the
 * animations are cancelled so CSS takes over with no jump.
 * `keepBallHidden`: the ball is out (its rail slot shows a dot), so it does not fade back in.
 */
export function closeBall(root, { keepBallHidden = false } = {}) {
  if (!root) return Promise.resolve()
  if (prefersReducedMotion()) {
    resetBall(root)
    return Promise.resolve()
  }
  const options = { duration: CLOSE_DURATION, fill: 'forwards' }
  const done = settled([
    run(part(root, 'top'), [{ transform: 'none' }, { transform: 'none' }], options),
    keepBallHidden
      ? null
      : run(part(root, 'ball'), [{ opacity: 0, transform: 'none' }, { opacity: 1, transform: 'none' }], { ...options, easing: 'steps(4, end)' }),
    run(part(root, 'pokemon'), [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0)' }], { ...options, easing: 'steps(4, end)' }),
  ])
  return done.then(() => resetBall(root))
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
