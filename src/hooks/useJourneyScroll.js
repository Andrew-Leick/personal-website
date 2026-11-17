import { useEffect } from 'react'
import {
  arcLift,
  ballTransform,
  clamp,
  easeInOut,
  heroProgress,
  pickActive,
  staggered,
  staggerOrder,
  tilt,
  trackProgress,
} from '../lib/journey/geometry.js'
import { hop } from '../lib/journey/openBall.js'
import { setCurrentIntro, tickIntros } from '../lib/journey/intros.js'
import { autoScrollTarget, isAutoScrolling, onGlideEnd } from '../lib/journey/state.js'
import { prefersReducedMotion } from '../lib/motion.js'
import { replaceFromScroll } from '../router/history.js'

/** A section counts as active once its top passes this share of the viewport height. */
const ACTIVE_LINE = 0.4
/** Keyframes sampled per ball for the compositor-driven glide. */
const SAMPLES = 24

const supportsScrollTimeline = () => typeof window !== 'undefined' && typeof window.ScrollTimeline === 'function'

/**
 * The v4 journey's scroll engine (no React re-renders):
 * - glides each rail ball ([data-rail-ball]) from its hero slot ([data-ball-slot]) to its
 *   rail slot ([data-rail-slot]) on an arc, shortest path first. Where the browser has
 *   ScrollTimeline the glide is a scroll-linked WAAPI animation run by the compositor, so
 *   the balls never trail the page; otherwise one rAF per frame writes the transforms;
 * - fades the hero slot's ghost in and its label down as each ball leaves (--leave, written
 *   on the ghost and label elements themselves);
 * - writes --journey-p (glide progress, fades in the track and dock) on the dock and track
 *   elements, and --journey-progress (piecewise: reaches ball i as section i becomes active)
 *   on the fill element;
 * - docks the rail (data-docked, inert off) once the glide is done;
 * - marks the active section (ring, hop, aria-current) and moves the URL to it.
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

    let disposed = false
    let ready = false
    // Scroll-driven custom properties are written on the element that reads them (so a change
    // restyles that element only, not a whole subtree), and only when they change (3 decimals
    // is sub-pixel).
    const written = new WeakMap()
    const writeVar = (el, name, value) => {
      if (!el) return
      const text = value.toFixed(3)
      const seen = written.get(el) ?? new Map()
      if (seen.get(name) === text) return
      seen.set(name, text)
      written.set(el, seen)
      el.style.setProperty(name, text)
    }
    const dock = rail.querySelector('[data-rail-dock]')
    const track = rail.querySelector('[data-rail-track]')
    const fillEl = rail.querySelector('[data-rail-fill]')
    let frame = 0
    let docked = null
    let active = null
    let m = null // measurements, refreshed on resize / content changes
    let compositor = [] // ScrollTimeline animations, one per ball

    const reduced = () => prefersReducedMotion()
    const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    const ballT = (p, rank) => (reduced() ? (p < 0.5 ? 0 : 1) : easeInOut(staggered(p, rank, ids.length)))

    /** Transform for ball `b` when the page is scrolled `s` px and the ball is `t` of the way. */
    function transformAt(b, s, t) {
      if (t >= 1) return 'none'
      const hero = { x: b.heroDoc.x, y: b.heroDoc.y - s, width: b.heroDoc.width }
      const { tx, ty, scale } = ballTransform(b.railRect, hero, t, b.lift)
      const half = b.railRect.width / 2
      const turn = reduced() ? 0 : tilt(t)
      return `translate(${tx}px, ${ty}px) scale(${scale}) translate(${half}px, ${half}px) rotate(${turn}deg) translate(${-half}px, ${-half}px)`
    }

    function measure() {
      const scrollY = window.scrollY
      const balls = ids.map((id) => {
        const heroSlot = query('data-ball-slot', id)
        const railSlot = query('data-rail-slot', id)
        const heroRect = heroSlot?.getBoundingClientRect()
        return {
          id,
          mover: query('data-rail-ball', id),
          railSlot,
          railRect: railSlot?.getBoundingClientRect() ?? null,
          heroLink: heroSlot?.closest('a') ?? null,
          heroGhost: heroSlot?.firstElementChild ?? null,
          heroLabel: heroSlot?.closest('a')?.querySelector('[data-leave-label]') ?? null,
          heroDoc: heroRect ? { x: heroRect.left, y: heroRect.top + scrollY, width: heroRect.width } : null,
          link: rail.querySelector(`[data-rail-link="${id}"]`),
          section: document.getElementById(id),
          lastT: -1,
        }
      })
      const first = balls[0]
      const travel = first?.heroDoc ? first.heroDoc.y - 16 : 0
      balls.forEach((b) => {
        b.lift = b.heroDoc && b.railRect ? arcLift(b.heroDoc, b.railRect) : 0
      })
      const distances = balls.map((b) =>
        b.heroDoc && b.railRect ? Math.hypot(b.railRect.x - b.heroDoc.x, b.railRect.y - b.heroDoc.y) : 0,
      )
      const ranks = staggerOrder(distances)
      balls.forEach((b, i) => {
        b.rank = ranks[i]
      })

      // Track from the first ball's center to the last's, along the rail's axis.
      const railBox = rail.getBoundingClientRect()
      const a = balls[0]?.railRect
      const z = balls[balls.length - 1]?.railRect
      if (a && z) {
        const vertical = Math.abs(z.y - a.y) >= Math.abs(z.x - a.x)
        const from = vertical ? a.y + a.height / 2 - railBox.top : a.x + a.width / 2 - railBox.left
        const to = vertical ? z.y + z.height / 2 - railBox.top : z.x + z.width / 2 - railBox.left
        // In an RTL dock the first ball is on the right, so the track starts at the last one.
        rail.style.setProperty('--track-start', `${Math.min(from, to)}px`)
        rail.style.setProperty('--track-length', `${Math.abs(to - from)}px`)
      }

      m = { balls, travel }
      buildCompositor()
    }

    function buildCompositor() {
      compositor.forEach((animation) => animation.cancel())
      compositor = []
      const max = maxScroll()
      if (!supportsScrollTimeline() || reduced() || !m || !(m.travel > 0) || !(max > 0)) return
      let timeline
      try {
        timeline = new window.ScrollTimeline({ source: document.documentElement, axis: 'block' })
      } catch {
        return
      }
      for (const b of m.balls) {
        if (!b.mover || !b.railRect || !b.heroDoc) continue
        const end = Math.min(m.travel, max)
        const keyframes = []
        for (let k = 0; k <= SAMPLES; k += 1) {
          const s = (end * k) / SAMPLES
          const t = ballT(heroProgress(s, m.travel), b.rank)
          keyframes.push({ offset: s / max, transform: transformAt(b, s, t), easing: 'linear' })
        }
        if (keyframes[keyframes.length - 1].offset < 1) keyframes.push({ offset: 1, transform: 'none' })
        try {
          b.mover.style.transform = ''
          compositor.push(b.mover.animate(keyframes, { timeline, fill: 'both' }))
        } catch {
          compositor.forEach((animation) => animation.cancel())
          compositor = []
          return
        }
      }
    }

    function update() {
      frame = 0
      if (disposed) return
      if (!m) measure()
      // Reads first.
      const scrollY = window.scrollY
      const vh = window.innerHeight
      const max = maxScroll()
      const tops = m.balls.filter((b) => b.section).map((b) => ({ id: b.id, top: b.section.getBoundingClientRect().top }))

      // Then writes.
      const p = heroProgress(scrollY, m.travel)
      const useRaf = compositor.length === 0
      for (const b of m.balls) {
        const t = b.heroDoc ? ballT(p, b.rank) : 1
        if (t === b.lastT) continue
        b.lastT = t
        if (useRaf && b.mover) {
          const value = b.heroDoc && b.railRect ? transformAt(b, scrollY, t) : 'none'
          b.mover.style.transform = value === 'none' ? '' : value
          b.mover.style.willChange = t > 0 && t < 1 ? 'transform' : ''
        }
        writeVar(b.heroGhost, '--leave', t)
        writeVar(b.heroLabel, '--leave', t)
      }

      const isDocked = p >= 1
      if (isDocked !== docked) {
        docked = isDocked
        rail.toggleAttribute('data-docked', isDocked)
        rail.inert = !isDocked
        // The hero links are gone: no ball keeps wiggling from a hover the page scrolled away.
        if (isDocked) m.balls.forEach((b) => b.mover?.removeAttribute('data-hover'))
      }
      writeVar(dock, '--journey-p', p)
      writeVar(track, '--journey-p', p)

      const line = vh * ACTIVE_LINE
      const atBottom = max > 0 && scrollY >= max - 2
      const fill = atBottom ? 1 : trackProgress(tops.map((s) => s.top), line)
      writeVar(fillEl, '--journey-progress', clamp(fill))

      // During a link glide the rail shows the destination at once, instead of flashing every
      // section passed on the way.
      const gliding = isAutoScrolling()
      const next = gliding
        ? (autoScrollTarget() ?? 'home')
        : atBottom && tops.length
          ? tops[tops.length - 1].id
          : pickActive(tops, line)
      if (next !== active) {
        const first = active === null
        active = next
        for (const b of m.balls) {
          if (!b.link) continue
          const on = b.id === next
          b.link.toggleAttribute('data-active', on)
          if (on) b.link.setAttribute('aria-current', 'location')
          else b.link.removeAttribute('aria-current')
          if (on && !first && docked) hop(b.railSlot, 6)
        }
        // Entering a section: the previous section's ball comes home (src/lib/journey/intros.js).
        setCurrentIntro(next === 'home' ? null : next)
      }
      // Throws the current section's ball once its header slot is fully on screen.
      tickIntros()
      if (!gliding) replaceFromScroll(hrefOf.get(active))
      if (!ready) {
        ready = true
        rail.setAttribute('data-ready', '')
      }
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    let measureFrame = 0
    const remeasure = () => {
      if (disposed || measureFrame) return
      measureFrame = requestAnimationFrame(() => {
        measureFrame = 0
        m = null
        update()
      })
    }

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', remeasure)
    const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(remeasure) : null
    resizeObserver?.observe(document.body)
    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    motionQuery?.addEventListener?.('change', remeasure)
    document.fonts?.ready.then(remeasure).catch(() => undefined)
    // A glide that ends where it started fires no scroll event; run a frame anyway.
    const stopGlideListen = onGlideEnd(schedule)
    schedule()

    return () => {
      disposed = true
      if (frame) cancelAnimationFrame(frame)
      if (measureFrame) cancelAnimationFrame(measureFrame)
      compositor.forEach((animation) => animation.cancel())
      stopGlideListen()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', remeasure)
      motionQuery?.removeEventListener?.('change', remeasure)
      resizeObserver?.disconnect()
    }
  }, [pages, homeHref, railRef])
}
