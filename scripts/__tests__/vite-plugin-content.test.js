import { describe, expect, test } from 'vitest'
import { escapeHtml, renderHead, renderNoscript, renderRobots, renderSitemap, customDomainOf } from '../vite-plugin-content.js'
import { normalizeContent } from '../../src/lib/content/normalize.js'

const raw = (over = {}) => ({
  site: { siteUrl: 'https://example.github.io/', title: 'Jane Doe', description: 'Desc "quoted" & <b>', locale: 'en_US', ogImage: 'og-image.png', ogImageAlt: 'Alt', defaultTheme: 'system', themeToggle: true, sections: [] },
  profile: { name: 'Jane <Doe>', headline: 'Engineer', summary: 's', about: ['a'], email: 'jane@example.com', resumeUrl: 'content/resume/r.pdf' },
  links: [
    { id: 'gh', kind: 'github', label: 'GitHub', url: 'https://github.com/jane' },
    { id: 'li', kind: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/TODO-x' },
    { id: 'em', kind: 'email', label: 'Email', url: 'mailto:jane@example.com' },
  ],
  experience: [],
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
  test('noscript has name, resume and non-placeholder links', () => {
    const html = renderNoscript(normalizeContent(raw()))
    expect(html).toContain('Jane &lt;Doe&gt;')
    expect(html).toContain('href="/content/resume/r.pdf"')
    expect(html).toContain('https://github.com/jane')
    expect(html).not.toContain('TODO')
  })
})

describe('static files', () => {
  test('robots and sitemap', () => {
    expect(renderRobots('https://x.com/')).toBe('User-agent: *\nAllow: /\nSitemap: https://x.com/sitemap.xml\n')
    expect(renderSitemap('https://x.com/')).toContain('<loc>https://x.com/</loc>')
  })
  test('CNAME only for custom domains', () => {
    expect(customDomainOf('https://andrew-leick.github.io/')).toBeNull()
    expect(customDomainOf('https://www.example.com/')).toBe('www.example.com')
  })
  test('escapeHtml', () => expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;'))
})
