// JSDoc typedefs for the normalized objects returned by ./index.js (spec section 7.3).
// This module exports nothing at runtime.

/** @typedef {{ siteUrl: string, title: string, description: string, locale: string,
 *   ogImage: string|null, ogImageAlt: string|null, defaultTheme: string, themeToggle: boolean,
 *   fanArt: boolean, pokedex: boolean }} Site  // fanArt: false hides all Pokémon sprites (default true); pokedex default false
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
 *   sections: Section[], hasLead: boolean,
 *   aliases: { id: string, path: string, hash: string|null }[] }} Page
 *   // aliases: extra URLs that open this page, e.g. { id: "projects", path: "projects/", hash: "pokedex-projects" } (hash without "#") */

/** @typedef {{ kind: 'home'|'page'|'not-found', page: Page|null,
 *   canonicalPath: string|null, hash: string|null }} Route
 *   // hash: "#pokedex-projects" when an alias with a hash resolved this route; null otherwise
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
 *   summary: string|null, highlights: string[], technologies: string[],
 *   pokemon: string|null }} Experience     // pokemon: one of DEX_POKEMON (v5.1 Pokédex sprite) */

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
 *   githubStats: GithubStats|null, image: Image|null,
 *   pokemon: string|null }} Project        // pokemon: one of DEX_POKEMON (v5.1 Pokédex sprite) */

/** @typedef {{ id: string, name: string, items: string[] }} SkillGroup */

/** @typedef {{ key: string,               // "work:<id>" | "project:<id>"; DOM ids use it with ':' -> '-'
 *   kind: 'work'|'project', id: string,
 *   number: number,                        // 1-based within its dex (experience or projects)
 *   name: string,                          // experience.role | project.title
 *   subtitle: string|null,                 // experience.organization | project.contextLabel
 *   subtitleUrl: string|null,              // experience.organizationUrl | null
 *   dateLabel: string|null, start: string|null, end: string|null,
 *   typeLabel: 'Work'|'Project',
 *   tagLabel: string|null,                 // experience.employmentType | project.statusLabel
 *   featured: boolean,                     // false for work
 *   summary: string|null, role: string|null,           // role: project.role only
 *   highlights: string[], technologies: string[],
 *   links: { repo: string|null, demo: string|null, writeup: string|null }|null,  // null for work
 *   primaryUrl: string|null, githubStats: GithubStats|null, image: Image|null,
 *   pokemon: string|null }} DexEntry       // pokemon: the sprite; null shows the egg */

/** @typedef {{ work: DexEntry[], projects: DexEntry[] }} Dex */

/** @typedef {{ site: Site, profile: Profile, links: Link[], experience: Experience[],
 *   education: Education[], projects: Project[], skills: SkillGroup[], pages: Page[], sections: Section[],
 *   dex: Dex|null }} SiteContent   // dex: null unless site.pokedex is true */

export {}
