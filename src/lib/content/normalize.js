// Pure normalization of raw content JSON into the shapes documented in ./types.js.
// Used by ./index.js (browser, via Vite) and by scripts/ (plain Node).
// Assumes the input passed validation; it is still defensive about missing optional fields.

import { formatDateRange, parseDate, DATE_PLACEHOLDER } from './format.js'
import { resolveAsset } from './paths.js'

/** @typedef {import('./types.js').SiteContent} SiteContent */

export const SECTION_IDS = ['about', 'experience', 'projects', 'education', 'skills', 'contact']

export const EMPLOYMENT_TYPE_LABELS = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  internship: 'Internship',
  research: 'Research',
  teaching: 'Teaching',
  contract: 'Contract',
  volunteer: 'Volunteer',
}

export const STATUS_LABELS = {
  complete: null,
  'in-progress': 'In progress',
  archived: 'Archived',
}

const str = (v) => (typeof v === 'string' ? v : null)
const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [])
const isVisible = (item) => item && typeof item === 'object' && item.visible !== false

function image(value, base) {
  if (!value || typeof value !== 'object' || typeof value.src !== 'string') return null
  return { src: resolveAsset(value.src, base), alt: str(value.alt) ?? '' }
}

/**
 * Numeric sort key for a date. Real dates compare by year*100+month (year-only counts as
 * month 0). Returns null for null, Infinity-like markers are handled by callers.
 */
function dateKey(value) {
  const d = parseDate(value)
  return d ? d.year * 100 + (d.month ?? 0) : null
}

const isTodoDate = (v) => v === DATE_PLACEHOLDER

/** Compare descending by date key (newer first). Missing keys sort after real ones. */
function cmpDesc(a, b) {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  return b - a
}

/** Stable sort (Array.prototype.sort is stable in modern engines; copy first). */
const sorted = (list, cmp) => [...list].sort(cmp)

// ---------------------------------------------------------------------------

export function normalizeSite(raw) {
  const site = raw || {}
  return {
    siteUrl: str(site.siteUrl) ?? '/',
    title: str(site.title) ?? '',
    description: str(site.description) ?? '',
    locale: str(site.locale) ?? 'en_US',
    ogImage: site.ogImage ? site.ogImage : null,
    ogImageAlt: str(site.ogImageAlt),
    defaultTheme: str(site.defaultTheme) ?? 'system',
    themeToggle: site.themeToggle !== false,
  }
}

export function normalizeProfile(raw, base) {
  const p = raw || {}
  return {
    name: str(p.name) ?? '',
    headline: str(p.headline) ?? '',
    summary: str(p.summary) ?? '',
    about: arr(p.about),
    currently: str(p.currently),
    location: str(p.location),
    availability: str(p.availability),
    email: str(p.email) ?? '',
    contactBlurb: str(p.contactBlurb),
    resumeUrl: p.resumeUrl ? resolveAsset(p.resumeUrl, base) : null,
    photo: image(p.photo, base),
  }
}

function originOf(url) {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

export function normalizeLinks(raw, siteUrl) {
  const siteOrigin = siteUrl ? originOf(siteUrl) : null
  return (Array.isArray(raw) ? raw : []).filter(isVisible).map((l) => {
    const url = str(l.url) ?? ''
    const isHttp = /^https?:\/\//i.test(url)
    return {
      id: str(l.id) ?? '',
      kind: str(l.kind) ?? 'other',
      label: str(l.label) ?? '',
      url,
      showInHero: l.showInHero !== false,
      isExternal: isHttp && originOf(url) !== siteOrigin,
    }
  })
}

/** Experience: end null first (start desc), then end desc, then start desc; "TODO" dates last. */
export function compareExperience(a, b) {
  const aTodo = isTodoDate(a.start) || isTodoDate(a.end)
  const bTodo = isTodoDate(b.start) || isTodoDate(b.end)
  if (aTodo !== bTodo) return aTodo ? 1 : -1
  if (aTodo && bTodo) return 0
  const aCurrent = a.end === null
  const bCurrent = b.end === null
  if (aCurrent !== bCurrent) return aCurrent ? -1 : 1
  if (!aCurrent) {
    const byEnd = cmpDesc(dateKey(a.end), dateKey(b.end))
    if (byEnd !== 0) return byEnd
  }
  return cmpDesc(dateKey(a.start), dateKey(b.start))
}

export function normalizeExperience(raw) {
  const items = (Array.isArray(raw) ? raw : []).filter(isVisible).map((e) => {
    const start = str(e.start) ?? DATE_PLACEHOLDER
    const end = e.end === null || e.end === undefined ? null : String(e.end)
    return {
      id: str(e.id) ?? '',
      organization: str(e.organization) ?? '',
      organizationUrl: str(e.organizationUrl),
      role: str(e.role) ?? '',
      employmentType: e.employmentType ? (EMPLOYMENT_TYPE_LABELS[e.employmentType] ?? String(e.employmentType)) : null,
      location: str(e.location),
      start,
      end,
      dateLabel: formatDateRange(start, end) ?? '',
      summary: str(e.summary),
      highlights: arr(e.highlights),
      technologies: arr(e.technologies),
    }
  })
  return sorted(items, compareExperience)
}

/** Education: by end desc; "TODO" dates last. */
export function compareEducation(a, b) {
  const aTodo = isTodoDate(a.end)
  const bTodo = isTodoDate(b.end)
  if (aTodo !== bTodo) return aTodo ? 1 : -1
  return cmpDesc(dateKey(a.end), dateKey(b.end))
}

export function composeDegreeLabel(degree, field, minor) {
  const main = [degree, field].filter(Boolean).join(' ')
  return minor ? `${main}, Minor in ${minor}` : main
}

export function normalizeEducation(raw) {
  const items = (Array.isArray(raw) ? raw : []).filter(isVisible).map((e) => {
    const degree = str(e.degree) ?? ''
    const field = str(e.field) ?? ''
    const minor = str(e.minor)
    // start is optional for education (resumes often list only graduation); null renders "Expected Jun 2028".
    const start = str(e.start)
    const end = str(e.end) ?? DATE_PLACEHOLDER
    const expected = e.expected === true
    return {
      id: str(e.id) ?? '',
      institution: str(e.institution) ?? '',
      institutionUrl: str(e.institutionUrl),
      degree,
      field,
      minor,
      degreeLabel: composeDegreeLabel(degree, field, minor),
      location: str(e.location),
      start,
      end,
      expected,
      dateLabel: formatDateRange(start, end, { expected }) ?? '',
      gpa: str(e.gpa),
      honors: arr(e.honors),
      coursework: arr(e.coursework),
    }
  })
  return sorted(items, compareEducation)
}

/**
 * contextLabel parts joined with " · ":
 *   context ?? teamSize text; teamSize text too if context was given; end year or "Ongoing".
 */
export function composeContextLabel({ context, teamSize, status, end }) {
  const parts = []
  const hasTeam = Number.isInteger(teamSize) && teamSize >= 1
  if (context) {
    parts.push(context)
    if (hasTeam) parts.push(teamSize === 1 ? 'Solo project' : `${teamSize} contributors`)
  } else if (hasTeam) {
    parts.push(teamSize === 1 ? 'Solo project' : `Team project · ${teamSize} contributors`)
  }
  if (status === 'in-progress') {
    parts.push('Ongoing')
  } else {
    const d = parseDate(end)
    if (d) parts.push(String(d.year))
  }
  return parts.length ? parts.join(' · ') : null
}

/** Projects: featured first; then order asc; then end desc (null = newest, "TODO" = oldest); then title asc. */
export function compareProjects(a, b) {
  if (a.featured !== b.featured) return a.featured ? -1 : 1
  if (a.order !== b.order) return a.order - b.order
  const endRank = (p) => (p.end === null ? Number.POSITIVE_INFINITY : (dateKey(p.end) ?? Number.NEGATIVE_INFINITY))
  const ea = endRank(a)
  const eb = endRank(b)
  if (ea !== eb) return eb > ea ? 1 : -1
  return a.title < b.title ? -1 : a.title > b.title ? 1 : 0
}

export function normalizeProjects(raw, github, base) {
  const repos = (github && typeof github === 'object' && github.repos && typeof github.repos === 'object') ? github.repos : {}
  const items = (Array.isArray(raw) ? raw : []).filter(isVisible).map((p) => {
    const links = p.links && typeof p.links === 'object' ? p.links : {}
    const normLinks = {
      repo: str(links.repo),
      demo: str(links.demo),
      writeup: str(links.writeup),
    }
    const start = p.start == null ? null : String(p.start)
    const end = p.end == null ? null : String(p.end)
    const status = STATUS_LABELS[p.status] !== undefined ? p.status : 'complete'
    const teamSize = Number.isInteger(p.teamSize) ? p.teamSize : null
    const context = str(p.context)
    const repoStats = p.githubRepo ? repos[p.githubRepo] : null
    return {
      id: str(p.id) ?? '',
      title: str(p.title) ?? '',
      summary: str(p.summary) ?? '',
      role: str(p.role),
      teamSize,
      context,
      contextLabel: composeContextLabel({ context, teamSize, status, end }),
      start,
      end,
      dateLabel: formatDateRange(start, end),
      status,
      statusLabel: STATUS_LABELS[status],
      featured: p.featured === true,
      order: Number.isInteger(p.order) ? p.order : 100,
      highlights: arr(p.highlights),
      technologies: arr(p.technologies),
      links: normLinks,
      primaryUrl: normLinks.demo ?? normLinks.repo ?? normLinks.writeup ?? null,
      githubStats: repoStats && typeof repoStats === 'object'
        ? {
            stars: Number.isFinite(repoStats.stars) ? repoStats.stars : 0,
            language: str(repoStats.language),
            updatedAt: str(repoStats.updatedAt) ?? '',
          }
        : null,
      image: image(p.image, base),
    }
  })
  return sorted(items, compareProjects)
}

export function normalizeSkills(raw) {
  return (Array.isArray(raw) ? raw : []).filter(isVisible).map((g) => ({
    id: str(g.id) ?? '',
    name: str(g.name) ?? '',
    items: arr(g.items),
  }))
}

/**
 * site.sections filtered: visible && has content. index ("01", "02", ...) assigned after filtering.
 */
export function deriveSections(rawSections, content) {
  const hasContent = {
    about: content.profile.about.length > 0,
    experience: content.experience.length > 0,
    projects: content.projects.length > 0,
    education: content.education.length > 0,
    skills: content.skills.length > 0,
    contact: Boolean(content.profile.email) || content.links.length > 0,
  }
  const seen = new Set()
  return (Array.isArray(rawSections) ? rawSections : [])
    .filter((s) => s && SECTION_IDS.includes(s.id) && s.visible !== false && hasContent[s.id])
    .filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)))
    .map((s, i) => ({ id: s.id, label: str(s.label) ?? s.id, index: String(i + 1).padStart(2, '0') }))
}

export function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const v of Object.values(value)) deepFreeze(v)
  }
  return value
}

/**
 * @param {{ site: object, profile: object, links: object[], experience: object[],
 *   education: object[], projects: object[], skills: object[], github?: object|null }} raw
 * @param {{ baseUrl?: string }} [options]
 * @returns {SiteContent}
 */
export function normalizeContent(raw, { baseUrl = '/' } = {}) {
  const site = normalizeSite(raw.site)
  site.ogImage = site.ogImage ? resolveAsset(site.ogImage, baseUrl) : null
  const profile = normalizeProfile(raw.profile, baseUrl)
  const links = normalizeLinks(raw.links, site.siteUrl)
  const experience = normalizeExperience(raw.experience)
  const education = normalizeEducation(raw.education)
  const projects = normalizeProjects(raw.projects, raw.github, baseUrl)
  const skills = normalizeSkills(raw.skills)
  const sections = deriveSections(raw.site && raw.site.sections, { profile, links, experience, education, projects, skills })
  return deepFreeze({ site, profile, links, experience, education, projects, skills, sections })
}
