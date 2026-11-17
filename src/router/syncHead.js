/*
 * REQ-881: update the document head in place from getHead(route) on client
 * navigation. Updates existing tags, adds or removes the optional ones
 * (canonical, og:url, robots) and never creates duplicates.
 */

/** One `<tag key="name">` in the head with `valueAttr` set to `value`; none when value is null. */
function upsert(tag, key, name, valueAttr, value) {
  const existing = document.head.querySelectorAll(`${tag}[${key}="${name}"]`)
  existing.forEach((el, i) => (value == null || i > 0) && el.remove())
  if (value == null) return
  let el = existing[0]
  if (!el) {
    el = document.createElement(tag)
    el.setAttribute(key, name)
    document.head.appendChild(el)
  }
  el.setAttribute(valueAttr, value)
}

const upsertMeta = (attr, name, content) => upsert('meta', attr, name, 'content', content)
const upsertCanonical = (href) => upsert('link', 'rel', 'canonical', 'href', href)

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
