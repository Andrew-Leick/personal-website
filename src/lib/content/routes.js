// Route resolution (spec v2 10.4, REQ-806). Pure; shared by the browser API (index.js binds it
// to BASE_URL) and the build plugin / scripts (which pass the base explicitly).

/** Ids a page may not use: they collide with build output or Vite folders (spec v2 10.2). */
export const RESERVED_PAGE_IDS = ['assets', 'content', 'index', '404']

const withSlash = (base) => (base.endsWith('/') ? base : `${base}/`)

/**
 * @param {string} pathname  location.pathname, including the base (query/hash already removed)
 * @param {string} base      Vite base, e.g. "/" or "/personal-website/"
 * @param {{ pages: import('./types.js').Page[] }} content  normalized content
 * @returns {import('./types.js').Route}
 */
export function resolveRouteWithBase(pathname, base, content) {
  const notFound = { kind: 'not-found', page: null, canonicalPath: null, hash: null }
  const b = withSlash(base || '/')
  let path = typeof pathname === 'string' && pathname ? pathname : '/'
  // The base without its trailing slash ("/personal-website") is still home.
  if (`${path}/` === b) path = b
  if (!path.startsWith(b)) return notFound
  let rest = path.slice(b.length)
  if (rest === 'index.html') rest = ''
  else if (rest.endsWith('/index.html')) rest = rest.slice(0, -'index.html'.length)
  if (rest === '') return { kind: 'home', page: null, canonicalPath: b, hash: null }
  const m = /^([^/]+)\/?$/.exec(rest)
  if (!m) return notFound
  const page = content.pages.find((p) => p.id === m[1])
  if (page) return { kind: 'page', page, canonicalPath: b + page.path, hash: null }
  // V5-06: an alias ("/projects/") resolves to its page, plus the hash that opens the right view.
  for (const p of content.pages) {
    const alias = (p.aliases ?? []).find((a) => a.id === m[1])
    if (alias) return { kind: 'page', page: p, canonicalPath: b + p.path, hash: alias.hash ? `#${alias.hash}` : null }
  }
  return notFound
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
    { kind: 'home', page: null, canonicalPath: b, hash: null },
    ...content.pages.map((page) => ({ kind: 'page', page, canonicalPath: b + page.path, hash: null })),
  ]
}

export const NOT_FOUND_ROUTE = Object.freeze({ kind: 'not-found', page: null, canonicalPath: null, hash: null })
