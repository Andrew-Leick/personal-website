// Public content API (spec section 7.2). The frontend imports content ONLY from here.
// All getters are synchronous and return frozen, normalized data (shapes in ./types.js).
// JSON is imported statically so Vite bundles it and HMR picks up edits.

import site from '../../data/site.json'
import profile from '../../data/profile.json'
import links from '../../data/links.json'
import experience from '../../data/experience.json'
import education from '../../data/education.json'
import projects from '../../data/projects.json'
import skills from '../../data/skills.json'
import { normalizeContent } from './normalize.js'
import { BASE_URL } from './paths.js'
import { resolveRouteWithBase, sectionHrefOf } from './routes.js'
import { headFor } from './head.js'

// generated/github.json is written by `npm run sync:github` and may not exist.
// An eager glob resolves to {} when the file is missing instead of failing the import.
const githubModules = import.meta.glob('../../data/generated/github.json', { eager: true, import: 'default' })
const github = Object.values(githubModules)[0] ?? { repos: {} }

const content = normalizeContent(
  { site, profile, links, experience, education, projects, skills, github },
  { baseUrl: BASE_URL },
)

/** @returns {import('./types.js').Site} */
export function getSite() {
  return content.site
}

/** @returns {import('./types.js').Profile} */
export function getProfile() {
  return content.profile
}

/** @returns {import('./types.js').Link[]} file order */
export function getLinks() {
  return content.links
}

/** @returns {import('./types.js').Experience[]} newest first */
export function getExperience() {
  return content.experience
}

/** @returns {import('./types.js').Education[]} newest first */
export function getEducation() {
  return content.education
}

/** @returns {import('./types.js').Project[]} featured first, then order */
export function getProjects() {
  return content.projects
}

/** @returns {import('./types.js').SkillGroup[]} file order */
export function getSkills() {
  return content.skills
}

/** @returns {import('./types.js').Section[]} every placed section across shown pages, in page order */
export function getSections() {
  return content.sections
}

/** @returns {import('./types.js').Page[]} shown pages, in site.json order */
export function getPages() {
  return content.pages
}

/**
 * @param {string} id
 * @returns {import('./types.js').Page|null}
 */
export function getPage(id) {
  return content.pages.find((p) => p.id === id) ?? null
}

/** @returns {import('./types.js').Dex|null} null unless site.pokedex is true */
export function getDex() {
  return content.dex
}

/** @returns {string} the Home href: BASE_URL, e.g. "/" or "/personal-website/" */
export function getHomeHref() {
  return BASE_URL
}

/**
 * @param {string} sectionId
 * @returns {string|null} e.g. "/about/#contact"; null if the section is not placed on a shown page
 */
export function getSectionHref(sectionId) {
  return sectionHrefOf(sectionId, content)
}

/**
 * @param {string} pathname location.pathname (includes the base)
 * @returns {import('./types.js').Route}
 */
export function resolveRoute(pathname) {
  return resolveRouteWithBase(pathname, BASE_URL, content)
}

/**
 * @param {import('./types.js').Route} route
 * @returns {import('./types.js').Head}
 */
export function getHead(route) {
  return Object.freeze(headFor(route, content))
}

/** @returns {import('./types.js').SiteContent} */
export function getSiteContent() {
  return content
}

export { DEX_POKEMON, GUIDE_IDS } from './normalize.js'
export { isPlaceholder } from './placeholders.js'
export { formatDateRange, formatMonth, formatDexNumber } from './format.js'
