#!/usr/bin/env node
// Check every URL in the content data, that every page href and section href resolves to a route
// (spec v2 REQ-947), and that every #anchor used in data points to a placed section.
// Usage: node scripts/check-links.mjs
// - 10 s timeout per URL; HEAD first, GET if HEAD is refused.
// - LinkedIn often answers 999 (bot blocking): reported as a warning, not an error.
// - URLs containing "TODO" are placeholders: reported as warnings and not fetched.
// - mailto: links are syntax-checked only.
// Exits 1 on any 4xx/5xx, network failure, or unknown anchor.

import { readContentFiles, formatReport, loadAndValidate } from './lib/content-files.mjs'
import { normalizeContent } from '../src/lib/content/normalize.js'
import { resolveRouteWithBase, sectionHrefOf } from '../src/lib/content/routes.js'
import { isPlaceholder } from '../src/lib/content/placeholders.js'

const TIMEOUT_MS = 10_000
const UA = 'Mozilla/5.0 (compatible; portfolio-link-checker/1.0)'

const validation = loadAndValidate()
if (validation.errors.length) {
  console.error(formatReport(validation))
  console.error('Fix content errors before checking links.')
  process.exit(1)
}
const { raw } = readContentFiles()
const c = normalizeContent(raw, { baseUrl: '/' })

/** Collect [url, where] pairs from the normalized content. */
function collectUrls() {
  const out = []
  const add = (url, where) => url && out.push({ url, where })
  add(c.site.siteUrl, 'site.siteUrl')
  c.links.forEach((l) => add(l.url, `links.json ${l.id}`))
  c.experience.forEach((e) => add(e.organizationUrl, `experience.json ${e.id}.organizationUrl`))
  c.education.forEach((e) => add(e.institutionUrl, `education.json ${e.id}.institutionUrl`))
  c.projects.forEach((p) => {
    for (const [k, v] of Object.entries(p.links)) add(v, `projects.json ${p.id}.links.${k}`)
  })
  return out
}

/** Internal hrefs: every page href and section href must resolve; data #anchors must be placed. */
function checkAnchors() {
  const problems = []
  const hrefs = []
  for (const p of c.pages) {
    hrefs.push(p.href)
    const r = resolveRouteWithBase(p.href, '/', c)
    if (r.kind !== 'page' || r.page.id !== p.id) problems.push(`page "${p.id}": ${p.href} does not resolve to the page`)
  }
  for (const s of c.sections) {
    const href = sectionHrefOf(s.id, c)
    hrefs.push(href)
    const [path, hash] = (href ?? '').split('#')
    const r = resolveRouteWithBase(path, '/', c)
    if (!href || r.kind !== 'page' || r.page.id !== s.pageId || hash !== s.id) problems.push(`section "${s.id}": ${href} does not resolve to page "${s.pageId}"`)
  }
  // Any "#anchor" referenced in data URLs must point to a placed section (or the page-level ids).
  const placed = new Set(['top', 'main', ...c.sections.map((s) => s.id)])
  for (const { url, where } of collectUrls()) {
    const m = /^#([\w-]+)$/.exec(url)
    if (m && !placed.has(m[1])) problems.push(`${where}: #${m[1]} is not a placed section`)
  }
  return { anchors: hrefs, problems }
}

async function request(url, method) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { method, redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': UA, accept: 'text/html,*/*' } })
    return { status: res.status }
  } catch (err) {
    return { error: err.name === 'AbortError' ? `timeout after ${TIMEOUT_MS / 1000}s` : err.cause?.code ?? err.message }
  } finally {
    clearTimeout(timer)
  }
}

async function check({ url, where }) {
  if (isPlaceholder(url)) return { url, where, level: 'warn', note: 'placeholder URL (contains TODO), not checked' }
  if (url.startsWith('mailto:')) {
    return /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url) ? { url, where, level: 'ok', note: 'mailto (syntax only)' } : { url, where, level: 'error', note: 'malformed mailto' }
  }
  if (url.startsWith('#')) return { url, where, level: 'ok', note: 'anchor' }
  let r = await request(url, 'HEAD')
  if (r.error || [403, 404, 405, 501].includes(r.status)) {
    const g = await request(url, 'GET')
    if (!g.error || r.error) r = g
  }
  // The site itself is unreachable until the first deploy: warn instead of failing.
  const selfCheck = where === 'site.siteUrl'
  if (selfCheck && (r.error || r.status >= 400)) return { url, where, level: 'warn', note: `${r.error ?? r.status} (site not deployed yet?)` }
  if (r.error) return { url, where, level: 'error', note: r.error }
  const isLinkedIn = /(^|\.)linkedin\.com$/i.test(new URL(url).hostname)
  if (r.status === 999 && isLinkedIn) return { url, where, level: 'warn', note: '999 (LinkedIn blocks automated checks; verify by hand)' }
  if (r.status >= 400) return { url, where, level: 'error', note: String(r.status) }
  return { url, where, level: 'ok', note: String(r.status) }
}

const urls = collectUrls()
const results = await Promise.all(urls.map(check))
const icon = { ok: '✓', warn: '⚠', error: '✖' }
for (const r of results) console.log(`${icon[r.level]} ${r.note.padEnd(10)} ${r.url}  (${r.where})`)

const { anchors, problems } = checkAnchors()
console.log(`\nInternal page and section links: ${anchors.join(', ')}`)
for (const p of problems) console.log(`✖ ${p}`)

const errors = results.filter((r) => r.level === 'error').length + problems.length
const warnings = results.filter((r) => r.level === 'warn').length
console.log(`\n${errors ? 'Links failed' : 'Links OK'}: ${results.length} URLs, ${anchors.length} internal links, ${errors} errors, ${warnings} warnings`)
process.exit(errors ? 1 : 0)
