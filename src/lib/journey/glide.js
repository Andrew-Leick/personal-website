// Eased, cancellable page glide for journey links (spec v4.1).
// Same feel in every browser, and a real end event (unlike native smooth scrolling).

import { prefersReducedMotion } from '../motion.js'
import { clamp, easeInOut } from './geometry.js'
import { beginGlide, emitGlideEnd, endGlide } from './state.js'

const GLIDE_MIN_MS = 450
const GLIDE_MAX_MS = 900

/** Duration for a glide of `distance` px. */
const glideDuration = (distance) => clamp(GLIDE_MIN_MS + Math.abs(distance) * 0.12, GLIDE_MIN_MS, GLIDE_MAX_MS)

let cancelCurrent = null

const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight)

/**
 * Glide the page to `el` (or the top when `el` is null).
 * `targetId` is the journey section being headed to, for the scroll spy and intros.
 * Resolves with { cancelled } once it ends; wheel, touch or a key press cancels it.
 */
export function glideTo(el, targetId = null) {
  cancelCurrent?.()
  const from = window.scrollY
  // scroll-margin-top / scroll-padding-top are read once; only the element's rect is
  // re-read each frame, so late layout shifts (fonts) are still absorbed.
  const offset = el
    ? (parseFloat(getComputedStyle(el).scrollMarginTop) || 0) +
      (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0)
    : 0
  const destination = () => (el ? clamp(el.getBoundingClientRect().top + window.scrollY - offset, 0, maxScroll()) : 0)
  const seq = beginGlide(targetId)

  if (prefersReducedMotion() || Math.abs(destination() - from) < 2) {
    window.scrollTo({ top: destination(), left: 0, behavior: 'instant' })
    endGlide()
    emitGlideEnd({ target: targetId, cancelled: false, seq })
    return Promise.resolve({ cancelled: false })
  }

  const duration = glideDuration(destination() - from)
  const start = performance.now()

  return new Promise((resolve) => {
    let frame = 0
    const stopEvents = ['wheel', 'touchstart', 'keydown']
    const finish = (cancelled) => {
      cancelAnimationFrame(frame)
      stopEvents.forEach((type) => window.removeEventListener(type, onUser))
      cancelCurrent = null
      endGlide()
      emitGlideEnd({ target: targetId, cancelled, seq })
      resolve({ cancelled })
    }
    const onUser = () => finish(true)
    stopEvents.forEach((type) => window.addEventListener(type, onUser, { passive: true }))
    cancelCurrent = () => finish(true)

    const step = (now) => {
      const t = clamp((now - start) / duration)
      window.scrollTo({ top: from + (destination() - from) * easeInOut(t), left: 0, behavior: 'instant' })
      if (t < 1) frame = requestAnimationFrame(step)
      else finish(false)
    }
    frame = requestAnimationFrame(step)
  })
}
