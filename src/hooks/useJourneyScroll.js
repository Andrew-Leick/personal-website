import { useEffect } from 'react'
import { ballTransform, clamp, easeInOut, heroProgress, pickActive, staggered } from '../lib/journey/geometry.js'
import { isAutoScrolling } from '../lib/journey/state.js'
import { prefersReducedMotion } from '../lib/motion.js'
import { replaceFromScroll } from '../router/history.js'

/** A section counts as active once its top passes this share of the viewport height. */
const ACTIVE_LINE = 0.4

/**
 * The v4 journey's single scroll handler (one rAF per frame, no React re-renders):
 * - glides each rail ball from its hero slot ([data-ball-slot]) to its rail slot
 *   ([data-rail-slot]) as the hero scrolls away;
 * - docks the rail (data-docked, inert off) once the glide is done;
 * - writes --journey-progress (0 to 1, whole page) for the rail's track;
 * - marks the active section in the rail and moves the URL to it (replaceFromScroll).
 * @param {{ pages: { id: string, href: string }[], homeHref: string, railRef: { current: HTMLElement|null } }} opts
 */
export default function useJourneyScroll({ pages, homeHref, railRef }) {
  useEffect(() => {
    const rail = railRef.current
    if (!rail) return undefined

    const ids = pages.map((page) => page.id)
    const hrefOf = new Map(pages.map((page) => [page.id, page.href]))
    hrefOf.set('home', homeHref)
    const query = (attr, id) => document.querySelector(`[${attr}="${id}"]`)

    let frame = 0
    let docked = null
    let active = null

    function update() {
      frame = 0
      const scrollY = window.scrollY
      const vh = window.innerHeight
      const reduced = prefersReducedMotion()

      // 1. Glide: travel ends when the first hero slot would reach the top of the viewport.
      const firstSlot = query('data-ball-slot', ids[0])
      const travel = firstSlot ? firstSlot.getBoundingClientRect().top + scrollY - 16 : 0
      const p = heroProgress(scrollY, travel)

      ids.forEach((id, index) => {
        const mover = query('data-rail-ball', id)
        const railSlot = query('data-rail-slot', id)
        const heroSlot = query('data-ball-slot', id)
        if (!mover || !railSlot) return
        let t = 1
        if (heroSlot) t = reduced ? (p < 0.5 ? 0 : 1) : easeInOut(staggered(p, index, ids.length))
        const { tx, ty, scale } = ballTransform(
          railSlot.getBoundingClientRect(),
          heroSlot ? heroSlot.getBoundingClientRect() : null,
          t,
        )
        mover.style.transform = t >= 1 ? '' : `translate(${tx}px, ${ty}px) scale(${scale})`
      })

      const isDocked = p >= 1
      if (isDocked !== docked) {
        docked = isDocked
        rail.toggleAttribute('data-docked', isDocked)
        rail.inert = !isDocked
      }

      // 2. Page progress for the rail's track.
      const max = document.documentElement.scrollHeight - vh
      rail.style.setProperty('--journey-progress', String(max > 0 ? clamp(scrollY / max) : 0))

      // 3. Active section -> rail highlight + URL.
      const tops = ids
        .map((id) => ({ id, el: document.getElementById(id) }))
        .filter((s) => s.el)
        .map((s) => ({ id: s.id, top: s.el.getBoundingClientRect().top }))
      // At the very bottom the last section wins, even if it is too short to reach the line.
      const atBottom = max > 0 && scrollY >= max - 2
      const next = atBottom && tops.length ? tops[tops.length - 1].id : pickActive(tops, vh * ACTIVE_LINE)
      if (next !== active) {
        active = next
        rail.querySelectorAll('[data-rail-link]').forEach((link) => {
          const on = link.getAttribute('data-rail-link') === next
          link.toggleAttribute('data-active', on)
          if (on) link.setAttribute('aria-current', 'location')
          else link.removeAttribute('aria-current')
        })
      }
      if (!isAutoScrolling()) replaceFromScroll(hrefOf.get(active))
      rail.setAttribute('data-ready', '')
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    window.addEventListener('scrollend', schedule)
    const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null
    resizeObserver?.observe(document.body)
    document.fonts?.ready.then(schedule).catch(() => undefined)
    schedule()

    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scrollend', schedule)
      resizeObserver?.disconnect()
    }
  }, [pages, homeHref, railRef])
}
