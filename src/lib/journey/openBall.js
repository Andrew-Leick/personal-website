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
const LID_STEPS = 5
const LID_SWING_MS = Math.round(OPEN_DURATION * 0.35)
/** When the Pokémon starts to appear (section intros sync the title to this). */
export const OPEN_POP_AT = Math.round(OPEN_DURATION * 0.45)

const PARTS = ['ball', 'top', 'flash', 'pokemon']

function run(el, keyframes, options) {
  if (!el || typeof el.animate !== 'function') return null
  return el.animate(keyframes, { duration: OPEN_DURATION, fill: 'forwards', ...options })
}

/*
 * The lid swing is driven from the main thread (one style write per pixel step), not with
 * the Web Animations API. A WAAPI transform animation runs on the compositor, and for the
 * lid (whose image is clip-pathed along the seam) Chromium-based browsers such as Arc
 * could leave that compositor layer undrawn: on a still page (after a hero click) the lid
 * vanished for the whole swing. Plain style changes are always painted. It is only 5 steps.
 */
const swings = new WeakMap()

function stopSwing(lid) {
  swings.get(lid)?.()
  swings.delete(lid)
  if (lid) lid.style.transform = ''
}

function swingLid(lid) {
  if (!lid) return Promise.resolve()
  stopSwing(lid)
  return new Promise((resolve) => {
    const start = performance.now()
    let frame = 0
    let shown = -1
    const tick = (now) => {
      const t = Math.min(1, (now - start) / LID_SWING_MS)
      const step = Math.min(LID_STEPS, Math.floor(t * LID_STEPS))
      if (step !== shown) {
        shown = step
        lid.style.transform = `rotate(${(LID_ANGLE * step) / LID_STEPS}deg)`
      }
      if (t < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        swings.delete(lid)
        resolve()
      }
    }
    frame = requestAnimationFrame(tick)
    swings.set(lid, () => {
      cancelAnimationFrame(frame)
      resolve()
    })
  })
}

/** Cancel every sequence so the ball shows its CSS (closed or resting) state again. */
export function resetBall(root) {
  if (!root) return
  PARTS.forEach((name) => cancelAnimations(part(root, name)))
  stopSwing(part(root, 'top'))
}

export function openBall(root) {
  if (!root || prefersReducedMotion()) return Promise.resolve()
  resetBall(root)
  // 1. The lid swings up and right on its hinge (pixel steps); the bottom never moves.
  const swung = swingLid(part(root, 'top'))
  const rest = settled([
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
  return Promise.all([swung, rest]).then(() => undefined)
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
