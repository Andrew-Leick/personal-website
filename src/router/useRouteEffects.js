import { useLayoutEffect } from 'react'
import { getHead } from '../lib/content/index.js'
import { glideTo as glide } from '../lib/journey/glide.js'
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

/** The page h1: #page-heading on Not found, #hero-name in the journey. */
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

/**
 * Eased glide for link clicks in the journey (src/lib/journey/glide.js). The scroll spy and
 * the intros of sections passed on the way pause until it ends.
 */
function glideTo(target) {
  const sectionId = target?.closest('[data-journey-section]')?.id ?? null
  glide(target, sectionId)
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

/**
 * Not found, the only route outside the journey. On load nothing moves (REQ-900). Back/forward
 * restores the saved position (REQ-902); a push starts at the top. Both focus the h1.
 */
function notFoundEffects(nav) {
  if (nav.type === 'initial' || nav.type === 'hash' || nav.type === 'scroll') return
  const y = nav.type === 'pop' ? getSavedScroll(nav.key) : null
  window.scrollTo({ top: y ?? 0, left: 0, behavior: 'instant' })
  focusWithoutScroll(pageHeading())
}

/**
 * Head, scroll and focus management after each route change (SPEC-v2 sec. 8, v4).
 * Runs as a layout effect so the scroll position is right before paint.
 */
export default function useRouteEffects(route, nav) {
  useLayoutEffect(() => {
    // 1. Head first, so screen readers have the new title when focus moves.
    syncHead(getHead(route))
    if (route.kind === 'not-found') notFoundEffects(nav)
    else journeyEffects(route, nav)
    // nav.id changes on every navigation, including 'same'.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav.id])
}
