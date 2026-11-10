import { useEffect } from 'react'
import { openBall, resetBall } from '../lib/journey/openBall.js'
import { isRevealed, markRevealed } from '../lib/journey/state.js'
import { prefersReducedMotion } from '../lib/motion.js'

/**
 * v4 section intros: each section heading's Poké Ball ([data-intro]) opens to reveal the
 * page's Pokémon the first time the heading scrolls past 60% of the viewport.
 *
 * The resting (no-JS, reduced-motion) state is the Pokémon already shown. Only this hook
 * adds data-pending (ball closed, Pokémon hidden), so nothing waits on JS to be visible.
 * A section opened by a hero click (markRevealed) settles without playing again.
 */
export default function useSectionReveal({ enabled }) {
  useEffect(() => {
    if (!enabled || prefersReducedMotion() || typeof IntersectionObserver !== 'function') return undefined
    const intros = [...document.querySelectorAll('[data-intro]')]
    intros.forEach((intro) => {
      if (!isRevealed(intro.getAttribute('data-intro'))) intro.setAttribute('data-pending', '')
    })

    const settle = (intro) => {
      intro.removeAttribute('data-pending')
      resetBall(intro)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const intro = entry.target
          observer.unobserve(intro)
          const id = intro.getAttribute('data-intro')
          if (isRevealed(id)) {
            settle(intro)
            continue
          }
          markRevealed(id)
          openBall(intro).then(() => settle(intro))
        }
      },
      { rootMargin: '0px 0px -40% 0px' },
    )
    intros.forEach((intro) => {
      if (intro.hasAttribute('data-pending')) observer.observe(intro)
    })

    return () => {
      observer.disconnect()
      intros.forEach(settle)
    }
  }, [enabled])
}
