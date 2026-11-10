// JSDoc typedefs for the normalized objects returned by ./index.js (spec section 7.3).
// This module exports nothing at runtime.

/** @typedef {{ siteUrl: string, title: string, description: string, locale: string,
 *   ogImage: string|null, ogImageAlt: string|null, defaultTheme: string, themeToggle: boolean,
 *   fanArt: boolean }} Site  // fanArt: false hides all Pokémon sprites (default true)
 *   // ogImage is resolved with BASE_URL */

/** @typedef {{ id: 'about'|'experience'|'projects'|'education'|'skills'|'contact',
 *   label: string, index: string,
 *   pageId: string, href: string, lead: boolean }} Section
 *   // index: "01", "02", ... across all placed sections in page order (kept from v1; v2 UI does not render it)
 *   // href: page.href + '#' + id ; lead: id === pageId */

/** @typedef {{ id: string, path: string,        // "experience/" (no leading slash, trailing slash)
 *   href: string,                                // BASE_URL + path, e.g. "/experience/"
 *   label: string, guide: 'charmander'|'bulbasaur'|'squirtle'|null, blurb: string, description: string,
 *   teaser: string|null, index: string,          // "01", "02", ... among shown pages
 *   sections: Section[], hasLead: boolean }} Page */

/** @typedef {{ kind: 'home'|'page'|'not-found', page: Page|null,
 *   canonicalPath: string|null }} Route
 *   // canonicalPath: the normalized full pathname (with base) the router should show,
 *   //   e.g. "/experience/" for input "/experience" or "/experience/index.html"; null for not-found */

/** @typedef {{ title: string, description: string, canonical: string|null,
 *   robots: 'index'|'noindex', jsonLd: object|null }} Head
 *   // jsonLd: the Person object on home, null elsewhere */

/** @typedef {{ src: string, alt: string }} Image   // src already resolved with BASE_URL */

/** @typedef {{ name: string, headline: string, summary: string, about: string[],
 *   currently: string|null, location: string|null, availability: string|null,
 *   email: string, contactBlurb: string|null, resumeUrl: string|null, photo: Image|null }} Profile
 *   // resumeUrl resolved with BASE_URL */

/** @typedef {{ id: string, kind: 'github'|'linkedin'|'email'|'website'|'scholar'|'other',
 *   label: string, url: string, showInHero: boolean, isExternal: boolean }} Link */

/** @typedef {{ id: string, organization: string, organizationUrl: string|null, role: string,
 *   employmentType: string|null,          // display form: "Internship", "Full-time", ...
 *   location: string|null, start: string, end: string|null,
 *   dateLabel: string,                     // formatDateRange(start, end)
 *   summary: string|null, highlights: string[], technologies: string[] }} Experience */

/** @typedef {{ id: string, institution: string, institutionUrl: string|null,
 *   degree: string, field: string, minor: string|null,
 *   degreeLabel: string,                   // "B.S. Computer Science" or "B.S. Computer Science, Minor in X"
 *   location: string|null, start: string|null, end: string, expected: boolean,   // start may be null (spec deviation)
 *   dateLabel: string,                     // formatDateRange(start, end, { expected })
 *   gpa: string|null, honors: string[], coursework: string[] }} Education */

/** @typedef {{ stars: number, language: string|null, updatedAt: string }} GithubStats */

/** @typedef {{ id: string, title: string, summary: string, role: string|null,
 *   teamSize: number|null, context: string|null,
 *   contextLabel: string|null,             // e.g. "Team project · 3 contributors · 2026"; null if nothing to show
 *   start: string|null, end: string|null, dateLabel: string|null,
 *   status: 'complete'|'in-progress'|'archived', statusLabel: string|null,  // null for complete; "In progress" / "Archived"
 *   featured: boolean, order: number,
 *   highlights: string[], technologies: string[],
 *   links: { repo: string|null, demo: string|null, writeup: string|null },
 *   primaryUrl: string|null,               // demo ?? repo ?? writeup ?? null
 *   githubStats: GithubStats|null, image: Image|null }} Project */

/** @typedef {{ id: string, name: string, items: string[] }} SkillGroup */

/** @typedef {{ site: Site, profile: Profile, links: Link[], experience: Experience[],
 *   education: Education[], projects: Project[], skills: SkillGroup[], pages: Page[], sections: Section[] }} SiteContent */

export {}
