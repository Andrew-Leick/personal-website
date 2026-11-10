// Per-route head values (spec v2 section 7). The build plugin serializes these into static HTML,
// and the frontend applies them on client navigation, so the two always agree.

import { isPlaceholder } from './placeholders.js'

const real = (v) => (typeof v === 'string' && v.trim() && !isPlaceholder(v) ? v : null)

/** Home title: "{name} | {headline}", or site.title while the headline is a placeholder. */
export function homeTitle(content) {
  const headline = real(content.profile.headline)
  return headline ? `${content.profile.name} | ${headline}` : content.site.title
}

/** "{label} | {name}" for a page. */
export function pageTitle(page, content) {
  return `${page.label} | ${content.profile.name}`
}

/**
 * schema.org Person for Home (REQ-503). Placeholder values are omitted; no address by design.
 * @param {import('./types.js').SiteContent} content
 */
export function personJsonLd(content) {
  const { site, profile, links, education } = content
  const person = { '@context': 'https://schema.org', '@type': 'Person', name: profile.name, url: site.siteUrl }
  const headline = real(profile.headline)
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
  return person
}

/**
 * @param {import('./types.js').Route} route
 * @param {import('./types.js').SiteContent} content
 * @returns {import('./types.js').Head}
 */
export function headFor(route, content) {
  const { site, profile } = content
  if (route && route.kind === 'home') {
    return { title: homeTitle(content), description: site.description, canonical: site.siteUrl, robots: 'index', jsonLd: personJsonLd(content) }
  }
  if (route && route.kind === 'page' && route.page) {
    return {
      title: pageTitle(route.page, content),
      description: route.page.description,
      canonical: `${site.siteUrl}${route.page.path}`, // siteUrl ends with "/" (validated)
      robots: 'index',
      jsonLd: null,
    }
  }
  return { title: `Page not found | ${profile.name}`, description: site.description, canonical: null, robots: 'noindex', jsonLd: null }
}
