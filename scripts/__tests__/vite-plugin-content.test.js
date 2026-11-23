import { describe, expect, test } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach } from 'vitest'
import { contentPlugin, kartData, escapeHtml, renderHead, renderNoscript, renderRobots, renderSitemap, customDomainOf, swapHead, requestPath, HEAD_START, HEAD_END } from '../vite-plugin-content.js'
import { normalizeContent } from '../../src/lib/content/normalize.js'
import { NOT_FOUND_ROUTE, resolveRouteWithBase } from '../../src/lib/content/routes.js'
import { checkRoutes } from '../lib/routes-check.mjs'

const raw = (over = {}) => ({
  site: { siteUrl: 'https://example.github.io/', title: 'Jane Doe', description: 'Desc "quoted" & <b>', locale: 'en_US', ogImage: 'og-image.png', ogImageAlt: 'Alt', defaultTheme: 'system', themeToggle: true,
    pages: [
      { id: 'work', label: 'Work', blurb: 'b', description: 'Work "page" description.', sections: [{ id: 'experience', label: 'Experience' }] },
      { id: 'about', label: 'About', blurb: 'b', description: 'About description.', sections: [{ id: 'about', label: 'About' }, { id: 'contact', label: 'Contact' }] },
    ] },
  profile: { name: 'Jane <Doe>', headline: 'Engineer', summary: 's', about: ['a'], email: 'jane@example.com', resumeUrl: 'content/resume/r.pdf' },
  links: [
    { id: 'gh', kind: 'github', label: 'GitHub', url: 'https://github.com/jane' },
    { id: 'li', kind: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/TODO-x' },
    { id: 'em', kind: 'email', label: 'Email', url: 'mailto:jane@example.com' },
  ],
  experience: [{ id: 'e', organization: 'Acme', role: 'Intern', start: '2024-06', end: '2024-09' }],
  education: [{ id: 'u', institution: 'Uni', institutionUrl: 'https://uni.edu', degree: 'B.S.', field: 'CS', start: null, end: '2026' }],
  projects: [],
  skills: [],
  ...over,
})

describe('head injection', () => {
  test('escapes all injected text', () => {
    const head = renderHead(normalizeContent(raw()))
    expect(head).toContain('<title>Jane &lt;Doe&gt; | Engineer</title>')
    expect(head).toContain('content="Desc &quot;quoted&quot; &amp; &lt;b&gt;"')
    expect(head).not.toMatch(/<b>/)
  })
  test('title falls back to site.title when headline is a placeholder; JSON-LD omits placeholders', () => {
    const r = raw()
    r.profile.headline = 'TODO: role'
    const head = renderHead(normalizeContent(r))
    expect(head).toContain('<title>Jane Doe</title>')
    const json = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(head)[1])
    expect(json).toEqual({
      '@context': 'https://schema.org', '@type': 'Person', name: 'Jane <Doe>', url: 'https://example.github.io/',
      email: 'mailto:jane@example.com', sameAs: ['https://github.com/jane'],
      alumniOf: [{ '@type': 'CollegeOrUniversity', name: 'Uni', url: 'https://uni.edu' }],
    })
    expect(head).not.toContain('TODO')
  })
  test('OG/Twitter image absolute; omitted when ogImage is null', () => {
    expect(renderHead(normalizeContent(raw()))).toContain('<meta property="og:image" content="https://example.github.io/og-image.png" />')
    const r = raw()
    r.site.ogImage = null
    const head = renderHead(normalizeContent(r))
    expect(head).not.toContain('og:image')
    expect(head).not.toContain('twitter:image')
  })
  test('OG image under a project-site base path', () => {
    const r = raw()
    r.site.siteUrl = 'https://example.github.io/repo/'
    expect(renderHead(normalizeContent(r, { baseUrl: '/repo/' }))).toContain('content="https://example.github.io/repo/og-image.png"')
  })
  test('noscript has name, resume, non-placeholder links and page links with base (REQ-943)', () => {
    const html = renderNoscript(normalizeContent(raw()))
    expect(html).toContain('Jane &lt;Doe&gt;')
    expect(html).toContain('href="/content/resume/r.pdf"')
    expect(html).toContain('https://github.com/jane')
    expect(html).not.toContain('TODO')
    expect(html).toContain('<ul><li><a href="/work/">Work</a></li><li><a href="/about/">About</a></li></ul>')
    expect(renderNoscript(normalizeContent(raw(), { baseUrl: '/repo/' }))).toContain('href="/repo/work/"')
  })
  test('head block is wrapped in start/end comments', () => {
    const head = renderHead(normalizeContent(raw()))
    expect(head.startsWith(HEAD_START)).toBe(true)
    expect(head.endsWith(HEAD_END)).toBe(true)
  })
  test('page head: title, description, canonical, og:url; no JSON-LD, no robots (REQ-880)', () => {
    const c = normalizeContent(raw())
    const head = renderHead(c, resolveRouteWithBase('/work/', '/', c))
    expect(head).toContain('<title>Work | Jane &lt;Doe&gt;</title>')
    expect(head).toContain('<meta name="description" content="Work &quot;page&quot; description." />')
    expect(head).toContain('<link rel="canonical" href="https://example.github.io/work/" />')
    expect(head).toContain('<meta property="og:url" content="https://example.github.io/work/" />')
    expect(head).toContain('<meta property="og:title" content="Work | Jane &lt;Doe&gt;" />')
    expect(head).toContain('<meta name="twitter:title" content="Work | Jane &lt;Doe&gt;" />')
    expect(head).not.toContain('ld+json')
    expect(head).not.toContain('robots')
  })
  test('not-found head: noindex, no canonical, no og:url, no JSON-LD (REQ-876, REQ-942)', () => {
    const head = renderHead(normalizeContent(raw()), NOT_FOUND_ROUTE)
    expect(head).toContain('<title>Page not found | Jane &lt;Doe&gt;</title>')
    expect(head).toContain('<meta name="robots" content="noindex" />')
    expect(head).not.toContain('canonical')
    expect(head).not.toContain('og:url')
    expect(head).not.toContain('ld+json')
  })
  test('home head keeps JSON-LD; swapHead replaces only the block', () => {
    const c = normalizeContent(raw())
    const home = renderHead(c)
    expect(home).toContain('ld+json')
    const html = `<head><meta charset="UTF-8" />\n    ${home}\n<script src="/assets/a.js"></script></head><body>$&</body>`
    const swapped = swapHead(html, renderHead(c, NOT_FOUND_ROUTE))
    expect(swapped).toContain('Page not found')
    expect(swapped).not.toContain('ld+json')
    expect(swapped.replace(/<!-- content:head:start -->[\s\S]*<!-- content:head:end -->/, '')).toBe(html.replace(/<!-- content:head:start -->[\s\S]*<!-- content:head:end -->/, ''))
    expect(() => swapHead('<head></head>', home)).toThrow(/head block comments/)
  })
  test('dev request path strips query and hash', () => {
    expect(requestPath('/about/?v=1#x')).toBe('/about/')
    expect(requestPath(undefined)).toBe('/')
  })
})

describe('static files', () => {
  test('robots and sitemap', () => {
    expect(renderRobots('https://x.com/')).toBe('User-agent: *\nAllow: /\nSitemap: https://x.com/sitemap.xml\n')
    const c = normalizeContent(raw())
    expect(renderSitemap(c)).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        '  <url><loc>https://example.github.io/</loc></url>\n  <url><loc>https://example.github.io/work/</loc></url>\n' +
        '  <url><loc>https://example.github.io/about/</loc></url>\n</urlset>\n',
    )
  })
  test('CNAME only for custom domains', () => {
    expect(customDomainOf('https://andrew-leick.github.io/')).toBeNull()
    expect(customDomainOf('https://www.example.com/')).toBe('www.example.com')
  })
  test('escapeHtml', () => expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;'))
})

describe('check:routes (REQ-945)', () => {
  let dir
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }))

  /** Build a fake dist the way the plugin does. */
  const makeDist = (c, base = '/') => {
    dir = mkdtempSync(join(tmpdir(), 'routes-'))
    const shell = (head) => `<!doctype html><html><head>\n    ${head}\n    <script type="module" src="${base}assets/index.js"></script></head><body><noscript>x</noscript></body></html>`
    const index = shell(renderHead(c))
    writeFileSync(join(dir, 'index.html'), index)
    for (const p of c.pages) {
      for (const id of [p.id, ...p.aliases.map((a) => a.id)]) {
        mkdirSync(join(dir, id))
        writeFileSync(join(dir, id, 'index.html'), swapHead(index, renderHead(c, { kind: 'page', page: p, canonicalPath: null })))
      }
    }
    writeFileSync(join(dir, '404.html'), swapHead(index, renderHead(c, NOT_FOUND_ROUTE)))
    writeFileSync(join(dir, 'sitemap.xml'), renderSitemap(c))
    return dir
  }

  test('a correct dist passes', () => {
    const c = normalizeContent(raw())
    expect(checkRoutes(makeDist(c), c, '/').problems).toEqual([])
  })
  test('project-site base passes', () => {
    const r = raw()
    r.site.siteUrl = 'https://example.github.io/repo/'
    const c = normalizeContent(r, { baseUrl: '/repo/' })
    expect(checkRoutes(makeDist(c, '/repo/'), c, '/repo/').problems).toEqual([])
  })
  test('each kind of mismatch is reported', () => {
    const c = normalizeContent(raw())
    const d = makeDist(c)
    rmSync(join(d, 'about'), { recursive: true })
    writeFileSync(join(d, '404.html'), readFileSync(join(d, '404.html'), 'utf8').replace('<meta name="robots" content="noindex" />', ''))
    writeFileSync(join(d, 'work', 'index.html'), readFileSync(join(d, 'work', 'index.html'), 'utf8').replace('<body>', '<body><!-- content:noscript -->'))
    mkdirSync(join(d, 'old'))
    writeFileSync(join(d, 'old', 'index.html'), 'x')
    writeFileSync(join(d, 'sitemap.xml'), '<loc>https://example.github.io/</loc>')
    const { problems } = checkRoutes(d, c, '/')
    expect(problems).toEqual([
      'work/index.html: differs from index.html outside the head block',
      'about/index.html: missing (page "about" is shown)',
      '404.html: robots noindex missing, expected noindex',
      'old/index.html: emitted, but "old" is not a shown page',
      'work/index.html: unexpanded marker <!-- content:noscript -->',
      'sitemap.xml: lists ["https://example.github.io/"], expected ["https://example.github.io/","https://example.github.io/about/","https://example.github.io/work/"]',
    ])
  })
  test('aliases (V5-08): copies of the target page pass; missing, wrong head or listed in the sitemap fail', () => {
    const r = raw()
    r.site.pages[0].aliases = [{ id: 'projects', hash: 'pokedex-projects' }]
    const c = normalizeContent(r)
    const d = makeDist(c)
    expect(readFileSync(join(d, 'projects', 'index.html'), 'utf8')).toContain('<link rel="canonical" href="https://example.github.io/work/" />')
    expect(checkRoutes(d, c, '/').problems).toEqual([])
    expect(renderSitemap(c)).not.toContain('/projects/')
    writeFileSync(join(d, 'projects', 'index.html'), readFileSync(join(d, 'about', 'index.html'), 'utf8'))
    writeFileSync(join(d, 'sitemap.xml'), `${renderSitemap(c)}<loc>https://example.github.io/projects/</loc>`)
    expect(checkRoutes(d, c, '/').problems).toEqual([
      'projects/index.html: <title> is "About | Jane &lt;Doe&gt;", expected "Work | Jane &lt;Doe&gt;"',
      'projects/index.html: canonical is "https://example.github.io/about/", expected "https://example.github.io/work/"',
      'sitemap.xml: lists ["https://example.github.io/","https://example.github.io/about/","https://example.github.io/projects/","https://example.github.io/work/"], expected ["https://example.github.io/","https://example.github.io/about/","https://example.github.io/work/"]',
      'sitemap.xml: lists alias "https://example.github.io/projects/" (aliases redirect, so they stay out of the sitemap)',
    ])
    rmSync(join(d, 'projects'), { recursive: true })
    expect(checkRoutes(d, c, '/').problems).toContain('projects/index.html: missing (alias of page "work")')
  })
  test('writeBundle writes each alias with its target page head (real data)', () => {
    dir = mkdtempSync(join(tmpdir(), 'bundle-'))
    const plugin = contentPlugin()
    plugin.configResolved({ base: '/', command: 'build', root: dir, build: { outDir: 'dist' } })
    writeFileSync(join(dir, 'index.html'), `<html><head>${HEAD_START}x${HEAD_END}</head><body></body></html>`)
    plugin.writeBundle({ dir })
    expect(readFileSync(join(dir, 'projects', 'index.html'), 'utf8')).toBe(readFileSync(join(dir, 'experience', 'index.html'), 'utf8'))
  })
  test('wrong title and asset base are reported', () => {
    const c = normalizeContent(raw())
    const d = makeDist(c)
    writeFileSync(join(d, 'index.html'), readFileSync(join(d, 'index.html'), 'utf8').replace('<title>Jane &lt;Doe&gt; | Engineer</title>', '<title>x</title>').replace('src="/assets', 'src="./assets'))
    const { problems } = checkRoutes(d, c, '/')
    expect(problems.filter((p) => p.startsWith('index.html'))).toEqual([
      'index.html: <title> is "x", expected "Jane &lt;Doe&gt; | Engineer"',
      'index.html: asset URL "./assets/index.js" does not start with the base "/"',
    ])
  })
})

describe('kart page data (v5, virtual:kart-data)', () => {
  test('real data: head, links, and all 8 stops linked under the base', async () => {
    const { loadAndValidate } = await import('../lib/content-files.mjs')
    const { headFor } = await import('../../src/lib/content/head.js')
    const c = normalizeContent(loadAndValidate().raw, { baseUrl: '/repo/' })
    const d = kartData(c, '/repo/')
    expect(d).toMatchObject({ homeHref: '/repo/', kartHref: '/repo/kart/', name: 'Andrew Leick' })
    expect(d.stops).toHaveLength(8)
    for (const s of d.stops) expect(s.href).toMatch(/^\/repo\/[a-z]+\/#[a-z]+$/)
    expect(JSON.parse(JSON.stringify(d))).toEqual(d) // must serialize into the module
    expect(headFor({ kind: 'kart', page: null, canonicalPath: null }, c)).toMatchObject({ title: 'Grand Prix | Andrew Leick', robots: 'index', jsonLd: null })
  })
})
