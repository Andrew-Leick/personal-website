// Eased, cancellable page glide for journey links (spec v4.1).
// Same feel in every browser, and a real end event (unlike native smooth scrolling).

import { prefersReducedMotion } from '../motion.js'
import { clamp, easeInOut } from './geometry.js'
import { emitGlideEnd, setAutoScroll } from './state.js'

export const GLIDE_MIN_MS = 450
export const GLIDE_MAX_MS = 900

/** Duration for a glide of `distance` px. */
export function glideDuration(distance) {
  return clamp(GLIDE_MIN_MS + Math.abs(distance) * 0.12, GLIDE_MIN_MS, GLIDE_MAX_MS)
}

let cancelCurrent = null

/** Document y that puts `el` at the top, honoring scroll-margin-top and scroll-padding-top. */
function targetY(el) {
  if (!el) return 0
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
  const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0
  return el.getBoundingClientRect().top + window.scrollY - margin - padding
}

const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight)

/**
 * Glide the page to `el` (or the top when `el` is null).
 * `targetId` is the journey section being headed to, for the scroll spy and intros.
 * Resolves with { cancelled } once it ends; wheel, touch or a key press cancels it.
 */
export function glideTo(el, targetId = null) {
  cancelCurrent?.()
  const from = window.scrollY
  const destination = () => clamp(targetY(el), 0, maxScroll())

  if (prefersReducedMotion() || Math.abs(destination() - from) < 2) {
    window.scrollTo({ top: destination(), left: 0, behavior: 'instant' })
    emitGlideEnd({ target: targetId, cancelled: false })
    return Promise.resolve({ cancelled: false })
  }

  setAutoScroll(true, targetId)
  const duration = glideDuration(destination() - from)
  const start = performance.now()

  return new Promise((resolve) => {
    let frame = 0
    const stopEvents = ['wheel', 'touchstart', 'keydown']
    const finish = (cancelled) => {
      cancelAnimationFrame(frame)
      stopEvents.forEach((type) => window.removeEventListener(type, onUser))
      cancelCurrent = null
      setAutoScroll(false)
      emitGlideEnd({ target: targetId, cancelled })
      resolve({ cancelled })
    }
    const onUser = () => finish(true)
    stopEvents.forEach((type) => window.addEventListener(type, onUser, { passive: true }))
    cancelCurrent = () => finish(true)

    const step = (now) => {
      const t = clamp((now - start) / duration)
      // Re-read the destination each frame, so late layout shifts (fonts) are absorbed.
      const to = destination()
      window.scrollTo({ top: from + (to - from) * easeInOut(t), left: 0, behavior: 'instant' })
      if (t < 1) frame = requestAnimationFrame(step)
      else finish(false)
    }
    frame = requestAnimationFrame(step)
  })
}
