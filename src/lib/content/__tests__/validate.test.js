import { describe, expect, test } from 'vitest'
import { validateContent, formatIssue, jsonParseIssue, suggestKey, editDistance } from '../validate.js'

// A fully valid fixture with no placeholders. Each test breaks one thing.
const valid = () => ({
  site: {
    siteUrl: 'https://example.github.io/', title: 'Jane Doe', description: 'Jane Doe is a software engineer who builds reliable systems and tools.',
    locale: 'en_US', ogImage: 'og-image.png', ogImageAlt: 'Jane Doe, portfolio', defaultTheme: 'system', themeToggle: true,
    sections: [{ id: 'about', label: 'About', visible: true }, { id: 'projects', label: 'Projects', visible: true }],
  },
  profile: {
    name: 'Jane Doe', headline: 'Software Engineer', summary: 'I build things.', about: ['Paragraph.'], currently: null,
    email: 'jane@example.com', contactBlurb: null, resumeUrl: 'content/resume/jane.pdf', photo: { src: 'content/images/me.webp', alt: 'Jane' },
  },
  links: [
    { id: 'github', kind: 'github', label: 'GitHub', url: 'https://github.com/jane' },
    { id: 'email', kind: 'email', label: 'Email', url: 'mailto:jane@example.com' },
  ],
  experience: [{ id: 'acme', organization: 'Acme', role: 'Intern', employmentType: 'internship', start: '2024-06', end: '2024-09', highlights: ['Did a thing.'], technologies: ['Go'] }],
  education: [{ id: 'uni', institution: 'Uni', degree: 'B.S.', field: 'CS', start: '2022-09', end: '2026-06', expected: true }],
  projects: [
    { id: 'chess-engine', title: 'Chess', summary: 'A chess engine.', status: 'complete', links: { repo: 'https://github.com/jane/chess' } },
    { id: 'other', title: 'Other', summary: 'Other.', status: 'in-progress' },
  ],
  skills: [{ id: 'languages', name: 'Languages', items: ['Go', 'Python'] }],
})

const existing = new Set(['/pub/og-image.png', '/pub/content/resume/jane.pdf', '/pub/content/images/me.webp'])
const opts = (extra = {}) => ({ publicDir: '/pub', fileExists: (p) => existing.has(p), fileSize: () => 1000, ...extra })
const run = (mutate, extra) => {
  const raw = valid()
  if (mutate) mutate(raw)
  return validateContent(raw, opts(extra))
}
const lines = (issues, level = 'error') => issues.map((i) => formatIssue(i, level))

describe('validator', () => {
  test('valid fixture has no errors or warnings', () => {
    expect(run()).toEqual({ errors: [], warnings: [] })
  })

  test('bad URL (spec example message)', () => {
    const { errors } = run((r) => { r.projects.push({ id: 'p3', title: 'x', summary: 'y', status: 'complete', links: { repo: 'github.com/foo/bar' } }) })
    expect(lines(errors)).toEqual([
      '✖ src/data/projects.json → [2] (id "p3").links.repo: expected an https:// URL, got "github.com/foo/bar". Hint: use the full URL, e.g. "https://github.com/foo/bar".',
    ])
  })

  test('http:// rejected; siteUrl must end with slash', () => {
    const { errors } = run((r) => { r.experience[0].organizationUrl = 'http://acme.com'; r.site.siteUrl = 'https://example.github.io' })
    expect(errors.map((e) => e.path).sort()).toEqual(['[0] (id "acme").organizationUrl', 'siteUrl'])
  })

  test('email link must be mailto, others https', () => {
    const { errors } = run((r) => { r.links[1].url = 'jane@example.com'; r.links[0].url = 'mailto:jane@example.com' })
    expect(errors.map((e) => e.message)).toEqual(['expected an https:// URL, got "mailto:jane@example.com"', 'expected a mailto: link, got "jane@example.com"'])
  })

  test('bad date', () => {
    const { errors } = run((r) => { r.experience[0].start = '2024-6' })
    expect(lines(errors)[0]).toBe('✖ src/data/experience.json → [0] (id "acme").start: expected a date "YYYY-MM" or "YYYY", got "2024-6". Hint: pad the month, e.g. "2024-06".')
  })

  test('end before start (spec example message)', () => {
    const { errors } = run((r) => { r.experience.push({ id: 'x', organization: 'X', role: 'R', start: '2024-09', end: '2024-02' }) })
    expect(lines(errors)).toEqual(['✖ src/data/experience.json → [1] (id "x").end: "2024-02" is before start "2024-09".'])
  })

  test('year-only end in the same year as a month start is fine', () => {
    expect(run((r) => { r.experience[0].start = '2024-05'; r.experience[0].end = '2024' }).errors).toEqual([])
  })

  test('duplicate id (spec example message)', () => {
    const { errors } = run((r) => { r.projects.push({ id: 'p2', title: 'x', summary: 'y', status: 'complete' }, { id: 'chess-engine', title: 'x', summary: 'y', status: 'complete' }) })
    expect(formatIssue(errors[0])).toBe('✖ src/data/projects.json → [3].id: duplicate id "chess-engine" (also at [0]). Hint: ids must be unique within the file; rename one.')
  })

  test('non-kebab id', () => {
    const { errors } = run((r) => { r.skills[0].id = 'My Skills' })
    expect(errors[0].hint).toContain('"my-skills"')
  })

  test('unknown key with suggestion (spec example message)', () => {
    const { errors } = run((r) => { r.experience[0].technolgies = r.experience[0].technologies; delete r.experience[0].technologies })
    expect(lines(errors)).toEqual(['✖ src/data/experience.json → [0] (id "acme").technolgies: unknown field. Hint: did you mean "technologies"?'])
  })

  test('unknown key without close match lists allowed fields', () => {
    const { errors } = run((r) => { r.skills[0].zzzzzz = 1 })
    expect(errors[0].hint).toMatch(/^allowed fields: id, name, items/)
  })

  test('missing required field', () => {
    const { errors } = run((r) => { delete r.profile.email })
    expect(lines(errors)).toEqual(['✖ src/data/profile.json → email: missing required field. Hint: add "email".'])
  })

  test('over-length string', () => {
    const { errors } = run((r) => { r.profile.headline = 'x'.repeat(81) })
    expect(lines(errors)).toEqual(['✖ src/data/profile.json → headline: is 81 characters, the limit is 80. Hint: shorten it by 1 characters.'])
  })

  test('description shorter than 50', () => {
    const { errors } = run((r) => { r.site.description = 'Too short.' })
    expect(errors[0].message).toBe('is 10 characters, the minimum is 50')
  })

  test('too many items', () => {
    const { errors } = run((r) => { r.experience[0].highlights = Array.from({ length: 7 }, (_, i) => `H${i}`) })
    expect(errors.map((e) => e.message)).toEqual(['has 7 items, the limit is 6'])
  })

  test('too few items', () => {
    const { errors } = run((r) => { r.profile.about = [] })
    expect(errors.map((e) => e.message)).toEqual(['has 0 items, needs at least 1'])
  })

  test('case-insensitive duplicate items', () => {
    const { errors } = run((r) => { r.skills[0].items = ['Go', 'go'] })
    expect(lines(errors)).toEqual(['✖ src/data/skills.json → [0] (id "languages").items[1]: duplicate item "go" (also at [0]). Hint: remove the duplicate.'])
  })

  test('wrong types and enum suggestion', () => {
    const { errors } = run((r) => { r.site.themeToggle = 'yes'; r.projects[0].status = 'completed'; r.projects[0].teamSize = 0 })
    expect(errors.map((e) => `${e.path}: ${e.message} | ${e.hint}`)).toEqual([
      'themeToggle: expected true or false, got "yes" | write true or false without quotes',
      '[0] (id "chess-engine").teamSize: must be at least 1, got 0 | null',
      '[0] (id "chess-engine").status: invalid value "completed" | did you mean "complete"? Allowed: "complete", "in-progress", "archived"',
    ])
  })

  test('HTML and Markdown rejected; untrimmed strings rejected', () => {
    const { errors } = run((r) => { r.profile.summary = 'I <b>build</b>'; r.profile.about = ['See [here](https://x.com)']; r.profile.name = ' Jane ' })
    expect(errors.map((e) => e.message.split(':')[0])).toEqual(['has leading or trailing spaces', 'contains HTML', 'contains Markdown'])
  })

  test('section rules: unknown id, duplicate, label length', () => {
    const { errors } = run((r) => { r.site.sections.push({ id: 'blog', label: 'Blog', visible: true }, { id: 'about', label: 'A very long label here!', visible: true }) })
    expect(errors.map((e) => e.path)).toEqual(['sections[2].id', 'sections[3].label', 'sections[3].id'])
  })

  test('ogImageAlt required when ogImage set', () => {
    const { errors } = run((r) => { r.site.ogImageAlt = null })
    expect(errors.map((e) => e.path)).toEqual(['ogImageAlt'])
  })

  test('placeholder: warning normally, error in strict mode', () => {
    const mutate = (r) => { r.profile.headline = 'TODO: from resume (e.g. target role)'; r.links[0].url = 'https://www.linkedin.com/in/TODO-x'; r.experience[0].id = 'todo-first-role'; r.experience[0].start = 'TODO' }
    const normal = run(mutate)
    expect(normal.errors).toEqual([])
    expect(normal.warnings).toHaveLength(4)
    expect(formatIssue(normal.warnings.find((w) => w.path === 'headline'), 'warning')).toBe(
      '⚠ src/data/profile.json → headline: placeholder text "TODO: from resume (e.g. target role)". Hint: replace before deploying.',
    )
    const strict = run(mutate, { strict: true })
    expect(strict.errors).toHaveLength(4)
    expect(strict.warnings).toEqual([])
  })

  test('placeholder dates skip the start/end order check', () => {
    expect(run((r) => { r.experience[0].start = 'TODO'; r.experience[0].end = '2020' }).errors).toEqual([])
  })

  test('missing local file', () => {
    const { errors } = run((r) => { r.profile.resumeUrl = 'content/resume/missing.pdf' })
    expect(lines(errors)).toEqual(['✖ src/data/profile.json → resumeUrl: file not found: public/content/resume/missing.pdf. Hint: add the file at that path, or fix the path (it is relative to public/).'])
  })

  test('local path rules: leading slash, "..", extension, oversized image', () => {
    const { errors } = run((r) => {
      r.profile.resumeUrl = '/content/resume/jane.pdf'
      r.site.ogImage = '../secret.png'
      r.projects[0].image = { src: 'content/images/me.gif', alt: 'x' }
      r.profile.photo.src = 'content/images/me.webp'
    }, { fileSize: () => 200 * 1024 })
    expect(errors.map((e) => e.message)).toEqual([
      'local path must not contain "..": "../secret.png"',
      'local path must not start with "/": "/content/resume/jane.pdf"',
      'public/content/images/me.webp is 200 KB, the limit is 60 KB',
      'expected a .webp, .avif, .png, .jpg, .jpeg file, got "content/images/me.gif"',
    ])
  })

  test('more than 4 featured projects warns', () => {
    const { warnings } = run((r) => { r.projects = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, title: 't', summary: 's', status: 'complete', featured: true })) })
    expect(warnings.map((w) => w.message)).toEqual(['5 projects are featured'])
  })

  test('public/CNAME must agree with siteUrl', () => {
    existing.add('/pub/CNAME')
    try {
      expect(run().errors.map((e) => e.path)).toEqual(['siteUrl'])
      expect(run((r) => { r.site.siteUrl = 'https://example.com/' }).errors).toEqual([])
    } finally {
      existing.delete('/pub/CNAME')
    }
  })

  test('generated github.json shape and missing-stats warning', () => {
    const ok = run((r) => {
      r.projects[0].githubRepo = 'jane/chess'
      r.github = { generatedAt: '2026-11-09T00:00:00Z', repos: { 'jane/chess': { url: 'https://github.com/jane/chess', description: '', language: null, stars: 0, updatedAt: '2026-01-01T00:00:00Z', homepage: null } } }
    })
    expect(ok).toEqual({ errors: [], warnings: [] })
    const bad = run((r) => { r.projects[0].githubRepo = 'jane/chess'; r.github = { generatedAt: 'x', repos: { 'jane/chess': { stars: -1 } } } })
    expect(bad.errors.length).toBeGreaterThan(0)
    expect(bad.errors.every((e) => e.file === 'src/data/generated/github.json')).toBe(true)
    expect(bad.warnings).toEqual([])
    const missing = run((r) => { r.projects[0].githubRepo = 'jane/chess' })
    expect(missing.warnings.map((w) => w.message)).toEqual(['no GitHub stats for "jane/chess"'])
  })

  test('top-level shape errors', () => {
    const { errors } = run((r) => { r.projects = {}; r.profile = [] })
    expect(errors.map((e) => e.message)).toEqual(['expected an object {...} at the top level, got array', 'expected a list [...] at the top level, got object'])
  })
})

describe('invalid JSON', () => {
  const parse = (text) => {
    try {
      JSON.parse(text)
    } catch (err) {
      return jsonParseIssue('src/data/projects.json', text, err)
    }
    throw new Error('expected a parse error')
  }
  test('trailing comma gives line, column and hint', () => {
    const text = '[\n  {\n    "id": "a",\n  }\n]'
    const line = formatIssue(parse(text))
    expect(line).toMatch(/^✖ src\/data\/projects\.json: invalid JSON at line 4, column 3: .+\. Hint: check for a trailing comma\.$/)
  })
  test('missing comma hint', () => {
    expect(parse('{\n  "a": 1\n  "b": 2\n}').hint).toBe('check for a missing comma between values')
  })
  test('single quotes hint', () => {
    expect(parse("{ 'a': 1 }").hint).toContain('double quotes')
  })
  test('empty file', () => {
    expect(parse('').hint).toContain('empty')
  })
})

describe('suggestions', () => {
  test('edit distance', () => {
    expect(editDistance('technolgies', 'technologies')).toBe(1)
    expect(editDistance('abc', 'abc')).toBe(0)
  })
  test('suggestKey within distance 2 only', () => {
    expect(suggestKey('titel', ['title', 'summary'])).toBe('title')
    expect(suggestKey('Summary', ['title', 'summary'])).toBe('summary')
    expect(suggestKey('xyzzy', ['title', 'summary'])).toBeNull()
  })
})
