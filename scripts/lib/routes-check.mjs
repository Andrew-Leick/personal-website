// Checks for the built route files (spec v2 REQ-945). Pure apart from reading distDir.
// Used by scripts/check-routes.mjs and its tests.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createHash } from 'node:crypto'
import { headFor } from '../../src/lib/content/head.js'
import { NOT_FOUND_ROUTE } from '../../src/lib/content/routes.js'
import { escapeHtml, sitemapUrls } from '../vite-plugin-content.js'

const HEAD_BLOCK_RE = /<!-- content:head:start -->[\s\S]*?<!-- content:head:end -->/
const UNEXPANDED = ['<!-- content:head -->', '<!-- content:noscript -->']

const titleOf = (html) => (/<title>([\s\S]*?)<\/title>/.exec(html) || [])[1] ?? null
const canonicalOf = (html) => (/<link rel="canonical" href="([^"]*)"/.exec(html) || [])[1] ?? null
const hasNoindex = (html) => /<meta name="robots" content="noindex"/.test(html)
const hasJsonLd = (html) => html.includes('application/ld+json')

function htmlFiles(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...htmlFiles(full))
    else if (name.endsWith('.html')) out.push(full)
  }
  return out
}

/**
 * @param {string} distDir
 * @param {import('../../src/lib/content/types.js').SiteContent} content  normalized with the build base
 * @param {string} base  the Vite base used for the build
 * @returns {{ problems: string[], checked: string[] }}
 */
export function checkRoutes(distDir, content, base) {
  const problems = []
  const checked = []
  const rel = (f) => relative(distDir, f).split('\\').join('/')
  const indexPath = join(distDir, 'index.html')
  if (!existsSync(indexPath)) return { problems: [`dist/index.html not found. Run "npm run build" first.`], checked }
  const indexHtml = readFileSync(indexPath, 'utf8')
  const indexBody = indexHtml.replace(HEAD_BLOCK_RE, '')
  if (!HEAD_BLOCK_RE.test(indexHtml)) problems.push('index.html: head block comments (content:head:start/end) missing')

  const expectHead = (file, html, head) => {
    const want = escapeHtml(head.title)
    const title = titleOf(html)
    if (title !== want) problems.push(`${file}: <title> is ${JSON.stringify(title)}, expected ${JSON.stringify(want)}`)
    const canonical = canonicalOf(html)
    const wantCanonical = head.canonical === null ? null : escapeHtml(head.canonical)
    if (canonical !== wantCanonical) problems.push(`${file}: canonical is ${JSON.stringify(canonical)}, expected ${JSON.stringify(wantCanonical)}`)
    if ((head.robots === 'noindex') !== hasNoindex(html)) problems.push(`${file}: robots noindex ${hasNoindex(html) ? 'present' : 'missing'}, expected ${head.robots}`)
    if (Boolean(head.jsonLd) !== hasJsonLd(html)) problems.push(`${file}: JSON-LD ${hasJsonLd(html) ? 'present' : 'missing'} (expected on Home only)`)
    if (html.replace(HEAD_BLOCK_RE, '') !== indexBody) problems.push(`${file}: differs from index.html outside the head block`)
    checked.push(file)
  }

  expectHead('index.html', indexHtml, headFor({ kind: 'home', page: null, canonicalPath: base }, content))
  for (const page of content.pages) {
    const file = `${page.id}/index.html`
    const full = join(distDir, page.id, 'index.html')
    if (!existsSync(full)) {
      problems.push(`${file}: missing (page "${page.id}" is shown)`)
      continue
    }
    expectHead(file, readFileSync(full, 'utf8'), headFor({ kind: 'page', page, canonicalPath: base + page.path }, content))
  }
  const nfPath = join(distDir, '404.html')
  if (!existsSync(nfPath)) problems.push('404.html: missing')
  else expectHead('404.html', readFileSync(nfPath, 'utf8'), headFor(NOT_FOUND_ROUTE, content))

  // Route folders for pages that are not shown (hidden or empty) must not exist.
  const shown = new Set(content.pages.map((p) => p.id))
  for (const name of readdirSync(distDir)) {
    if (name !== 'assets' && !shown.has(name) && existsSync(join(distDir, name, 'index.html'))) {
      problems.push(`${name}/index.html: emitted, but "${name}" is not a shown page`)
    }
  }

  // Leftover unexpanded markers, and asset URLs that are not absolute with the base (REQ-941).
  for (const f of htmlFiles(distDir)) {
    const html = readFileSync(f, 'utf8')
    for (const m of UNEXPANDED) if (html.includes(m)) problems.push(`${rel(f)}: unexpanded marker ${m}`)
    for (const [, url] of html.matchAll(/(?:src|href)="([^"]*assets\/[^"]*)"/g)) {
      if (!url.startsWith(base)) problems.push(`${rel(f)}: asset URL ${JSON.stringify(url)} does not start with the base ${JSON.stringify(base)}`)
    }
  }

  // Sitemap = Home + every shown page (REQ-882).
  const smPath = join(distDir, 'sitemap.xml')
  if (!existsSync(smPath)) problems.push('sitemap.xml: missing')
  else {
    const got = [...readFileSync(smPath, 'utf8').matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]).sort()
    const want = sitemapUrls(content).map(escapeHtml).sort()
    if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`sitemap.xml: lists ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`)
    checked.push('sitemap.xml')
  }
  return { problems, checked }
}

/** Self-hosted fonts shipped in public/fonts (spec v3 6.4). Hashes are of the unmodified files. */
export const FONT_FILES = {
  'press-start-2p-latin-400.woff2': 'afec86997fdaf54af1f59358fa2c1e2a0f1d04146edad18e5cd141d0384a7548',
  'pixelify-sans-latin-400.woff2': 'd830612ac9131788ebae754b9268f83f7c1d3ffa9bc0f9a5514207a8283fe71e',
  'pixelify-sans-latin-700.woff2': 'c836cfa5c0e9d62ea9b890e0418d52a6004149090a521cd198a8c09f5d5ab893',
  'OFL-press-start-2p.txt': null,
  'OFL-pixelify-sans.txt': null,
}
const FONT_PRELOAD_NEEDLE = 'fonts/press-start-2p-latin-400.woff2'

/**
 * Check the built fonts (spec v3 8.5, REQ-1061): the five files exist, each .woff2 matches its
 * SHA-256, dist/index.html references the display font exactly twice (preload + @font-face), and
 * no dist HTML file keeps a literal %BASE_URL%.
 * @param {string} distDir
 * @returns {{ problems: string[], checked: string[] }}
 */
export function checkFonts(distDir) {
  const problems = []
  const checked = []
  for (const [name, hash] of Object.entries(FONT_FILES)) {
    const file = join(distDir, 'fonts', name)
    if (!existsSync(file)) {
      problems.push(`fonts/${name}: missing from dist/fonts`)
      continue
    }
    if (hash) {
      const actual = createHash('sha256').update(readFileSync(file)).digest('hex')
      if (actual !== hash) {
        problems.push(`fonts/${name}: SHA-256 is ${actual}, expected ${hash} (font files must not be modified)`)
        continue
      }
    }
    checked.push(`fonts/${name}`)
  }
  const indexPath = join(distDir, 'index.html')
  if (existsSync(indexPath)) {
    const count = readFileSync(indexPath, 'utf8').split(FONT_PRELOAD_NEEDLE).length - 1
    if (count !== 2) problems.push(`index.html: "${FONT_PRELOAD_NEEDLE}" appears ${count} times, expected 2 (one preload and one @font-face)`)
  } else {
    problems.push('index.html: missing from dist')
  }
  if (existsSync(distDir)) {
    for (const file of htmlFiles(distDir)) {
      if (readFileSync(file, 'utf8').includes('%BASE_URL%')) problems.push(`${relative(distDir, file)}: contains a literal %BASE_URL%`)
    }
  }
  return { problems, checked }
}
