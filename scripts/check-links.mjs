#!/usr/bin/env node
// Check every URL in the content data, and that every nav #anchor resolves to a rendered section.
// Usage: node scripts/check-links.mjs
// - 10 s timeout per URL; HEAD first, GET if HEAD is refused.
// - LinkedIn often answers 999 (bot blocking): reported as a warning, not an error.
// - URLs containing "TODO" are placeholders: reported as warnings and not fetched.
// - mailto: links are syntax-checked only.
// Exits 1 on any 4xx/5xx, network failure, or unknown anchor.

import { readContentFiles, formatReport, loadAndValidate } from './lib/content-files.mjs'
import { normalizeContent, SECTION_IDS } from '../src/lib/content/normalize.js'
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

/** Anchors the page links to: nav (from getSections), plus #top and #main. */
function checkAnchors() {
  const problems = []
  const rendered = new Set(['top', 'main', ...c.sections.map((s) => s.id)])
  for (const s of c.sections) {
    if (!SECTION_IDS.includes(s.id)) problems.push(`#${s.id}: not a known section id`)
  }
  // Any "#anchor" referenced in data URLs must point to a rendered section.
  for (const { url, where } of collectUrls()) {
    const m = /^#([\w-]+)$/.exec(url)
    if (m && !rendered.has(m[1])) problems.push(`${where}: #${m[1]} is not a rendered section`)
  }
  return { anchors: [...rendered].map((a) => `#${a}`), problems }
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
console.log(`\nAnchors used by navigation: ${anchors.join(', ')}`)
for (const p of problems) console.log(`✖ ${p}`)

const errors = results.filter((r) => r.level === 'error').length + problems.length
const warnings = results.filter((r) => r.level === 'warn').length
console.log(`\n${errors ? 'Links failed' : 'Links OK'}: ${results.length} URLs, ${anchors.length} anchors, ${errors} errors, ${warnings} warnings`)
process.exit(errors ? 1 : 0)
