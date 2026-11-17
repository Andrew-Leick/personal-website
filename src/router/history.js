/*
 * Tiny History API store for the client router (SPEC-v2 section 4, 8).
 *
 * Holds one immutable snapshot of the current location plus the kind of
 * navigation that produced it, so route effects know whether to restore
 * scroll (back/forward), jump to the top (push), or leave things alone
 * (initial load).
 *
 * Snapshot `type`:
 *   'initial' first render after page load
 *   'push'    navigate() to a different URL
 *   'same'    navigate() to the URL already shown (no history entry, REQ-904)
 *   'pop'     back/forward to a different path
 *   'hash'    back/forward or native anchor click within the same path
 *   'scroll'  the v4 journey's scroll spy replaced the path in place (replaceFromScroll)
 */

import { resolveRoute } from '../lib/content/index.js'

/** Scroll positions per history entry key (in memory only, REQ-902). */
const scrollPositions = new Map()
const listeners = new Set()

let keyCounter = 0
function newKey() {
  keyCounter += 1
  return `${Date.now().toString(36)}-${keyCounter}`
}

function currentKey() {
  return window.history.state?.key ?? null
}

/** Give the current history entry a key if it has none (fresh load, native hash nav). */
function ensureKey() {
  if (currentKey()) return currentKey()
  const key = newKey()
  try {
    window.history.replaceState({ ...(window.history.state ?? {}), key }, '')
  } catch {
    // Ignore: some embedded contexts block history writes.
  }
  return key
}

let navId = 0
function makeSnapshot(type) {
  navId += 1
  return {
    id: navId,
    type,
    key: ensureKey(),
    pathname: window.location.pathname,
    hash: window.location.hash,
  }
}

/**
 * REQ-906: replace a non-canonical path (no trailing slash, index.html) in place.
 * V5-07: an alias path ("/projects/") also gains its route hash when the URL has none.
 */
function normalizeCurrentPath() {
  const { canonicalPath, hash } = resolveRoute(window.location.pathname)
  if (canonicalPath && canonicalPath !== window.location.pathname) {
    try {
      window.history.replaceState(
        window.history.state,
        '',
        canonicalPath + window.location.search + (window.location.hash || hash || ''),
      )
    } catch {
      // Ignore: the page still renders from the original path.
    }
  }
}

if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}
normalizeCurrentPath()

let snapshot = makeSnapshot('initial')

function emit(type) {
  snapshot = makeSnapshot(type)
  listeners.forEach((listener) => listener())
}

window.addEventListener('popstate', () => {
  // Scroll has not moved yet (manual restoration), so this is the position of
  // the entry we are leaving.
  scrollPositions.set(snapshot.key, window.scrollY)
  normalizeCurrentPath()
  emit(window.location.pathname === snapshot.pathname ? 'hash' : 'pop')
})

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSnapshot() {
  return snapshot
}

/** Saved scroll position for a history entry key, or null if unknown. */
export function getSavedScroll(key) {
  return scrollPositions.has(key) ? scrollPositions.get(key) : null
}

/**
 * v4 journey: the reader scrolled into another page's section. Swap the path in place (no
 * new history entry, hash dropped) so the URL, title and nav follow the scroll position.
 * Route effects only sync the head for this type; they never scroll or move focus.
 */
export function replaceFromScroll(path) {
  // V5-07/V5-17: a #pokedex-* hash names a view, not a scroll target, so it stays while on its page.
  if (!path || (path === window.location.pathname && /^(#pokedex-.*)?$/.test(window.location.hash))) return
  try {
    window.history.replaceState(window.history.state, '', path + window.location.search)
  } catch {
    return
  }
  emit('scroll')
}

/**
 * Client-side navigation to a same-origin URL.
 * Same URL as now: no new history entry, just re-run the route effects.
 */
export function navigate(href, { replace = false } = {}) {
  const url = new URL(href, window.location.href)
  const { canonicalPath, hash } = resolveRoute(url.pathname)
  const target = (canonicalPath ?? url.pathname) + url.search + (url.hash || hash || '')
  const current = window.location.pathname + window.location.search + window.location.hash

  if (target === current && !replace) {
    emit('same')
    return
  }

  scrollPositions.set(snapshot.key, window.scrollY)
  const state = { key: newKey() }
  if (replace) window.history.replaceState(state, '', target)
  else window.history.pushState(state, '', target)
  emit('push')
}
