import { describe, expect, test } from 'vitest'
import {
  normalizeContent,
  normalizeSite,
  GUIDE_IDS,
  normalizeExperience,
  normalizeEducation,
  normalizeProjects,
  composeContextLabel,
  composeDegreeLabel,
} from '../normalize.js'
import { isPlaceholder } from '../placeholders.js'

const exp = (id, start, end, extra = {}) => ({ id, organization: 'Org', role: 'Role', start, end, ...extra })
const proj = (id, extra = {}) => ({ id, title: id, summary: 's', status: 'complete', ...extra })

describe('experience sorting (7.4)', () => {
  test('current roles first by start desc, then end desc, then start desc, TODO last', () => {
    const out = normalizeExperience([
      exp('old', '2019-01', '2020-01'),
      exp('todo', 'TODO', 'TODO'),
      exp('current-older', '2021-01', null),
      exp('recent-end-a', '2022-01', '2024-05'),
      exp('current-newer', '2024-01', null),
      exp('recent-end-b', '2023-01', '2024-05'),
    ])
    expect(out.map((e) => e.id)).toEqual(['current-newer', 'current-older', 'recent-end-b', 'recent-end-a', 'old', 'todo'])
  })
  test('hidden entries removed; display fields derived', () => {
    const out = normalizeExperience([exp('a', '2025-06', null, { employmentType: 'internship' }), exp('b', '2020', '2021', { visible: false })])
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ employmentType: 'Internship', dateLabel: 'Jun 2025 – Present', summary: null, location: null, highlights: [], technologies: [] })
  })
})

describe('education', () => {
  test('sorted by end desc, TODO last', () => {
    const base = { institution: 'U', degree: 'B.S.', field: 'CS' }
    const out = normalizeEducation([
      { ...base, id: 'a', start: '2015', end: '2019' },
      { ...base, id: 'todo', start: 'TODO', end: 'TODO' },
      { ...base, id: 'b', start: '2020', end: '2024' },
    ])
    expect(out.map((e) => e.id)).toEqual(['b', 'a', 'todo'])
  })
  test('degreeLabel and expected dateLabel', () => {
    expect(composeDegreeLabel('B.S.', 'Computer Science', null)).toBe('B.S. Computer Science')
    expect(composeDegreeLabel('B.S.', 'Computer Science', 'Math')).toBe('B.S. Computer Science, Minor in Math')
    const [e] = normalizeEducation([{ id: 's', institution: 'U', degree: 'B.S.', field: 'EE', start: '2023-09', end: '2027-06', expected: true }])
    expect(e.dateLabel).toBe('Sep 2023 – Expected Jun 2027')
    const [n] = normalizeEducation([{ id: 's', institution: 'U', degree: 'B.S.', field: 'EE', start: null, end: '2028-06', expected: true }])
    expect(n.start).toBeNull()
    expect(n.dateLabel).toBe('Expected Jun 2028')
  })
})

describe('projects', () => {
  test('featured first, then order asc, then end desc (null newest), then title asc', () => {
    const out = normalizeProjects([
      proj('plain-old', { end: '2020-01' }),
      proj('feat-2', { featured: true, order: 2 }),
      proj('plain-new', { end: '2024-01' }),
      proj('feat-1', { featured: true, order: 1 }),
      proj('plain-ongoing', { end: null }),
      proj('b-title', { order: 5, end: '2022' }),
      proj('a-title', { order: 5, end: '2022' }),
      proj('plain-todo', { end: 'TODO' }),
    ])
    expect(out.map((p) => p.id)).toEqual(['feat-1', 'feat-2', 'a-title', 'b-title', 'plain-ongoing', 'plain-new', 'plain-old', 'plain-todo'])
  })
  test('primaryUrl prefers demo, then repo, then writeup; links normalized', () => {
    const [a] = normalizeProjects([proj('a', { links: { repo: 'https://r', demo: 'https://d' } })])
    expect(a.primaryUrl).toBe('https://d')
    expect(a.links).toEqual({ repo: 'https://r', demo: 'https://d', writeup: null })
    const [b] = normalizeProjects([proj('b', { links: { writeup: 'https://w' } })])
    expect(b.primaryUrl).toBe('https://w')
    const [c] = normalizeProjects([proj('c')])
    expect(c.primaryUrl).toBeNull()
  })
  test('statusLabel and defaults', () => {
    const out = normalizeProjects([proj('a'), proj('b', { status: 'in-progress' }), proj('c', { status: 'archived' })])
    expect(out.map((p) => p.statusLabel)).toEqual([null, 'In progress', 'Archived'])
    expect(out[0]).toMatchObject({ featured: false, order: 100, githubStats: null, image: null, dateLabel: null })
  })
  test('githubStats merged from generated file', () => {
    const gh = { repos: { 'o/n': { url: 'https://github.com/o/n', description: '', language: 'Python', stars: 7, updatedAt: '2026-01-01T00:00:00Z', homepage: null } } }
    const [p] = normalizeProjects([proj('a', { githubRepo: 'o/n' })], gh, '/')
    expect(p.githubStats).toEqual({ stars: 7, language: 'Python', updatedAt: '2026-01-01T00:00:00Z' })
    const [q] = normalizeProjects([proj('a', { githubRepo: 'o/missing' })], gh, '/')
    expect(q.githubStats).toBeNull()
  })
  test('image src resolved against base', () => {
    const [p] = normalizeProjects([proj('a', { image: { src: 'content/images/a.webp', alt: 'A' } })], null, '/repo/')
    expect(p.image).toEqual({ src: '/repo/content/images/a.webp', alt: 'A' })
  })
})

describe('contextLabel (7.4)', () => {
  test.each([
    [{ context: 'Team project', teamSize: 3, status: 'in-progress', end: null }, 'Team project · 3 contributors · Ongoing'],
    [{ context: null, teamSize: 3, status: 'complete', end: '2026-05' }, 'Team project · 3 contributors · 2026'],
    [{ context: null, teamSize: 1, status: 'complete', end: '2025' }, 'Solo project · 2025'],
    [{ context: 'Hackathon', teamSize: 1, status: 'complete', end: null }, 'Hackathon · Solo project'],
    [{ context: 'Course project, CS 131', teamSize: null, status: 'archived', end: '2024-03' }, 'Course project, CS 131 · 2024'],
    [{ context: null, teamSize: null, status: 'complete', end: null }, null],
    [{ context: null, teamSize: null, status: 'complete', end: 'TODO' }, null],
  ])('%o -> %s', (input, out) => expect(composeContextLabel(input)).toBe(out))
})

const fullRaw = () => ({
  site: {
    siteUrl: 'https://example.github.io/', title: 'T', description: 'd', locale: 'en_US', ogImage: 'og.png', ogImageAlt: 'alt',
    defaultTheme: 'system', themeToggle: true,
    pages: [
      { id: 'contact', label: 'Say hi', blurb: 'b1', description: 'd1', sections: [{ id: 'contact', label: 'Contact' }] },
      { id: 'experience', label: 'Experience', blurb: 'b2', description: 'd2', sections: [{ id: 'experience', label: 'Experience' }] },
      { id: 'about', label: 'About', blurb: 'b3', description: 'd3', sections: [
        { id: 'about', label: 'About' },
        { id: 'projects', label: 'Projects', visible: false },
        { id: 'education', label: 'Education' },
        { id: 'skills', label: 'Skills' },
      ] },
    ],
  },
  profile: { name: 'N', headline: 'H', summary: 'S', about: ['p'], email: 'a@b.co', resumeUrl: 'content/resume/r.pdf', photo: { src: 'content/images/me.webp', alt: 'Me' } },
  links: [
    { id: 'gh', kind: 'github', label: 'GitHub', url: 'https://github.com/x' },
    { id: 'self', kind: 'website', label: 'Site', url: 'https://example.github.io/blog', showInHero: false },
    { id: 'mail', kind: 'email', label: 'Email', url: 'mailto:a@b.co' },
    { id: 'hidden', kind: 'other', label: 'Hidden', url: 'https://h.example', visible: false },
  ],
  experience: [],
  education: [{ id: 'u', institution: 'U', degree: 'B.S.', field: 'EE', start: null, end: '2028-06', expected: true }],
  projects: [proj('p')],
  skills: [{ id: 'l', name: 'Languages', items: ['Java'] }],
})

describe('normalizeContent: pages and sections (v2 10.3)', () => {
  test('empty page dropped, hidden/empty sections dropped, indices after filtering', () => {
    const c = normalizeContent(fullRaw())
    expect(c.pages.map((p) => [p.id, p.index, p.path, p.href, p.hasLead])).toEqual([
      ['contact', '01', 'contact/', '/contact/', true],
      ['about', '02', 'about/', '/about/', true],
    ])
    expect(c.sections).toEqual([
      { id: 'contact', label: 'Contact', index: '01', pageId: 'contact', href: '/contact/#contact', lead: true },
      { id: 'about', label: 'About', index: '02', pageId: 'about', href: '/about/#about', lead: true },
      { id: 'education', label: 'Education', index: '03', pageId: 'about', href: '/about/#education', lead: false },
      { id: 'skills', label: 'Skills', index: '04', pageId: 'about', href: '/about/#skills', lead: false },
    ])
    expect(c.pages[1].sections).toEqual(c.sections.slice(1))
    expect(c.pages[1]).toMatchObject({ label: 'About', blurb: 'b3', description: 'd3' })
  })
  test('hidden page and its sections are absent; base applied to hrefs', () => {
    const raw = fullRaw()
    raw.site.pages[0].visible = false
    const c = normalizeContent(raw, { baseUrl: '/repo/' })
    expect(c.pages.map((p) => [p.id, p.index, p.href])).toEqual([['about', '01', '/repo/about/']])
    expect(c.sections.map((s) => s.href)).toEqual(['/repo/about/#about', '/repo/about/#education', '/repo/about/#skills'])
  })
  test('page without a lead section', () => {
    const raw = fullRaw()
    raw.site.pages[2].id = 'more'
    const page = normalizeContent(raw).pages.find((p) => p.id === 'more')
    expect(page.hasLead).toBe(false)
    expect(page.sections.every((s) => !s.lead)).toBe(true)
  })
  test('about dropped with no paragraphs; contact dropped only with no email and no links', () => {
    const raw = fullRaw()
    raw.profile.about = []
    raw.profile.email = ''
    raw.links = []
    raw.skills = []
    const c = normalizeContent(raw)
    expect(c.sections.map((s) => s.id)).toEqual(['education'])
    expect(c.pages.map((p) => p.id)).toEqual(['about'])
  })
  test('no pages key: no pages, no sections', () => {
    const raw = fullRaw()
    delete raw.site.pages
    expect(normalizeContent(raw)).toMatchObject({ pages: [], sections: [] })
  })
})

describe('teasers (v2 10.5)', () => {
  const page = (sections, extra = {}) => ({ id: 'x', label: 'X', blurb: 'b', description: 'd', sections: sections.map((id) => ({ id, label: id })), ...extra })
  const teaser = (sections, mutate, extra) => {
    const raw = fullRaw()
    raw.experience = [exp('a', '2024-06', '2024-09', { role: 'Intern', organization: 'Acme' }), exp('b', '2020-01', '2020-02', { role: 'Old', organization: 'Org' })]
    raw.projects = [proj('p1', { title: 'One' }), proj('p2', { title: 'Two' }), proj('p3', { title: 'Three' })]
    raw.skills = [{ id: 'l', name: 'L', items: ['A', 'B', 'C', 'D', 'E'] }]
    if (mutate) mutate(raw)
    raw.site.pages = [page(sections, extra)]
    return normalizeContent(raw).pages[0].teaser
  }
  test('experience: newest role, organization', () => expect(teaser(['experience'])).toBe('Intern, Acme'))
  test('projects: up to 2 featured with prefix, else first 2 without', () => {
    expect(teaser(['projects'])).toBe('One · Three') // getProjects order: title asc
    expect(teaser(['projects'], (r) => { r.projects[2].featured = true })).toBe('Featured: Three')
    expect(teaser(['projects'], (r) => { r.projects.forEach((p) => { p.featured = true }) })).toBe('Featured: One · Three')
  })
  test('education: degree label, institution, date label', () => {
    expect(teaser(['education'])).toBe('B.S. EE, U · Expected Jun 2028')
  })
  test('skills: first 4 items of first group', () => expect(teaser(['skills'])).toBe('A, B, C, D'))
  test('about and contact: null; first non-null section wins', () => {
    expect(teaser(['about', 'contact'])).toBeNull()
    expect(teaser(['about', 'skills', 'education'])).toBe('A, B, C, D')
  })
  test('placeholders are skipped and the next section is tried', () => {
    expect(teaser(['experience', 'skills'], (r) => { r.experience[0].role = 'TODO: role' })).toBe('A, B, C, D')
    expect(teaser(['experience'], (r) => { r.experience[0].role = 'TODO: role' })).toBeNull()
    expect(teaser(['projects', 'skills'], (r) => { r.projects[1].title = 'TODO: name' })).toBe('A, B, C, D')
    expect(teaser(['education'], (r) => { r.education[0].end = 'TODO' })).toBeNull()
    expect(teaser(['skills'], (r) => { r.skills[0].items[3] = 'TODO: more' })).toBeNull()
  })
  test('override wins; empty override derives', () => {
    expect(teaser(['experience'], null, { teaser: 'Custom line' })).toBe('Custom line')
    expect(teaser(['experience'], null, { teaser: null })).toBe('Intern, Acme')
  })
})

describe('normalizeContent', () => {
  test('local paths resolved with base, links flagged external, hidden removed, frozen', () => {
    const c = normalizeContent(fullRaw(), { baseUrl: '/repo/' })
    expect(c.profile.resumeUrl).toBe('/repo/content/resume/r.pdf')
    expect(c.profile.photo).toEqual({ src: '/repo/content/images/me.webp', alt: 'Me' })
    expect(c.site.ogImage).toBe('/repo/og.png')
    expect(c.links.map((l) => [l.id, l.isExternal, l.showInHero])).toEqual([['gh', true, true], ['self', false, false], ['mail', false, true]])
    expect(Object.isFrozen(c.links[0])).toBe(true)
    expect(Object.isFrozen(c.projects[0].links)).toBe(true)
    expect('sections' in c.site).toBe(false)
  })
  test('no undefined values anywhere', () => {
    const c = normalizeContent(fullRaw())
    const walk = (v, path) => {
      expect(v, path).not.toBeUndefined()
      if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`)
    }
    walk(c, 'content')
  })
})

describe('isPlaceholder', () => {
  test.each([
    ['TODO: x', true],
    ['TODO', true],
    ['https://www.linkedin.com/in/TODO-from-andrew', true],
    ['mailto:TODO@x.com', true],
    ['Real text with TODO inside', false],
    ['https://github.com/x', false],
    [null, false],
    [3, false],
  ])('%s -> %s', (v, out) => expect(isPlaceholder(v)).toBe(out))
})

describe('v3 fanArt and guide (8.3)', () => {
  test('fanArt defaults to true; false is kept', () => {
    expect(normalizeSite({}).fanArt).toBe(true)
    expect(normalizeSite({ fanArt: true }).fanArt).toBe(true)
    expect(normalizeSite({ fanArt: false }).fanArt).toBe(false)
  })
  test('guide defaults to null and unknown values are dropped', () => {
    const raw = fullRaw()
    raw.site.pages[0].guide = 'squirtle'
    raw.site.pages[2].guide = 'pikachu'
    const { pages } = normalizeContent(raw)
    expect(pages.map((p) => [p.id, p.guide])).toEqual([['contact', 'squirtle'], ['about', null]])
  })
  test('GUIDE_IDS', () => expect(GUIDE_IDS).toEqual(['charmander', 'bulbasaur', 'squirtle']))
})

describe('v4 layout', () => {
  test('layout defaults to journey; pages is kept; unknown falls back to journey', () => {
    expect(normalizeSite({}).layout).toBe('journey')
    expect(normalizeSite({ layout: 'pages' }).layout).toBe('pages')
    expect(normalizeSite({ layout: 'carousel' }).layout).toBe('journey')
  })
})
