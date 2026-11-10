/*
 * REQ-881: update the document head in place from getHead(route) on client
 * navigation. Updates existing tags, adds or removes the optional ones
 * (canonical, og:url, robots) and never creates duplicates.
 */

function upsertMeta(attr, name, content) {
  const selector = `meta[${attr}="${name}"]`
  const existing = document.head.querySelectorAll(selector)
  if (content == null) {
    existing.forEach((el) => el.remove())
    return
  }
  existing.forEach((el, i) => i > 0 && el.remove())
  let el = existing[0]
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href) {
  const existing = document.head.querySelectorAll('link[rel="canonical"]')
  if (href == null) {
    existing.forEach((el) => el.remove())
    return
  }
  existing.forEach((el, i) => i > 0 && el.remove())
  let el = existing[0]
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/** @param {import('../lib/content/types.js').Head} head */
export function syncHead(head) {
  if (!head) return
  document.title = head.title
  upsertMeta('name', 'description', head.description)
  upsertMeta('property', 'og:title', head.title)
  upsertMeta('property', 'og:description', head.description)
  upsertMeta('property', 'og:url', head.canonical)
  upsertMeta('name', 'twitter:title', head.title)
  upsertMeta('name', 'twitter:description', head.description)
  upsertMeta('name', 'robots', head.robots === 'noindex' ? 'noindex' : null)
  upsertCanonical(head.canonical)
}
