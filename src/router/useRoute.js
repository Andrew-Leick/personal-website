import { useMemo, useSyncExternalStore } from 'react'
import { resolveRoute } from '../lib/content/index.js'
import { getSnapshot, subscribe } from './history.js'

/**
 * Current route from the History API store.
 * Returns { route, hash, nav } where `route` is resolveRoute(pathname) and
 * `nav` is the raw snapshot (id, type, key) that route effects key off.
 */
export default function useRoute() {
  const nav = useSyncExternalStore(subscribe, getSnapshot)
  const route = useMemo(() => resolveRoute(nav.pathname), [nav.pathname])
  return { route, hash: nav.hash, nav }
}
