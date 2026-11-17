// The public API, loaded through Vite exactly as the frontend uses it (real data files).
import { describe, expect, test } from 'vitest'
import * as api from '../index.js'

describe('public API (7.2)', () => {
  test('exports exactly the specified functions', () => {
    expect(Object.keys(api).sort()).toEqual(
      ['DEX_POKEMON', 'GUIDE_IDS', 'formatDateRange', 'formatDexNumber', 'formatMonth', 'getDex', 'getEducation', 'getExperience', 'getHead', 'getHomeHref', 'getLinks', 'getPage', 'getPages', 'getProfile', 'getProjects', 'getSectionHref', 'getSections', 'getSite', 'getSiteContent', 'getSkills', 'isPlaceholder', 'resolveRoute'].sort(),
    )
    for (const [name, v] of Object.entries(api)) expect(typeof v).toBe(name === 'GUIDE_IDS' || name === 'DEX_POKEMON' ? 'object' : 'function')
  })

  test('getSiteContent bundles every getter result', () => {
    const c = api.getSiteContent()
    expect(c).toEqual({
      site: api.getSite(), profile: api.getProfile(), links: api.getLinks(), experience: api.getExperience(),
      education: api.getEducation(), projects: api.getProjects(), skills: api.getSkills(), pages: api.getPages(), sections: api.getSections(), dex: api.getDex(),
    })
    expect(Object.isFrozen(c)).toBe(true)
  })

  test('real data has the 7.3 shapes', () => {
    const site = api.getSite()
    expect(Object.keys(site).sort()).toEqual(['defaultTheme', 'description', 'fanArt', 'locale', 'ogImage', 'ogImageAlt', 'pokedex', 'siteUrl', 'themeToggle', 'title'])
    const profile = api.getProfile()
    expect(Object.keys(profile).sort()).toEqual(['about', 'availability', 'contactBlurb', 'currently', 'email', 'headline', 'location', 'name', 'photo', 'resumeUrl', 'summary'].sort())
    for (const l of api.getLinks()) expect(Object.keys(l).sort()).toEqual(['id', 'isExternal', 'kind', 'label', 'showInHero', 'url'])
    for (const e of api.getExperience()) expect(Object.keys(e).sort()).toEqual(['dateLabel', 'employmentType', 'end', 'highlights', 'id', 'location', 'organization', 'organizationUrl', 'pokemon', 'role', 'start', 'summary', 'technologies'])
    for (const e of api.getEducation()) expect(Object.keys(e).sort()).toEqual(['coursework', 'dateLabel', 'degree', 'degreeLabel', 'end', 'expected', 'field', 'gpa', 'honors', 'id', 'institution', 'institutionUrl', 'location', 'minor', 'start'])
    for (const p of api.getProjects()) expect(Object.keys(p).sort()).toEqual(['context', 'contextLabel', 'dateLabel', 'end', 'featured', 'githubStats', 'highlights', 'id', 'image', 'links', 'order', 'pokemon', 'primaryUrl', 'role', 'start', 'status', 'statusLabel', 'summary', 'teamSize', 'technologies', 'title'])
    for (const g of api.getSkills()) expect(Object.keys(g).sort()).toEqual(['id', 'items', 'name'])
    for (const s of api.getSections()) {
      expect(Object.keys(s).sort()).toEqual(['href', 'id', 'index', 'label', 'lead', 'pageId'])
      expect(s.index).toMatch(/^\d{2}$/)
    }
    for (const p of api.getPages()) {
      expect(Object.keys(p).sort()).toEqual(['aliases', 'blurb', 'description', 'guide', 'hasLead', 'href', 'id', 'index', 'label', 'path', 'sections', 'teaser'])
    }
  })

  test('v3 fanArt and guides on real data (REQ-1050)', () => {
    expect(api.getSite().fanArt).toBe(true)
    expect(api.getPages().map((p) => p.guide)).toEqual(['charmander', 'bulbasaur', 'squirtle'])
    expect(api.GUIDE_IDS).toEqual(['charmander', 'bulbasaur', 'squirtle'])
  })

  test('guide names never appear in head output (REQ-1052)', () => {
    for (const route of [{ kind: 'home', page: null, canonicalPath: '/' }, ...api.getPages().map((page) => ({ kind: 'page', page, canonicalPath: page.href })), { kind: 'not-found', page: null, canonicalPath: null }]) {
      expect(JSON.stringify(api.getHead(route)).toLowerCase()).not.toMatch(/charmander|bulbasaur|squirtle/)
    }
  })

  test('v2 pages, teasers, routes and head on real data (10.2, 10.5)', () => {
    expect(api.getPages().map((p) => [p.id, p.index, p.href, p.teaser])).toEqual([
      ['experience', '01', '/experience/', 'Software Development Engineer Intern, Amazon'],
      ['education', '02', '/education/', 'B.S. Electrical Engineering, Stanford University · Expected Jun 2028'],
      ['about', '03', '/about/', null],
    ])
    expect(api.getPage('experience').sections.map((s) => s.id)).toEqual(['experience'])
    expect(api.getPage('education').sections.map((s) => s.id)).toEqual(['education', 'skills'])
    expect(api.getPage('about').sections.map((s) => s.id)).toEqual(['about', 'contact'])
    expect(api.getPage('projects')).toBeNull()
    expect(api.getPage('nope')).toBeNull()
    expect(api.getHomeHref()).toBe('/')
    expect(api.getSectionHref('contact')).toBe('/about/#contact')
    for (const p of ['/projects', '/projects/', '/projects/index.html']) {
      expect(api.resolveRoute(p)).toEqual({ kind: 'page', page: api.getPage('experience'), canonicalPath: '/experience/', hash: '#pokedex-projects' })
    }
    expect(api.resolveRoute('/education').hash).toBeNull()
    const head = api.getHead(api.resolveRoute('/experience/'))
    expect(head).toMatchObject({ title: 'Experience | Andrew Leick', canonical: 'https://andrew-leick.github.io/experience/', robots: 'index', jsonLd: null })
    expect(Object.isFrozen(head)).toBe(true)
    expect(api.getHead(api.resolveRoute('/')).jsonLd['@type']).toBe('Person')
  })

  test('v5 Pokédex on real data (V5-01, V5-02, V5-14)', () => {
    expect(api.getSite().pokedex).toBe(true)
    const dex = api.getDex()
    expect(dex.work.map((e) => e.id)).toEqual(api.getExperience().map((e) => e.id))
    expect(dex.projects.map((e) => e.id)).toEqual(api.getProjects().map((p) => p.id))
    for (const list of [dex.work, dex.projects]) expect(list.map((e) => e.number)).toEqual(list.map((_, i) => i + 1))
    expect([...dex.work, ...dex.projects].every((e) => api.DEX_POKEMON.includes(e.pokemon))).toBe(true)
    expect(api.formatDexNumber(7)).toBe('#007')
    expect(api.getSectionHref('projects')).toBeNull()
    for (const p of api.getPages()) {
      expect(p.blurb.length).toBeLessThanOrEqual(100)
      expect(p.description.length).toBeGreaterThanOrEqual(50)
      expect(p.description.length).toBeLessThanOrEqual(160)
    }
  })

  test('Andrew decided: no locations rendered', () => {
    expect(api.getProfile().location).toBeNull()
    for (const e of [...api.getExperience(), ...api.getEducation()]) expect(e.location).toBeNull()
  })
})
