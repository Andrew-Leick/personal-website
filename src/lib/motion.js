// One shared MediaQueryList: prefersReducedMotion() is called many times per frame by the
// journey, and matchMedia() would build a new query object on every call.
let query = null

/** True when the user asked the OS for reduced motion. Safe outside a browser. */
export function prefersReducedMotion() {
  try {
    query ??= window.matchMedia('(prefers-reduced-motion: reduce)')
    return query.matches
  } catch {
    return false
  }
}
