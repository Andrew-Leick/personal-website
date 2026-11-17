import { useEffect } from 'react'
import { startIntros, stopIntros } from '../lib/journey/intros.js'
import { prefersReducedMotion } from '../lib/motion.js'

/**
 * v4.3 section intros (src/lib/journey/intros.js): every header starts as an empty slot; the
 * section the reader is in gets its Poké Ball thrown in and its Pokémon shown, and gives it
 * back when the reader moves on. useJourneyScroll drives it each frame.
 *
 * Off with fan art off or reduced motion (also when it turns on mid-visit): headers then simply
 * show their Pokémon. Only this hook makes a header empty, so nothing waits on JS to be readable.
 */
export default function useSectionReveal({ enabled, pages }) {
  useEffect(() => {
    if (!enabled || prefersReducedMotion()) return undefined
    startIntros(pages.map((page) => page.id))
    // Reduced motion turned on mid-visit (spec v4.9): every heading to its finished state, every
    // ball home. Turning it off again doesn't restart the intros until the next mount.
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const onChange = () => {
      if (query.matches) stopIntros()
    }
    query?.addEventListener?.('change', onChange)
    return () => {
      query?.removeEventListener?.('change', onChange)
      stopIntros()
    }
  }, [enabled, pages])
}
