import { useEffect } from 'react'
import { startIntros, stopIntros } from '../lib/journey/intros.js'
import { prefersReducedMotion } from '../lib/motion.js'

/**
 * v4.3 section intros (src/lib/journey/intros.js): every header starts as an empty slot; the
 * section the reader is in gets its Poké Ball thrown in and its Pokémon shown, and gives it
 * back when the reader moves on. useJourneyScroll drives it each frame.
 *
 * Off with fan art off or reduced motion: headers then simply show their Pokémon. Only this
 * hook makes a header empty, so nothing waits on JS to be readable.
 */
export default function useSectionReveal({ enabled, pages }) {
  useEffect(() => {
    if (!enabled || prefersReducedMotion()) return undefined
    startIntros(pages.map((page) => page.id))
    return stopIntros
  }, [enabled, pages])
}
