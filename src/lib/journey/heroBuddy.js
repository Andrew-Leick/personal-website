// The hero-click Pokémon sprite (spec v4.4). When a hero ball opens, its Pokémon pops out
// above it as a fixed sprite and bobs there while the page glides; intros.js then flies it
// into the section header (as that section's tracked flight), or dismisses it.

import { BASE_URL } from '../content/paths.js'
import { prefersReducedMotion } from '../motion.js'
import { cancelAnimations } from './anim.js'
import { makeCopy } from './throwBall.js'

const SIZE = 96 // the Pokémon PNGs' native size, same as in the section headers

/** Pop the Pokémon out above `ballEl` (the opened ball). Returns the sprite, or null. */
export function popBuddy(ballEl, guide) {
  if (!ballEl || !guide || prefersReducedMotion()) return null
  const r = ballEl.getBoundingClientRect()
  if (!(r.width > 0)) return null
  const copy = makeCopy(`${BASE_URL}sprites/${guide}.png`, {
    x: r.x + r.width / 2 - SIZE / 2,
    y: r.y - SIZE + r.height * 0.25,
    width: SIZE,
    height: SIZE,
  })
  copy.style.transformOrigin = '50% 100%'
  copy.animate([{ scale: '0' }, { scale: '1.15', offset: 0.7 }, { scale: '1' }], { duration: 300, easing: 'steps(6, end)' })
  // A gentle 2-step bob while it waits for the page to arrive.
  copy.animate([{ translate: '0 0' }, { translate: '0 -4px' }, { translate: '0 0' }], {
    duration: 800,
    delay: 300,
    iterations: Infinity,
    easing: 'steps(2, end)',
  })
  return copy
}

/** Stop the pop/bob so the sprite can fly from where it is. */
export function stillBuddy(copy) {
  cancelAnimations(copy)
}

/** The Pokémon shrinks away (cancelled glide, or the reader moved on). */
export function dismissBuddy(copy) {
  if (!copy) return
  cancelAnimations(copy)
  copy
    .animate([{ scale: '1', opacity: 1 }, { scale: '0', opacity: 0 }], { duration: 200, easing: 'steps(4, end)', fill: 'forwards' })
    .finished.catch(() => undefined)
    .then(() => copy.remove())
}
