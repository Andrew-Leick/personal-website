// Route resolution (spec v2 10.4, REQ-806). Pure; shared by the browser API (index.js binds it
// to BASE_URL) and the build plugin / scripts (which pass the base explicitly).

/** Ids a page may not use: they collide with build output or Vite folders (spec v2 10.2). */
export const RESERVED_PAGE_IDS = ['assets', 'content', 'index', '404', 'kart']

const withSlash = (base) => (base.endsWith('/') ? base : `${base}/`)

/**
 * @param {string} pathname  location.pathname, including the base (query/hash already removed)
 * @param {string} base      Vite base, e.g. "/" or "/personal-website/"
 * @param {{ pages: import('./types.js').Page[] }} content  normalized content
 * @returns {import('./types.js').Route}
 */
export function resolveRouteWithBase(pathname, base, content) {
  const notFound = { kind: 'not-found', page: null, canonicalPath: null }
  const b = withSlash(base || '/')
  let path = typeof pathname === 'string' && pathname ? pathname : '/'
  // The base without its trailing slash ("/personal-website") is still home.
  if (`${path}/` === b) path = b
  if (!path.startsWith(b)) return notFound
  let rest = path.slice(b.length)
  if (rest === 'index.html') rest = ''
  else if (rest.endsWith('/index.html')) rest = rest.slice(0, -'index.html'.length)
  if (rest === '') return { kind: 'home', page: null, canonicalPath: b }
  const m = /^([^/]+)\/?$/.exec(rest)
  if (!m) return notFound
  const page = content.pages.find((p) => p.id === m[1]) ?? null
  return page ? { kind: 'page', page, canonicalPath: b + page.path } : notFound
}

/**
 * Href of a placed section ("/about/#contact"), or null if it is not on any shown page.
 * @param {string} sectionId
 * @param {{ sections: import('./types.js').Section[] }} content
 */
export function sectionHrefOf(sectionId, content) {
  const s = content.sections.find((x) => x.id === sectionId)
  return s ? s.href : null
}

/** Every route the build emits: home plus one per shown page (not-found is separate). */
export function allRoutes(base, content) {
  const b = withSlash(base || '/')
  return [
    { kind: 'home', page: null, canonicalPath: b },
    ...content.pages.map((page) => ({ kind: 'page', page, canonicalPath: b + page.path })),
  ]
}

export const NOT_FOUND_ROUTE = Object.freeze({ kind: 'not-found', page: null, canonicalPath: null })
