import { useLayoutEffect } from 'react'
import { getHead, getSite } from '../lib/content/index.js'
import { endAutoScroll, startAutoScroll } from '../lib/journey/state.js'
import { prefersReducedMotion } from '../lib/motion.js'
import { getSavedScroll } from './history.js'
import { syncHead } from './syncHead.js'

function hashTarget(hash) {
  if (!hash || hash.length < 2) return null
  let id
  try {
    id = decodeURIComponent(hash.slice(1))
  } catch {
    id = hash.slice(1)
  }
  return document.getElementById(id)
}

/** The page h1: #page-heading on subpages and Not found, #hero-name on Home. */
function pageHeading() {
  return document.getElementById('page-heading') ?? document.getElementById('hero-name')
}

/** Heading to focus for a hash target: its section heading if any, else the page h1. */
function headingFor(target) {
  if (!target) return pageHeading()
  const heading = document.getElementById(`${target.id}-heading`)
  if (heading) return heading
  if (target.tabIndex >= 0 || target.hasAttribute('tabindex')) return target
  return pageHeading()
}

function focusWithoutScroll(el) {
  el?.focus({ preventScroll: true })
}

/**
 * v4 journey: every route is one document. A page route's own section is its scroll
 * target when the URL has no hash; Home targets the top (null).
 */
function journeyTarget(route, hash) {
  const fromHash = hashTarget(hash)
  if (fromHash) return fromHash
  if (route.kind === 'page') return document.getElementById(route.page.id)
  return null
}

/** Smooth scroll for link clicks in the journey; the scroll spy pauses until it ends. */
function glideTo(target) {
  const smooth = !prefersReducedMotion()
  if (smooth) {
    startAutoScroll()
    window.addEventListener('scrollend', endAutoScroll, { once: true })
  }
  const behavior = smooth ? 'smooth' : 'instant'
  if (target) target.scrollIntoView({ behavior, block: 'start' })
  else window.scrollTo({ top: 0, left: 0, behavior })
}

function journeyEffects(route, nav) {
  const target = journeyTarget(route, nav.hash)
  switch (nav.type) {
    case 'scroll':
      // The scroll spy already moved the URL to where the reader is. Head only.
      return
    case 'initial':
      // REQ-900: never move focus on load. A deep link (/projects/) opens at its section.
      if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' })
      return
    case 'hash':
      if (!target) return
      glideTo(target)
      if (document.getElementById(`${target.id}-heading`)) {
        requestAnimationFrame(() => focusWithoutScroll(headingFor(target)))
      }
      return
    case 'pop': {
      const y = getSavedScroll(nav.key)
      if (y != null) window.scrollTo({ top: y, left: 0, behavior: 'instant' })
      else if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' })
      else window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      focusWithoutScroll(headingFor(target))
      return
    }
    default:
      // 'push' and 'same': glide to the section (v4 overrides REQ-905's no-smooth rule).
      // Focus moves at once; preventScroll keeps it from interrupting the glide.
      glideTo(target)
      focusWithoutScroll(headingFor(target))
  }
}

function pagesEffects(nav) {
  const target = hashTarget(nav.hash)

  switch (nav.type) {
    case 'initial':
      // REQ-900: never move focus on load; jump to a hash target instantly.
      if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' })
      return
    case 'hash': {
      // Native in-page anchor (or back/forward between hashes on one page).
      // Only a section with its own heading gets focus; anything else (e.g.
      // "Back to top" -> header#top) keeps the browser's native behavior,
      // which moves the sequential focus start point to the target.
      if (!target) return
      target.scrollIntoView({
        behavior: prefersReducedMotion() ? 'instant' : 'smooth',
        block: 'start',
      })
      const heading = document.getElementById(`${target.id}-heading`)
      // Next frame: the browser's own fragment focus handling runs after popstate.
      if (heading) requestAnimationFrame(() => focusWithoutScroll(heading))
      return
    }
    case 'pop': {
      // REQ-902: restore the saved position (top if unknown), focus the h1.
      const y = getSavedScroll(nav.key)
      window.scrollTo({ top: y ?? 0, left: 0, behavior: 'instant' })
      focusWithoutScroll(pageHeading())
      return
    }
    case 'scroll':
      return
    default:
      // 'push' and 'same' (REQ-901, REQ-904): never smooth (REQ-905).
      if (target) {
        target.scrollIntoView({ behavior: 'instant', block: 'start' })
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      }
      focusWithoutScroll(headingFor(target))
  }
}

/**
 * Head, scroll and focus management after each route change (SPEC-v2 sec. 8, v4).
 * Runs as a layout effect so the scroll position is right before paint.
 */
export default function useRouteEffects(route, nav) {
  useLayoutEffect(() => {
    // 1. Head first, so screen readers have the new title when focus moves.
    syncHead(getHead(route))
    const journey = getSite().layout === 'journey' && route.kind !== 'not-found'
    if (journey) journeyEffects(route, nav)
    else pagesEffects(nav)
    // nav.id changes on every navigation, including 'same'.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav.id])
}
