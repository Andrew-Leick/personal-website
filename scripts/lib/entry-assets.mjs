// Asset files an HTML entry loads up front (v5: size budgets are per entry, SPEC-v5-kart 4.2).

/**
 * Module scripts, modulepreloads and stylesheets under assets/, in document order.
 * @param {string} html
 * @returns {string[]} paths relative to dist, e.g. "assets/index-abc.js"
 */
export function entryAssets(html) {
  const out = new Set()
  for (const [tag] of html.matchAll(/<(?:script|link)\b[^>]*>/g)) {
    const isScript = tag.startsWith('<script') && /type="module"/.test(tag)
    const isLink = /rel="(?:modulepreload|stylesheet)"/.test(tag)
    if (!isScript && !isLink) continue
    const url = (/(?:src|href)="([^"]+)"/.exec(tag) || [])[1]
    const m = url && /(assets\/[^"?#]+\.(?:js|css))/.exec(url)
    if (m) out.add(m[1])
  }
  return [...out]
}
