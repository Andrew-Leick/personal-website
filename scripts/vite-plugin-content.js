// Vite content plugin (spec 7.5, REQ-500 to REQ-505, REQ-114; spec v2 REQ-940 to REQ-946).
// - Replaces <!-- content:head --> (with the route's head, wrapped in content:head:start/end
//   comments) and <!-- content:noscript --> in index.html. In dev the head follows the request URL.
// - Validates content at build start (fails the build on errors) and on every data edit in dev
//   (errors go to the Vite error overlay; the page reloads once fixed).
// - After the build, writes dist/{pageId}/index.html per shown page (and dist/{aliasId}/index.html
//   with the same page's head) and dist/404.html: copies of dist/index.html with only the head block swapped.
// - Emits robots.txt, sitemap.xml (home + every page; no aliases) and, for a custom domain, CNAME.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, sep, resolve } from 'node:path'
import { loadAndValidate, formatReport, ROOT } from './lib/content-files.mjs'
import { formatIssue } from '../src/lib/content/validate.js'
import { normalizeContent } from '../src/lib/content/normalize.js'
import { isPlaceholder } from '../src/lib/content/placeholders.js'
import { headFor } from '../src/lib/content/head.js'
import { resolveRouteWithBase, NOT_FOUND_ROUTE } from '../src/lib/content/routes.js'

const HEAD_MARKER = '<!-- content:head -->'
const NOSCRIPT_MARKER = '<!-- content:noscript -->'
export const HEAD_START = '<!-- content:head:start -->'
export const HEAD_END = '<!-- content:head:end -->'
const HEAD_BLOCK_RE = /<!-- content:head:start -->[\s\S]*?<!-- content:head:end -->/
const HOME_ROUTE = { kind: 'home', page: null, canonicalPath: null }

/** Escape text for HTML text and double-quoted attribute contexts. */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const LINE_SEPARATORS = new RegExp(`[${String.fromCharCode(0x2028, 0x2029)}]`, 'g')

/** JSON safe to embed in <script>: no "</script>" or HTML comment openers. */
function jsonForScript(value) {
  return JSON.stringify(value, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(LINE_SEPARATORS, (ch) => `\\u${ch.charCodeAt(0).toString(16)}`)
}

/** Hostname to put in CNAME, or null for *.github.io (no custom domain). */
export function customDomainOf(siteUrl) {
  try {
    const host = new URL(siteUrl).hostname
    return /\.github\.io$/i.test(host) ? null : host
  } catch {
    return null
  }
}

/**
 * Build the <head> block for a route (spec v2 section 7), wrapped in the start/end comments.
 * @param {import('../src/lib/content/types.js').SiteContent} c
 * @param {import('../src/lib/content/types.js').Route} [route]  defaults to Home
 */
export function renderHead(c, route = HOME_ROUTE) {
  const { site } = c
  const { title, description, canonical, robots, jsonLd } = headFor(route, c)
  // site.ogImage is resolved with BASE_URL; turn it into an absolute URL under siteUrl.
  const ogImageAbs = site.ogImage ? absoluteFromBase(site.ogImage, site.siteUrl) : null

  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
  ]
  if (canonical) tags.push(`<link rel="canonical" href="${escapeHtml(canonical)}" />`)
  if (robots === 'noindex') tags.push(`<meta name="robots" content="noindex" />`)
  tags.push(
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="${escapeHtml(site.locale)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(site.title)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
  )
  if (canonical) tags.push(`<meta property="og:url" content="${escapeHtml(canonical)}" />`)
  if (ogImageAbs) {
    tags.push(
      `<meta property="og:image" content="${escapeHtml(ogImageAbs)}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
    )
    if (site.ogImageAlt) tags.push(`<meta property="og:image:alt" content="${escapeHtml(site.ogImageAlt)}" />`)
  }
  tags.push(
    `<meta name="twitter:card" content="${ogImageAbs ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
  )
  if (ogImageAbs) {
    tags.push(`<meta name="twitter:image" content="${escapeHtml(ogImageAbs)}" />`)
    if (site.ogImageAlt) tags.push(`<meta name="twitter:image:alt" content="${escapeHtml(site.ogImageAlt)}" />`)
  }
  // JSON-LD Person (REQ-503): Home only (REQ-880).
  if (jsonLd) tags.push(`<script type="application/ld+json">${jsonForScript(jsonLd)}</script>`)

  return [HEAD_START, ...tags, HEAD_END].join('\n    ')
}

/** Replace the head block of a built HTML file (between the start/end comments). */
export function swapHead(html, head) {
  if (!HEAD_BLOCK_RE.test(html)) throw new Error('content plugin: head block comments not found in built index.html')
  return html.replace(HEAD_BLOCK_RE, () => head)
}

/** "/base/og-image.png" (BASE_URL-resolved) -> absolute URL under siteUrl. */
function absoluteFromBase(resolvedPath, siteUrl) {
  // siteUrl already includes the deploy path (e.g. https://x.github.io/repo/), and resolvedPath
  // includes the Vite base; strip the base and join the remainder onto siteUrl.
  const sitePath = new URL(siteUrl).pathname
  const rel = resolvedPath.startsWith(sitePath) ? resolvedPath.slice(sitePath.length) : resolvedPath.replace(/^\/+/, '')
  return new URL(rel, siteUrl).href
}

/** Content of the <noscript> block (REQ-505). */
export function renderNoscript(c) {
  const { profile, links } = c
  const items = []
  if (profile.resumeUrl) items.push(`<li><a href="${escapeHtml(profile.resumeUrl)}">Resume (PDF)</a></li>`)
  for (const l of links) {
    if (isPlaceholder(l.url)) continue
    items.push(`<li><a href="${escapeHtml(l.url)}">${escapeHtml(l.label)}</a></li>`)
  }
  // REQ-943: links to each shown page, absolute with the base.
  const pages = (c.pages ?? []).map((p) => `<li><a href="${escapeHtml(p.href)}">${escapeHtml(p.label)}</a></li>`)
  return [
    `<p><strong>${escapeHtml(profile.name)}</strong></p>`,
    `<p>This site needs JavaScript. My resume and links:</p>`,
    `<ul>${items.join('')}</ul>`,
    ...(pages.length ? [`<ul>${pages.join('')}</ul>`] : []),
  ].join('\n      ')
}

export function renderRobots(siteUrl) {
  return `User-agent: *\nAllow: /\nSitemap: ${siteUrl}sitemap.xml\n`
}

/** Absolute URLs of Home and every shown page (REQ-882). */
export function sitemapUrls(c) {
  return [c.site.siteUrl, ...c.pages.map((p) => `${c.site.siteUrl}${p.path}`)]
}

export function renderSitemap(c) {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    sitemapUrls(c).map((u) => `  <url><loc>${escapeHtml(u)}</loc></url>\n`).join('') +
    '</urlset>\n'
  )
}

/** Dev request URL -> pathname (query and hash removed). */
export function requestPath(url) {
  if (typeof url !== 'string' || !url) return '/'
  return url.split(/[?#]/)[0] || '/'
}

class ContentError extends Error {
  constructor(report) {
    super(`Content validation failed:\n${report}`)
    this.name = 'ContentError'
    this.plugin = 'content'
    this.stack = ''
  }
}

/** @returns {import('vite').Plugin} */
export function contentPlugin() {
  let base = '/'
  let command = 'serve'
  let outDir = 'dist'
  let state = null // { content, result } from the last load

  const load = () => {
    const result = loadAndValidate({ strict: false })
    const content = result.errors.length ? null : normalizeContent(result.raw, { baseUrl: base })
    state = { result, content }
    return state
  }

  const isDataFile = (file) => {
    const rel = relative(ROOT, file).split(sep).join('/')
    return rel.startsWith('src/data/') && rel.endsWith('.json')
  }

  return {
    name: 'content',
    enforce: 'pre',

    configResolved(config) {
      base = config.base
      command = config.command
      outDir = resolve(config.root, config.build.outDir)
    },

    buildStart() {
      const { result } = load()
      const report = formatReport(result)
      if (result.errors.length) {
        if (command === 'build') this.error(new ContentError(report))
        else this.warn(`\n${report}`)
      } else if (command === 'build' && result.warnings.length) {
        this.warn(`\n${result.warnings.map((w) => formatIssue(w, 'warning')).join('\n')}`)
      }
      if (command === 'build' && state.content) {
        const siteUrl = state.content.site.siteUrl
        const sitePath = new URL(siteUrl).pathname
        if (sitePath !== base) {
          this.warn(`site.siteUrl path "${sitePath}" does not match the Vite base "${base}". Set BASE_PATH or siteUrl so they agree (see README "Deploy").`)
        }
      }
    },

    // Dev: a data file that fails validation surfaces as a module error (Vite overlay),
    // so the page never renders stale or invalid content silently.
    transform(code, id) {
      if (command !== 'serve') return null
      const file = id.split('?')[0]
      if (!isDataFile(file)) return null
      const { result } = load()
      if (result.errors.length) this.error(new ContentError(formatReport(result)))
      return null
    },

    handleHotUpdate(ctx) {
      if (!isDataFile(ctx.file)) return undefined
      const { result } = load()
      if (result.errors.length) {
        const report = formatReport(result)
        ctx.server.config.logger.error(report, { timestamp: true })
        ctx.server.ws.send({
          type: 'error',
          err: { message: `Content validation failed:\n${report}`, stack: '', plugin: 'content', id: ctx.file },
        })
      } else {
        ctx.server.ws.send({ type: 'full-reload' })
      }
      return []
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const { content, result } = load()
        if (!content) {
          // Dev with invalid content: keep the page loadable so the overlay can show the errors.
          const msg = escapeHtml(formatReport(result))
          return html
            .replace(HEAD_MARKER, `<title>Content error</title>`)
            .replace(NOSCRIPT_MARKER, `<pre>${msg}</pre>`)
        }
        // Build: index.html is Home (other routes are written in writeBundle).
        // Dev: Vite's SPA fallback serves index.html for every path, so use the request URL (REQ-946).
        const route = command === 'serve' ? resolveRouteWithBase(requestPath(ctx && ctx.originalUrl), base, content) : HOME_ROUTE
        const head = renderHead(content, route)
        const noscript = renderNoscript(content)
        return html.replace(HEAD_MARKER, () => head).replace(NOSCRIPT_MARKER, () => noscript)
      },
    },

    generateBundle() {
      const content = state && state.content ? state.content : load().content
      if (!content) return
      const siteUrl = content.site.siteUrl
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: renderRobots(siteUrl) })
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: renderSitemap(content) })
      // Custom domain: GitHub Pages reads dist/CNAME. Derived from siteUrl unless public/CNAME exists
      // (Vite copies that one; the validator checks it agrees with siteUrl).
      const domain = customDomainOf(siteUrl)
      if (domain && !existsSync(join(ROOT, 'public', 'CNAME'))) {
        this.emitFile({ type: 'asset', fileName: 'CNAME', source: `${domain}\n` })
      }
    },

    // REQ-940 to REQ-942: one static HTML file per shown page plus 404.html, each a copy of the
    // built index.html with only the head block swapped, so asset URLs (absolute with base) match.
    writeBundle(options) {
      const content = state && state.content ? state.content : load().content
      if (!content) return
      const dir = options && options.dir ? options.dir : outDir
      const indexPath = join(dir, 'index.html')
      if (!existsSync(indexPath)) return
      const html = readFileSync(indexPath, 'utf8')
      for (const page of content.pages) {
        const pageHtml = swapHead(html, renderHead(content, { kind: 'page', page, canonicalPath: null }))
        // V5-08: aliases get the target page's HTML so the host serves them with a 200.
        for (const id of [page.id, ...page.aliases.map((a) => a.id)]) {
          mkdirSync(join(dir, id), { recursive: true })
          writeFileSync(join(dir, id, 'index.html'), pageHtml)
        }
      }
      writeFileSync(join(dir, '404.html'), swapHead(html, renderHead(content, NOT_FOUND_ROUTE)))
    },
  }
}

export default contentPlugin
