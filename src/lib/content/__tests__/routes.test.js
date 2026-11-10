import { describe, expect, test } from 'vitest'
import { normalizeContent } from '../normalize.js'
import { resolveRouteWithBase, sectionHrefOf, allRoutes } from '../routes.js'
import { headFor } from '../head.js'

const raw = (siteUrl = 'https://example.github.io/') => ({
  site: {
    siteUrl, title: 'Jane Doe', description: 'Site description.', locale: 'en_US', ogImage: null, ogImageAlt: null, defaultTheme: 'system', themeToggle: true,
    pages: [
      { id: 'experience', label: 'Experience', blurb: 'b', description: 'Experience description.', sections: [{ id: 'experience', label: 'Experience' }] },
      { id: 'about', label: 'About', blurb: 'b', description: 'About description.', sections: [{ id: 'about', label: 'About' }, { id: 'contact', label: 'Contact' }, { id: 'skills', label: 'Skills' }] },
      { id: 'hidden', label: 'Hidden', blurb: 'b', description: 'Hidden description.', visible: false, sections: [{ id: 'education', label: 'Education' }] },
    ],
  },
  profile: { name: 'Jane Doe', headline: 'Engineer', summary: 's', about: ['a'], email: 'jane@example.com' },
  links: [{ id: 'gh', kind: 'github', label: 'GitHub', url: 'https://github.com/jane' }],
  experience: [{ id: 'e', organization: 'Acme', role: 'Intern', start: '2024-06', end: '2024-09' }],
  education: [{ id: 'u', institution: 'Uni', degree: 'B.S.', field: 'CS', start: null, end: '2026' }],
  projects: [],
  skills: [],
})

describe.each([
  ['/', 'https://example.github.io/'],
  ['/personal-website/', 'https://example.github.io/personal-website/'],
])('resolveRoute with base %s', (base, siteUrl) => {
  const c = normalizeContent(raw(siteUrl), { baseUrl: base })
  const r = (p) => resolveRouteWithBase(p, base, c)
  const page = (id) => c.pages.find((p) => p.id === id)

  test('home: base, base + index.html, base without trailing slash', () => {
    for (const p of [base, `${base}index.html`, base.replace(/\/$/, '') || '/']) {
      expect(r(p)).toEqual({ kind: 'home', page: null, canonicalPath: base })
    }
  })
  test('page: with and without slash, with index.html', () => {
    for (const p of [`${base}experience/`, `${base}experience`, `${base}experience/index.html`]) {
      expect(r(p)).toEqual({ kind: 'page', page: page('experience'), canonicalPath: `${base}experience/` })
    }
  })
  test('not-found: unknown, deeper, hidden page, case mismatch, outside base, odd forms', () => {
    const nf = { kind: 'not-found', page: null, canonicalPath: null }
    for (const p of [`${base}nope/`, `${base}experience/foo/`, `${base}hidden/`, `${base}Experience/`, `${base}experience//`, `${base}404.html`, `${base}skills/`, '/elsewhere/experience/'.replace(/^\/elsewhere/, base === '/' ? '/elsewhere' : '')]) {
      expect(r(p), p).toEqual(nf)
    }
    if (base !== '/') expect(r('/experience/')).toEqual(nf)
  })
  test('section hrefs', () => {
    expect(sectionHrefOf('contact', c)).toBe(`${base}about/#contact`)
    expect(sectionHrefOf('experience', c)).toBe(`${base}experience/#experience`)
    expect(sectionHrefOf('education', c)).toBeNull() // only on a hidden page
    expect(sectionHrefOf('skills', c)).toBeNull() // no content
    expect(sectionHrefOf('projects', c)).toBeNull() // on no page
  })
  test('allRoutes: home plus shown pages', () => {
    expect(allRoutes(base, c).map((x) => x.canonicalPath)).toEqual([base, `${base}experience/`, `${base}about/`])
  })
  test('head per route kind', () => {
    expect(headFor(r(base), c)).toEqual({
      title: 'Jane Doe | Engineer', description: 'Site description.', canonical: siteUrl, robots: 'index',
      jsonLd: {
        '@context': 'https://schema.org', '@type': 'Person', name: 'Jane Doe', url: siteUrl, jobTitle: 'Engineer', email: 'mailto:jane@example.com',
        sameAs: ['https://github.com/jane'], alumniOf: [{ '@type': 'CollegeOrUniversity', name: 'Uni' }],
      },
    })
    expect(headFor(r(`${base}about`), c)).toEqual({ title: 'About | Jane Doe', description: 'About description.', canonical: `${siteUrl}about/`, robots: 'index', jsonLd: null })
    expect(headFor(r(`${base}zzz/`), c)).toEqual({ title: 'Page not found | Jane Doe', description: 'Site description.', canonical: null, robots: 'noindex', jsonLd: null })
  })
})

test('home title falls back to site.title when the headline is a placeholder', () => {
  const x = raw()
  x.profile.headline = 'TODO: role'
  const c = normalizeContent(x)
  const h = headFor({ kind: 'home', page: null, canonicalPath: '/' }, c)
  expect(h.title).toBe('Jane Doe')
  expect(h.jsonLd.jobTitle).toBeUndefined()
})
