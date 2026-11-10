// Vite content plugin (spec 7.5, REQ-500 to REQ-505, REQ-114).
// - Replaces <!-- content:head --> and <!-- content:noscript --> in index.html.
// - Validates content at build start (fails the build on errors) and on every data edit in dev
//   (errors go to the Vite error overlay; the page reloads once fixed).
// - Emits robots.txt, sitemap.xml and, for a custom domain, CNAME.

import { existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { loadAndValidate, formatReport, ROOT } from './lib/content-files.mjs'
import { formatIssue } from '../src/lib/content/validate.js'
import { normalizeContent } from '../src/lib/content/normalize.js'
import { isPlaceholder } from '../src/lib/content/placeholders.js'

const HEAD_MARKER = '<!-- content:head -->'
const NOSCRIPT_MARKER = '<!-- content:noscript -->'

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

const real = (v) => (typeof v === 'string' && v.trim() && !isPlaceholder(v) ? v : null)

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
 * Build the <head> block.
 * @param {import('../src/lib/content/types.js').SiteContent} c
 */
export function renderHead(c) {
  const { site, profile, links, education } = c
  const headline = real(profile.headline)
  const title = headline ? `${profile.name} | ${headline}` : site.title
  const description = site.description
  const url = site.siteUrl
  // site.ogImage is resolved with BASE_URL; turn it into an absolute URL under siteUrl.
  const ogImageAbs = site.ogImage ? absoluteFromBase(site.ogImage, url) : null

  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="${escapeHtml(site.locale)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(site.title)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
  ]
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

  // JSON-LD Person (REQ-503). Placeholder values are omitted. No address/location by design.
  const person = { '@context': 'https://schema.org', '@type': 'Person', name: profile.name, url }
  if (headline) person.jobTitle = headline
  if (real(profile.email)) person.email = `mailto:${profile.email}`
  const sameAs = links.filter((l) => l.kind !== 'email' && /^https:\/\//.test(l.url) && !isPlaceholder(l.url)).map((l) => l.url)
  if (sameAs.length) person.sameAs = sameAs
  const alumniOf = education
    .filter((e) => real(e.institution))
    .map((e) => {
      const org = { '@type': 'CollegeOrUniversity', name: e.institution }
      if (real(e.institutionUrl)) org.url = e.institutionUrl
      return org
    })
  if (alumniOf.length) person.alumniOf = alumniOf
  tags.push(`<script type="application/ld+json">${jsonForScript(person)}</script>`)

  return tags.join('\n    ')
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
  return [
    `<p><strong>${escapeHtml(profile.name)}</strong></p>`,
    `<p>This site needs JavaScript. My resume and links:</p>`,
    `<ul>${items.join('')}</ul>`,
  ].join('\n      ')
}

export function renderRobots(siteUrl) {
  return `User-agent: *\nAllow: /\nSitemap: ${siteUrl}sitemap.xml\n`
}

export function renderSitemap(siteUrl) {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `  <url><loc>${escapeHtml(siteUrl)}</loc></url>\n` +
    '</urlset>\n'
  )
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
      handler(html) {
        const { content, result } = load()
        if (!content) {
          // Dev with invalid content: keep the page loadable so the overlay can show the errors.
          const msg = escapeHtml(formatReport(result))
          return html
            .replace(HEAD_MARKER, `<title>Content error</title>`)
            .replace(NOSCRIPT_MARKER, `<pre>${msg}</pre>`)
        }
        return html.replace(HEAD_MARKER, renderHead(content)).replace(NOSCRIPT_MARKER, renderNoscript(content))
      },
    },

    generateBundle() {
      const content = state && state.content ? state.content : load().content
      if (!content) return
      const siteUrl = content.site.siteUrl
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: renderRobots(siteUrl) })
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: renderSitemap(siteUrl) })
      // Custom domain: GitHub Pages reads dist/CNAME. Derived from siteUrl unless public/CNAME exists
      // (Vite copies that one; the validator checks it agrees with siteUrl).
      const domain = customDomainOf(siteUrl)
      if (domain && !existsSync(join(ROOT, 'public', 'CNAME'))) {
        this.emitFile({ type: 'asset', fileName: 'CNAME', source: `${domain}\n` })
      }
    },
  }
}

export default contentPlugin
