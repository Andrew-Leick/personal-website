# Portfolio Site v2: Home Page + Subpages

| | |
| :- | :- |
| Owner of this spec | Planner (`planner`) |
| Builders | Backend (`backend`), Frontend (`frontend`) |
| Verifier | QA (`qa`) |
| Repo | `/Users/andrewleick/personal-website` (Vite 8 + React 19, Node 24, branch `main`) |
| Baseline | Commit `66f76bb` ("Add first draft of personal website"): the single-scroll site built from `SPEC.md` v1 |
| Date | 2026-11-10 |
| Status | Ready to build |

**How to read this.** `SPEC.md` (v1) stays in force for everything this document does not change: design tokens, themes, typography, content schemas, validation, link rules, performance budgets, CI and hosting. Section 14 lists every v1 requirement that v2 **supersedes** or **retires**. Anything not listed there still applies. `CONTENT-FACTS.md` still overrides v1 sections 11 to 13. For example, locations are never rendered, there is no phone number, and there is no CS131.

**Every item here is a decision.** If something is unclear, take the most literal reading, note it in your hand-off, and move on. You can also message `planner`. Planner answers questions and amends this file. When a decision changes, planner tells all three builders.

**Hard rule on facts (unchanged).** Nobody invents facts about Andrew. Any new user-visible text in this spec falls into one of three kinds:
1. UI copy, such as "Explore" or "Page not found";
2. a restatement of facts already in `CONTENT-FACTS.md`;
3. a `TODO:` placeholder.

**Out of scope.** The open items in `docs/handoff/qa-report.md` stay open, and v2 does not touch them:
- the resume PDF privacy issue (phone number and cities in the PDF);
- the `TODO:` placeholders (`profile.availability` and the NFL highlight);
- confirming the public email;
- the custom domain.

---

## Contents

1. Goal and what changes
2. Research summary and the decisions it drives
3. Information architecture and sitemap
4. Routing decision (GitHub Pages, deep links, 404)
5. Page specs: Home, Experience, Projects, About, Not found
6. Global layout and navigation
7. Head, SEO and sharing per page
8. Focus, scroll and announcement on route change
9. Visual design additions (tokens)
10. Data model and content API changes (backend)
11. Build, plugin, scripts (backend)
12. File ownership and task breakdown
13. Requirements (REQ-800 to REQ-979)
14. v1 requirements superseded or retired
15. QA test plan (QA-800 to QA-899) and carried-forward v1 tests
16. Acceptance criteria (definition of done)
17. Open items (unchanged) and sources

---

## 1. Goal and what changes

### 1.1 Goal
Andrew wants a simpler site: a calm home page that says who he is, and a few obvious paths to the details. Recruiters should get the essentials from the home page alone. That means name, what he is, school, the resume and contact links. Anyone who wants more should reach Experience, Projects or About in one click from any page.

### 1.2 What changes
| v1 (single scroll) | v2 (home + subpages) |
| :- | :- |
| One URL `/` with six anchored sections | Home `/` plus three subpages: `/experience/`, `/projects/`, `/about/`, plus a not-found page |
| Sticky header, scroll-spy nav (`aria-current="location"`), mobile "Menu" disclosure | Non-sticky header with three page links always visible (no hamburger), `aria-current="page"` |
| Section order from `site.sections` | Pages and their sections from `site.pages` |
| One `<title>`/description/canonical | Per-page title, description, canonical, OG, robots; one static HTML file per page |
| Hero + all sections on one page | Home = hero + an "Explore" index of the three pages, each with a data-derived preview line |

### 1.3 What does not change
- The black-and-white default.
- The swappable theme files and the light/dark toggle, including the bootstrap script.
- Design tokens.
- The JSON content files and validator rules. The exception is `site.sections`, which becomes `site.pages`.
- The section components' internals. Experience entries, project cards, education, skills and the contact block render as in v1.
- The budgets: Lighthouse 100 accessibility, at least 95 for performance and best practices, 100 for SEO; JS at most 90 KB gzip; no new runtime dependencies.

### 1.4 Success criteria (v2)
- **SC2-1.** From any page, each of Home, Experience, Projects and About is one click or tap away. On a phone, no menu has to be opened first. (REQ-840, REQ-842)
- **SC2-2.** Every page URL works when pasted into a fresh tab on GitHub Pages: HTTP 200, the right content, the right `<title>`. (REQ-800, REQ-940)
- **SC2-3.** Lighthouse mobile on each of the four pages: Performance at least 95, Accessibility 100, Best Practices at least 95, SEO 100. axe reports 0 violations in both themes. (REQ-960)
- **SC2-4.** Moving a section to another page, renaming a page, or hiding a page takes one edit to `site.json` and no component changes. Adding an experience or project entry is still a single-file edit. (REQ-920, REQ-925)
- **SC2-5.** No new runtime dependency. Initial JS stays at most 90 KB gzip. (REQ-405, REQ-402)

---

## 2. Research summary and the decisions it drives

| Finding | Decision |
| :- | :- |
| Portfolio and web-design roundups for 2025–2026 agree on a few points [R1][R2][R3][R4]:<br>- minimalism and simple navigation;<br>- few nav items;<br>- strong typographic hierarchy;<br>- "reduce navigation";<br>- a clear, specific role statement at the top.<br><br>A popular 2026 developer post argues that personal sites are over-complicated and should go back to simple pages [R5]. | Three subpages only, with short one-word labels. The home page is a typographic hero plus a plain index list. There are no animations, carousels or effects. |
| Hamburger menus hide navigation. Bolder minimal portfolios use visible, oversized links instead of hidden menus [R6]. With three items there is no reason to hide them. | The v1 mobile "Menu" disclosure is removed. All three page links are always visible, as a second header row on narrow screens. |
| Recruiters skim fast (v1 [S1]). Every v1 portfolio source says to make the best work and the resume easy to find (v1 [S2] to [S4]). | The hero keeps the resume and contact actions above the fold. Each home index row shows a **data-derived preview** (latest role, featured project, degree), so a skimmer gets the gist without clicking. |
| GitHub Pages has no rewrite rules. The common SPA workaround redirects deep links through `404.html` to a query string [R7][R8]. That project's own README says Google no longer follows those redirects, so deep links get poor SEO. Copying `index.html` to `404.html` works for users but returns HTTP 404 [R9]. GitHub Pages serves a custom `404.html` for missing paths [R10]. | We do not use the 404 redirect trick. The build **emits a real HTML file per route** (`/experience/index.html` and so on), each with its own head tags. Every real URL returns 200 with correct metadata, and a History API router takes over after load. `404.html` handles unknown paths only. See section 4. |
| Accessible client-side routing needs three things [R11][R12][R13][R14][R15]:<br>- update `document.title`;<br>- move focus deliberately after navigation (not on first load), usually to the new page's heading or main container;<br>- make sure screen readers notice. SvelteKit and Nuxt add a live-region announcer. Gatsby's testing found some screen-reader and browser pairs announced nothing without help. | On client navigation:<br>- set the title first;<br>- move focus to the page `<h1>` (`tabindex="-1"`);<br>- restore scroll on back and forward;<br>- skip the focus move on initial load.<br><br>We use focus-on-heading rather than a separate live announcer, to avoid double announcements. Section 8. |

---

## 3. Information architecture and sitemap

### 3.1 Sitemap

```
/                     Home: hero (who, what, resume, contact links) + "Explore" index
├── /experience/      Experience: all roles (Amazon x2, GTRI, FIRST Robotics)
├── /projects/        Projects: project cards
├── /about/           About: background paragraphs, Education, Skills, Contact
│     ├── #education
│     ├── #skills
│     └── #contact
└── (any other path)  Not found (served from 404.html on GitHub Pages)
```

Why this split:
- **Experience** is what recruiters look at first after the hero. Andrew's two Amazon internships are his strongest signal, so they get their own page.
- **Projects** is what engineers click into. It gets its own page and will grow as Andrew adds repos.
- **About** collects the short, supporting material (bio, education, skills, contact) on one page. None of it justifies a page of its own. Education still shows on Home through the hero headline and the About row's preview, so a skimmer does not need to click for it.
- Contact also lives in the hero (email, GitHub, LinkedIn) and in the footer of every page. It is reachable everywhere without a fourth top-level path.

Three paths is the planned set. Andrew can change it in data alone (section 10). For example, Skills could move to its own `/skills/` page with a `site.json` edit.

### 3.2 Default page configuration (from `site.json`, section 10.2)

| Order | Page id | URL | Nav label | Sections (in order) | Lead section |
| :- | :- | :- | :- | :- | :- |
| 01 | `experience` | `/experience/` | Experience | `experience` | `experience` |
| 02 | `projects` | `/projects/` | Projects | `projects` | `projects` |
| 03 | `about` | `/about/` | About | `about`, `education`, `skills`, `contact` | `about` |

The **lead section** of a page is the section whose id equals the page id. It renders directly under the page `<h1>` and has no `<h2>` of its own (section 5.6).

---

## 4. Routing decision

### 4.1 Decision
Routing uses the **History API with clean, trailing-slash URLs**. There are two parts:
- **(a) Build-time static HTML per route.** For every visible page, the backend plugin writes `dist/<pageId>/index.html`. It is a copy of the built `index.html` with that page's head tags. The plugin also writes `dist/404.html`, which has not-found head tags and `noindex`.
- **(b) A small custom client router (frontend).** About 100 lines, no dependency. It reads `location.pathname`, intercepts same-origin link clicks, calls `history.pushState`, and listens to `popstate`.

URLs:
- `https://andrew-leick.github.io/`
- `https://andrew-leick.github.io/experience/`
- `https://andrew-leick.github.io/projects/`
- `https://andrew-leick.github.io/about/`
- `https://andrew-leick.github.io/about/#contact`

With a project-site deploy, or later a custom domain, every URL is relative to `BASE_URL`. Nothing in the frontend may hardcode a leading `/`.

### 4.2 Why this and not the alternatives
| Option | Verdict |
| :- | :- |
| **Hash routing** (`/#/experience`) | Rejected. The server only ever sees `/`, so per-page titles and descriptions cannot exist for crawlers or link previews, and the sitemap cannot list pages. It collides with real in-page anchors (`#main`, `#contact`, the skip link). It also makes uglier URLs for a resume. |
| **History API + `404.html` redirect trick** (spa-github-pages) | Rejected. Every deep link first returns HTTP 404, then a redirect. Google no longer follows these redirects [R7], link-preview bots see the 404 page's metadata, and there is a visible double load. |
| **`404.html` = copy of `index.html`** | Rejected as the primary mechanism. It works for users, but every deep link returns HTTP 404 status, which hurts SEO and makes link checkers fail. We still emit a `404.html`, but only for truly unknown paths. |
| **React Router or another router library** | Rejected. It adds a runtime dependency (REQ-405) and bundle weight, and a four-route site does not need it. |
| **Static HTML per route + tiny History router** (chosen) | Every real URL returns 200 from GitHub Pages with route-specific `<title>`, description, canonical and OG tags. It works with no JS for metadata, and the `noscript` content shows. Unknown paths get a real 404 with a helpful page. No dependency. The cost is a few KB of duplicated HTML per route. |

**Known limitation (accepted).** The page body is still client-rendered. Crawlers that do not run JS see head tags and the `noscript` block, not the body. Lighthouse SEO and Google, which renders JS, are fine. Prerendering the body is a possible later step and is out of scope.

**Trailing slash.** For a missing trailing slash on a directory, GitHub Pages normally answers with a redirect to the slashed URL. QA verifies this after the first deploy (QA-890). The router also accepts `/experience` and `/experience/index.html` and normalizes them with `history.replaceState` to `/experience/` (REQ-806), so the address bar always shows the canonical form.

### 4.3 Dev and preview behavior
- `npm run dev`: Vite's SPA fallback serves `index.html` for any path. The plugin's `transformIndexHtml` uses the request URL to inject that route's head tags, with not-found tags for unknown paths (REQ-946).
- `npm run preview`: serves `dist/`. `/experience/` serves `dist/experience/index.html`. For unknown paths, Vite preview falls back to `index.html`, not `404.html`. The router still renders the not-found page because it does not recognize the path. QA tests the static `404.html` file content directly (QA-845).

---

## 5. Page specs

### 5.1 Every page
Every page renders, in order:
1. `SkipLink`
2. `SiteHeader` (section 6)
3. `<main id="main" tabindex="-1">` holding the page content
4. `SiteFooter` (section 6)

There is exactly one `<h1>` per page. Heading levels never skip.

### 5.2 Home `/` (REQ-820 to REQ-829)
Layout, top to bottom, in the single centered container (`--container-max`).

**A. Hero (`<section aria-labelledby="hero-name">`).** This is v1's Hero, with these changes:
- REQ-820: `profile.name` is the `<h1 id="hero-name">`, at the new display size `--text-display` (section 9). Below it:
  - `profile.headline`, at the `--text-3xl` style;
  - `profile.summary`, at `--text-lg`;
  - `profile.availability` as a muted line, if non-null.

  Location is never shown (CONTENT-FACTS).
- REQ-821: The action row is unchanged from v1 REQ-011:
  - a primary "Resume (PDF)" button, hidden if `resumeUrl` is null;
  - icon links for `getLinks()` items with `showInHero`.
- REQ-822: The optional photo behaves as in v1 REQ-012.
- Generous vertical space: `padding-block: var(--space-16) var(--space-12)` at base, `var(--space-24) var(--space-12)` at `md` and up. Inside each Explore row, the vertical gap between label, blurb and teaser is `var(--space-1)`. (Amended 2026-11-10: these values keep all three Explore labels inside 1440x900 for REQ-828.)

**B. Explore index (`<section aria-labelledby="explore-heading">`).**
- REQ-823: Starts with an `<h2 id="explore-heading">` reading "Explore". It uses the v1 eyebrow style: mono, `--text-xs`, uppercase, `--tracking-wide`, muted. It is visible, not visually hidden.
- REQ-824: Below the heading is an `<ul>` with one `<li>` per page from `getPages()`, in order. Each `<li>` holds **one** link (`<a href={page.href}>`) that wraps the whole row. The row contains, in DOM order:
  1. `page.index` ("01") in mono, muted, `aria-hidden="true"`;
  2. the page label as an `<h3>` inside the link, at `--text-2xl`, bold;
  3. `page.blurb` as a `<p>`, muted, `--text-base`;
  4. `page.teaser` as a `<p>` in `--font-mono` `--text-sm`, if non-null;
  5. an arrow icon (new `arrow-right` icon, `aria-hidden`), aligned right.

  The row has no other interactive elements (no nested links). The link's accessible name is its text content: label, blurb and teaser. Its `aria-describedby` is not used.
- REQ-825: Row styling:
  - full container width;
  - `border-top: var(--border-width) solid var(--color-border)`, and the last row also has a bottom border;
  - `padding-block: var(--space-6)`;
  - at least `var(--target-min)` tall.

  Hover and `:focus-visible`:
  - background `var(--color-bg-subtle)`;
  - the label gets an underline;
  - the arrow changes color from `--color-text-muted` to `--color-text`.

  Use color and underline only: no transforms, no motion (v1 4.8). The focus ring is the standard v1 ring, drawn inset (`outline-offset: calc(var(--focus-ring-offset) * -1)`) so it is not clipped by the container.
- REQ-826: Layout. Below `md`, the index number sits on the same line as the label, with blurb and teaser below and the arrow at the top right. At `md` and up, it is a three-column grid:
  - index: `var(--space-12)`;
  - content: `1fr`;
  - arrow: `auto`.
- REQ-827: The Explore index renders entirely from `getPages()`. Hiding a page in `site.json` removes its row, and the remaining rows renumber.
- REQ-828: Above the fold:
  - at 390x844: the hero action row is visible, and so is the top border of the first Explore row;
  - at 1366x768: the hero action row and the first Explore row's label;
  - at 1440x900: all three Explore labels.
- REQ-829: Home contains nothing else: no "featured project" block and no skills cloud. The footer follows.

### 5.3 Experience `/experience/` (REQ-860 to REQ-862)
- REQ-860: The page is
  ```
  <h1>{page.label}</h1>
  ```
  followed by the lead section's body. That body is v1's Experience list (REQ-040 to REQ-043, with the location override). Entry titles become `<h2>` instead of `<h3>`, because there is no section h2 (section 5.6).
- REQ-861: There is no section eyebrow number and no extra intro text.
- REQ-862: The entry date column, highlights, tech tags and the FIRST Robotics entry render exactly as v1. Whether to label FIRST Robotics differently is a data question for Andrew and stays open.

### 5.4 Projects `/projects/` (REQ-865 to REQ-868)
- REQ-865: `<h1>{page.label}</h1>`, then v1's project grid (REQ-050 to REQ-055), with card titles as `<h2>`.
- REQ-866: **Grid change.** With exactly one visible project, the grid is a single column at every width, and the card is capped at `max-width: var(--measure)`. With two or more, the v1 rule applies: 1 column below 768 px, 2 at 768 and up. This resolves QA's "empty right half" observation.
- REQ-867: **Star count change.** The "★ {stars}" item in the card context line is shown only when `githubStats.stars > 0`. The language still shows. This resolves QA's "★ 0" observation and amends v1 REQ-051.
- REQ-868: Featured label, status badge, link row and no-nested-links rules: unchanged from v1.

### 5.5 About `/about/` (REQ-870 to REQ-874)
- REQ-870: `<h1>{page.label}</h1>`, then the lead `about` section body. That body is v1 About: the `profile.about` paragraphs and the optional `currently` line, with no h2.
- REQ-871: Then one `<section id="{section.id}" aria-labelledby="{section.id}-heading">` per remaining section, in `page.sections` order (default: education, skills, contact). Each has:
  - an `<h2 id="{id}-heading" tabindex="-1">` with the section label;
  - no eyebrow number;
  - the v1 section body, with entry titles as `<h3>`.
- REQ-872: Education: v1 REQ-060 with the CONTENT-FACTS overrides. GPA is shown and location is not.
- REQ-873: Skills: v1 REQ-070.
- REQ-874: Contact: v1 REQ-080 to REQ-082. That covers the blurb, the mailto link plus "Copy email" with its live region, and the full links list. The "Resume (PDF)" button is added here too, hidden if `resumeUrl` is null, because About is where people look for contact details.

### 5.6 Section-to-heading rule (generic; applies to any page config)
- The page `<h1>` is `page.label`.
- If the page has a lead section (a section whose id equals the page id):
  - it renders first, with no `<section>` heading;
  - its entry titles are `<h2>`.
- All other sections render as `<section aria-labelledby>` with an `<h2>`, and their entry titles are `<h3>`.
- A page with no lead section therefore has an h1, then h2 sections, then h3 entries.
- Section components take a `headingLevel` prop (2 or 3) for their entry titles. Each sets its own heading tag from that prop.
- A lead section is still wrapped in an element with `id="{section.id}"`, so `/experience/#experience` resolves. It has no `aria-labelledby`.
- The page itself is `<article aria-labelledby="page-heading">`, with the `<h1 id="page-heading" tabindex="-1">`.

### 5.7 Not found (REQ-875, REQ-876)
- REQ-875: Rendered when `resolveRoute()` returns `kind: 'not-found'`:
  - `<h1>` "Page not found";
  - one paragraph, "There is no page at this address.";
  - a `<ul>` of links to Home and to each page in `getPages()`, labeled with `page.label`.

  The header and footer render as usual. No nav item is `aria-current`.
- REQ-876: The document title is `Page not found | {profile.name}`, with `<meta name="robots" content="noindex">`, both from `getHead()`.

---

## 6. Global layout and navigation (REQ-840 to REQ-849)

- REQ-840: **Header** (`<header id="top">`, one per page):
  - **not sticky** (`position: static`);
  - bottom border `var(--color-border)`.

  Contents:
  - left: `profile.name` as a link to Home (`getHomeHref()`), with `aria-current="page"` when on Home;
  - right: `<nav aria-label="Primary">` holding a `<ul>` of links, one per `getPages()` entry, using `page.label`;
  - then `ThemeToggle`, if `site.themeToggle`.

  Why not sticky: pages are now short, the footer repeats the navigation, and a non-sticky header removes the "focus obscured" risk and the double-row sticky height on phones.
- REQ-841: The current page's nav link has `aria-current="page"`. Its visual style is `var(--color-text)` with a 2px underline in `var(--color-accent)`, using `text-underline-offset`. Other links use `var(--color-text-muted)` and turn `var(--color-text)` on hover. It is never color-only: the current link is always underlined. On Not found, no link is current.
- REQ-842: **Mobile (below 768 px):** the header has two rows.
  - Row 1: the name on the left, the toggle on the right.
  - Row 2: the nav, full width, with its links spaced evenly (`justify-content: space-between` or equal flex). Each link is at least `var(--target-min)` tall, at `--text-sm` or larger. Links may wrap at 320 px with a 24 px root font, but must never scroll horizontally.

  There is **no menu button and no disclosure**. At `md` (768 px) and up, everything sits on one row.
- REQ-843: **Footer** (`<footer>`, every page), top to bottom:
  1. `<nav aria-label="Footer">` with links to Home and each page, using `aria-current="page"` the same way as the header;
  2. the contact links (all of `getLinks()`, icon plus text);
  3. "Resume (PDF)" as a text link, if `resumeUrl` is set;
  4. "© {year} {profile.name}";
  5. "Back to top", linking to `#top`.
- REQ-844: **Internal links.** Every link to a site page renders through the frontend `Link` component (section 12.3). It produces a normal `<a href="{absolute-with-base}">`, so the link works without JS, opens in a new tab with Cmd/Ctrl-click or middle-click, and copies correctly. Client-side navigation happens only on a plain primary-button click with no modifier keys, on a same-origin URL whose route `resolveRoute()` recognizes, and when the link has no `target` or `download` attribute.
- REQ-845: Hash links within the current page (`#top`, `#main`, `#contact` on About) are not routed. They behave as native anchors: the router does not intercept the click and does not move focus, so for example "Back to top" leaves focus where the browser puts it. When a hash change produces a same-path `popstate`, the router scrolls to the target. If an element `#{id}-heading` exists, focus moves to it with `preventScroll: true`. Otherwise focus is left alone. (Amended 2026-11-10: this replaces a reference to a nonexistent section 8.4.)
- REQ-846: The resume PDF, external links and `mailto:` links follow v1 3.5 (REQ-090). The router never intercepts them.
- REQ-847: `scroll-padding-top: var(--space-4)`. With no sticky header, this only adds breathing room above anchored headings.
- REQ-848: There is no scroll-spy. `useActiveSection` and the v1 `scrollToSection` are deleted.
- REQ-849: The skip link stays the first tab stop and targets `#main` on every page.

---

## 7. Head, SEO and sharing per page (REQ-880 to REQ-889)

The backend owns **one function, `getHead(route)`, in `src/lib/content`**. The build plugin uses it for static HTML and the frontend uses it on client navigation, so the two can never disagree.

| Route | `title` | `description` | `canonical` | `robots` |
| :- | :- | :- | :- | :- |
| Home | `{name} \| {headline}` (or `site.title` if headline is a placeholder): unchanged from v1 | `site.description` | `site.siteUrl` | `index` |
| Page | `{page.label} \| {profile.name}`, e.g. "Experience \| Andrew Leick" | `page.description` | `{siteUrl}{page.path}`, e.g. `https://andrew-leick.github.io/experience/` | `index` |
| Not found | `Page not found \| {profile.name}` | `site.description` | `null` (no canonical tag) | `noindex` |

- REQ-880: The static HTML for each route contains:
  - `<title>`;
  - `meta description`;
  - `link canonical`, when non-null;
  - `meta robots` (only emitted when `noindex`);
  - `og:title`, `og:description` and `og:url` (= canonical; omitted for not-found);
  - `twitter:title` and `twitter:description`;
  - the shared tags from v1: `og:type`, `og:locale`, `og:site_name`, `og:image*`, `twitter:card`, `twitter:image*`.

  `og:title` and `twitter:title` equal `title`; `og:description` and `twitter:description` equal `description`. The JSON-LD `Person` block is emitted on **Home only**.
- REQ-881: On every client-side route change, the frontend updates these in place:
  - `document.title`;
  - the `content` of `meta[name="description"]`, `meta[property="og:title"]`, `meta[property="og:description"]`, `meta[property="og:url"]`, `meta[name="twitter:title"]` and `meta[name="twitter:description"]`;
  - the `href` of `link[rel="canonical"]`.

  It adds or removes `link[rel="canonical"]`, `meta[property="og:url"]` and `meta[name="robots"]` as `getHead()` requires. It never creates duplicates.
- REQ-882: `sitemap.xml` lists Home plus every page URL from `getPages()`, absolute, with trailing slashes. It never lists `404.html`.
- REQ-883: `robots.txt` is unchanged.
- REQ-884: `site.description` and every `page.description` are 50 to 160 characters, enforced by validation.
- REQ-885: Titles are at most 70 characters. Validation warns if a composed page title exceeds 70.

---

## 8. Focus, scroll and announcement on route change (REQ-900 to REQ-909)

- REQ-900: **Initial load:**
  - focus is not moved;
  - if the URL has a hash that matches an element id, the router scrolls that element into view after first render (instantly, no smooth scroll) and does not move focus.
- REQ-901: **Client-side navigation to a new page (push)**, in this order:
  1. render the new page;
  2. update the head (REQ-881);
  3. scroll to the top of the page, or to the hash target if the URL has one;
  4. move focus to the page `<h1>` (`#page-heading`, `tabindex="-1"`), or to the hash target's heading when a hash is present (for example `#contact-heading`), using `focus({ preventScroll: true })`.

  On Home, focus goes to `#hero-name`, which also has `tabindex="-1"`. The focused heading must show no focus ring when focused programmatically: it is not `:focus-visible`, and the heading gets `outline: none` only for `[tabindex="-1"]:focus:not(:focus-visible)`.
- REQ-902: **Back and forward (popstate):**
  - render the page and update the head;
  - restore the scroll position saved for that history entry (best effort; top if unknown);
  - move focus to the page `<h1>` with `preventScroll: true`.

  Implementation:
  - set `history.scrollRestoration = 'manual'`;
  - before each push, save `{ key, scrollY }` for the current entry, where `key` is stored in `history.state`;
  - keep the positions in an in-memory `Map` (not `sessionStorage`).
- REQ-903: **Announcement.** A screen reader announces the new page because the title updates first and focus lands on the `<h1>`. We do not add a separate `aria-live` route announcer, because that would announce twice. QA verifies with VoiceOver and Safari (QA-871). If any tested pair announces nothing, planner will amend the spec to add a visually hidden `aria-live="polite"` announcer that reads `document.title`.
- REQ-904: Same-page link clicks (clicking "Experience" while on `/experience/`) do not push a new history entry. They scroll to the top and focus the `<h1>`.
- REQ-905: Smooth scrolling is never used for route changes. Hash links within a page use smooth scrolling only under `prefers-reduced-motion: no-preference` (v1 REQ-306).
- REQ-906: **Path normalization** (see also REQ-806). On load, if `resolveRoute()` returns a `canonicalPath` different from the current path, the router calls `history.replaceState` to the canonical path, keeping the hash. This covers a missing trailing slash and a trailing `index.html`.

---

## 9. Visual design additions

These are all frontend tokens, added to `tokens.css`. They are theme-independent. **No new colors.**

```css
--text-display: clamp(2.75rem, 1.8rem + 4.5vw, 5rem);   /* Home h1 (name) */
--text-page-title: var(--text-4xl);                       /* subpage h1 */
--explore-index-col: var(--space-12);
```

Visual treatment, staying black and white and typography-led:
- **Home.** A large, tight-tracked name (`--tracking-tight`, `--leading-tight`). The hero is left-aligned, not centered: it scans better and matches the index list below it. The Explore list is a ruled typographic index: numbers, big labels, muted descriptions, arrows. There are no cards, shadows or images. The only "visual" is the type scale and 1px rules. This is the intended aesthetic.
- **Subpages.** The h1 at `--text-page-title` with `margin-block: var(--space-12) var(--space-8)`, then the content. The vertical rhythm between sections is `--section-gap`, as in v1.
- **Unchanged:**
  - the theme files and all semantic color tokens;
  - QA-203 grep discipline (no literal colors or font sizes in components or base.css);
  - print styles. Print hides the header nav, the footer nav and the toggle. The Explore list prints as plain text with URLs.

---

## 10. Data model and content API changes (backend)

### 10.1 Summary
| Change | Where |
| :- | :- |
| `site.sections` is replaced by `site.pages` | `src/data/site.json`, validator, normalizer |
| New getters: `getPages`, `getPage`, `getHomeHref`, `resolveRoute`, `getHead`, `getSectionHref` | `src/lib/content/index.js` plus new `routes.js` and `head.js` |
| `getSections()` kept for compatibility. It returns all placed sections across pages, in page order, each now with `pageId` and `href` | `normalize.js` |
| Teaser derivation per page | `normalize.js` |
| Page-aware validation rules | `validate.js` |
| CONTENT-GUIDE: a new "Pages and navigation" section | `docs/CONTENT-GUIDE.md` |

### 10.2 `site.json` `pages` schema (REQ-920 to REQ-924)
| Field | Type | Req | Rules |
| :- | :- | :- | :- |
| `pages` | array | yes | 1 to 6 items, in display order |
| `pages[].id` | string | yes | kebab-case, unique. Must not be one of `assets`, `content`, `index`, `404`. Must not equal the name of a top-level file or folder in `public/`. Becomes the URL path `{id}/` |
| `pages[].label` | string | yes | at most 20 characters. Used for nav, h1, Explore row and title |
| `pages[].blurb` | string | yes | at most 100 characters. Muted line on the Home Explore row |
| `pages[].description` | string | yes | 50 to 160 characters. Meta description |
| `pages[].teaser` | string \| null | no | at most 100 characters. Overrides the derived teaser. `null` or omitted means derive it |
| `pages[].visible` | boolean | no | default `true` |
| `pages[].sections` | array | yes | 1 or more `{ id, label, visible? }`. `id` comes from the fixed v1 set (`about`, `experience`, `projects`, `education`, `skills`, `contact`). Each section id appears **at most once across all pages**. `label` is at most 20 characters |

Validator messages (REQ-111 format):
- `site.sections` present: error, "`sections` moved into `pages[].sections` in v2", hint "see CONTENT-GUIDE 'Pages and navigation'".
- A section id used twice across pages: error naming both locations.
- A section id from the fixed set that appears on no page: **warning**, "section "skills" is not on any page, so it will not be shown".
- Unknown keys: suggestions, as in v1.

Default `site.json` `pages`:
- `label` and `sections` are structural.
- `blurb` is UI copy.
- `description` only restates CONTENT-FACTS. Backend may tighten the wording, but must not add facts.

```json
"pages": [
  {
    "id": "experience",
    "label": "Experience",
    "blurb": "Internships, research and leadership.",
    "description": "Andrew Leick's experience: two Software Development Engineer internships at Amazon, research at Georgia Tech Research Institute, and FIRST Robotics.",
    "visible": true,
    "sections": [{ "id": "experience", "label": "Experience" }]
  },
  {
    "id": "projects",
    "label": "Projects",
    "blurb": "Things I have built.",
    "description": "Projects by Andrew Leick, a Stanford Electrical Engineering student, with code links and his role on each.",
    "visible": true,
    "sections": [{ "id": "projects", "label": "Projects" }]
  },
  {
    "id": "about",
    "label": "About",
    "blurb": "Background, education, skills and contact.",
    "description": "About Andrew Leick: Stanford Electrical Engineering student, his coursework, technical skills, and how to get in touch.",
    "visible": true,
    "sections": [
      { "id": "about", "label": "About" },
      { "id": "education", "label": "Education" },
      { "id": "skills", "label": "Skills" },
      { "id": "contact", "label": "Contact" }
    ]
  }
]
```
Backend checks each description against REQ-884 (50 to 160 characters) and adjusts the wording if needed, without adding facts.

### 10.3 Filtering rules (REQ-925)
1. A section is **placed** if it is listed on a page, its `visible` is not `false`, and it has content (the v1 `deriveSections` rules).
2. A page is **shown** if `visible !== false` and it has at least one placed section.
3. `index` ("01", "02", …) is assigned to shown pages after filtering.
4. A page that is not shown:
   - is absent from `getPages()`;
   - resolves to `not-found`;
   - is not emitted as HTML;
   - is not listed in the sitemap.

### 10.4 Public API additions (`src/lib/content/index.js`) (REQ-926)
All synchronous, pure and frozen, like v1. `BASE_URL` comes from `paths.js`.

```js
export function getPages()                 // -> Page[]   shown pages, site.json order
export function getPage(id)                // -> Page | null
export function getHomeHref()              // -> string   BASE_URL, e.g. "/" or "/personal-website/"
export function getSectionHref(sectionId)  // -> string | null   e.g. "/about/#contact"; null if not placed
export function resolveRoute(pathname)     // -> Route
export function getHead(route)             // -> Head
// kept: getSite, getProfile, getLinks, getExperience, getEducation, getProjects, getSkills,
//       getSections (now: all placed sections, page order), getSiteContent (now also has `pages`),
//       isPlaceholder, formatDateRange, formatMonth
```

Typedefs (add to `types.js`):

```js
/** @typedef {{ id: string, label: string, index: string,
 *   pageId: string, href: string, lead: boolean }} Section
 *   // index: "01", "02", ... across all placed sections in page order (kept from v1; v2 UI does not render it)
 *   // href: page.href + '#' + id ; lead: id === pageId */

/** @typedef {{ id: string, path: string,        // "experience/" (no leading slash, trailing slash)
 *   href: string,                                // BASE_URL + path, e.g. "/experience/"
 *   label: string, blurb: string, description: string,
 *   teaser: string|null, index: string,          // "01", "02", ... among shown pages
 *   sections: Section[], hasLead: boolean }} Page */

/** @typedef {{ kind: 'home'|'page'|'not-found', page: Page|null,
 *   canonicalPath: string|null }} Route
 *   // canonicalPath: the normalized full pathname (with base) the router should show,
 *   //   e.g. "/experience/" for input "/experience" or "/experience/index.html"; null for not-found */

/** @typedef {{ title: string, description: string, canonical: string|null,
 *   robots: 'index'|'noindex', jsonLd: object|null }} Head
 *   // jsonLd: the Person object on home, null elsewhere */
```

`resolveRoute(pathname)` rules (REQ-806):
- The input is `location.pathname`, which includes the base.
- Strip `BASE_URL`. A pathname outside the base is `not-found`.
- Strip a trailing `index.html`.
- The empty remainder is `home`.
- `{id}` or `{id}/` for a shown page id is `page`.
- Anything else, including deeper paths like `/experience/foo/`, is `not-found`.
- Matching is case-sensitive. Ids are lowercase by validation.

The plugin calls the same logic with an explicit base (export `resolveRouteWithBase(pathname, base, content)` from `routes.js`; `index.js` binds it to `BASE_URL`).

`getHead(route)` implements the table in section 7. The JSON-LD Person logic moves from the plugin into `head.js` unchanged, so the plugin only serializes.

### 10.5 Teaser derivation (REQ-927)
`page.teaser` is the override, if set. Otherwise it is the first non-null value from the page's placed sections, in order:

| Section | Derived teaser |
| :- | :- |
| `experience` | `"{role}, {organization}"` of the first (newest) entry, e.g. "Software Development Engineer Intern, Amazon" |
| `projects` | Titles of up to 2 featured projects, joined with `" · "`. If none are featured, the first 2 projects. Prefix `"Featured: "` only when they are featured projects |
| `education` | `"{degreeLabel}, {institution} · {dateLabel}"` of the first entry, e.g. "B.S. Electrical Engineering, Stanford University · Expected Jun 2028" |
| `skills` | The first 4 items of the first group, joined with `", "` |
| `about`, `contact` | `null` |

Any candidate that contains a placeholder (`isPlaceholder`) is skipped, and the next section is tried. With today's data the teasers are:
- Experience: "Software Development Engineer Intern, Amazon"
- Projects: "Featured: NFL Play Reconstruction"
- About: "B.S. Electrical Engineering, Stanford University · Expected Jun 2028"

### 10.6 Tests (backend, vitest)
Unit tests for:
- `resolveRoute`, covering every rule in 10.4, with base `/` and base `/personal-website/`;
- `getHead`, for all three route kinds;
- teaser derivation, including placeholder skipping and the override;
- page filtering (10.3);
- `getSectionHref`;
- each new validator rule.

---

## 11. Build, plugin, scripts (backend) (REQ-940 to REQ-949)

- REQ-940: After `vite build`, `dist/` contains:
  - `index.html` (Home head);
  - `{pageId}/index.html` for every shown page;
  - `404.html`;
  - `robots.txt`;
  - `sitemap.xml`;
  - `CNAME` (custom domain only, as v1).

  Each route HTML is byte-identical to `dist/index.html` except for the head block produced by `getHead()`. That includes the same asset tags, theme bootstrap script and noscript content. Recommended implementation: in `writeBundle`/`closeBundle`, read the built `dist/index.html` and write per-route copies with the head block swapped. Wrap the injected head between `<!-- content:head:start -->` and `<!-- content:head:end -->` comments so the swap is exact. Those comments are allowed in output. The v1 rule "no leftover markers" applies to the unexpanded `<!-- content:head -->` and `<!-- content:noscript -->` markers only.
- REQ-941: All asset URLs in emitted HTML are absolute with the Vite base, so they resolve from `/experience/` and from `404.html` at any depth. Vite does this by default. Verify it, and do not use `base: './'`.
- REQ-942: `404.html` gets the not-found head, including `<meta name="robots" content="noindex">`, and the same app bundle. On GitHub Pages it is served for any unknown path, and the router renders Not found.
- REQ-943: The noscript block adds links to each shown page (absolute with base) under the existing resume and links list. The heading sentence stays the same.
- REQ-944: `sitemap.xml` per REQ-882.
- REQ-945: New script `check:routes` (`node scripts/check-routes.mjs`), added to `ci` after `build`. It checks:
  - every shown page has `dist/{id}/index.html`;
  - each route file's `<title>` and canonical match `getHead()`;
  - `dist/404.html` has `noindex`;
  - the sitemap URLs equal the set of Home plus page URLs;
  - no file contains a leftover unexpanded marker.

  It exits 1 on any mismatch, with one line per problem.
- REQ-946: Dev: `transformIndexHtml(html, ctx)` resolves `ctx.originalUrl` (path only, query stripped) with `resolveRouteWithBase` and injects that route's head. With invalid content, it keeps the v1 "Content error" behavior.
- REQ-947: `check:links` replaces the v1 "nav anchors" check with these checks:
  - every `getPages()` href and every `getSectionHref()` resolves via `resolveRoute`;
  - any `#anchor` used in data points to a placed section.
- REQ-948: `check:size` is unchanged. The budget is still at most 90 KB gzip JS. The frontend router plus pages should add about 3 KB or less.
- REQ-949: CI and deploy workflows are unchanged, except that `ci` now includes `check:routes`. Deploy still runs `validate:strict`, so placeholders still block deploy. That is unchanged and stays open.

---

## 12. File ownership and task breakdown

### 12.1 Ownership (REQ-700, carried from v1 7.1; each path has exactly one owner)
| Path | Owner | v2 notes |
| :- | :- | :- |
| `src/data/**` | backend | `site.json` migrates `sections` to `pages` |
| `src/lib/content/**` | backend | new `routes.js` and `head.js`, plus tests |
| `scripts/**` | backend | plugin per-route emit; new `check-routes.mjs` |
| `vite.config.js` | backend | no change expected |
| `package.json`, `package-lock.json` | backend | adds the `check:routes` script and adds it to `ci`. **No dependencies** |
| `.oxlintrc.json`, `.gitignore`, `.nvmrc`, `.github/**` | backend | |
| `README.md`, `docs/CONTENT-GUIDE.md` | backend | add "Pages and navigation"; update the scripts table |
| `public/content/**` | backend | no change (resume PDF issue stays open) |
| `index.html` | frontend | markers unchanged. No hardcoded SEO tags. Do **not** add a `public/404.html`: the plugin emits it |
| `src/main.jsx`, `src/App.jsx` | frontend | App becomes the route switch |
| `src/router/**` (new) | frontend | `useRoute.js`, `navigate.js`, `Link.jsx`, `useRouteEffects.js` (head, scroll, focus) |
| `src/pages/**` (new) | frontend | `HomePage.jsx`, `ContentPage.jsx` (generic page from `Page`), `NotFoundPage.jsx`, plus CSS modules |
| `src/components/**` | frontend | new `Explore`; changed `SiteHeader`, `Nav`, `SiteFooter`, `Section`, section bodies (`headingLevel`), `Projects` (REQ-866, REQ-867), `Icon` (`arrow-right`); delete `Nav/scrollToSection.js` |
| `src/hooks/**` | frontend | delete `useActiveSection.js` |
| `src/styles/**` | frontend | the tokens in section 9 |
| `public/**` except `public/content/**` | frontend | |
| `docs/spec/**` | planner | |
| `docs/handoff/backend-status-v2.md` | backend | new file. Leave the v1 reports untouched |
| `docs/handoff/frontend-status-v2.md` | frontend | new file |
| `docs/qa/**` (v2 report: `docs/qa/REPORT-v2.md`) | qa | new file; no copy needed under `docs/handoff/` |

Rules carried from v1:
- the frontend imports content only from `src/lib/content/index.js` (REQ-701);
- the backend writes no JSX or CSS, and the frontend writes nothing in `src/data` or `src/lib`;
- no new runtime dependencies (REQ-405);
- nobody commits or pushes.

When you need something changed in a file the other side owns, message that owner. Also list the request in your hand-off.

### 12.2 Backend tasks
- **BV1. API and data first (unblocks frontend):**
  - section 10.2 `site.json` migration;
  - 10.3 filtering;
  - 10.4 getters and typedefs;
  - 10.5 teasers;
  - `getSiteContent()` gains `pages`.

  Message `frontend` the moment `getPages`, `resolveRoute` and `getHead` exist.

  **AC:** shapes match 10.4; current data yields the three teasers in 10.5; `npm test` passes.
- **BV2. Validator** (10.2 rules). **AC:** each new rule has a failing fixture, and the messages follow the v1 6.11 format.
- **BV3. Plugin.** REQ-940 to REQ-944 and REQ-946; JSON-LD on Home only. **AC:** QA-840 to QA-846 pass locally.
- **BV4. `check:routes` and `check:links` updates.** REQ-945 and REQ-947; `ci` includes `check:routes`.
- **BV5. Tests** (10.6).
- **BV6. Docs.** Add CONTENT-GUIDE "Pages and navigation", with copy-paste examples for each of these:
  - rename a page label;
  - reorder the pages;
  - hide a page;
  - move Skills to its own `/skills/` page;
  - change a Home blurb or override a teaser.

  Also update the README scripts table.

### 12.3 Frontend tasks
- **FV1. Router** (`src/router/`):
  - `useRoute()` uses `useSyncExternalStore` over `popstate` plus a custom `navigate` event, and returns `{ route, hash }`, where `route` comes from `resolveRoute(location.pathname)`;
  - `navigate(href, { replace })`;
  - `Link` per REQ-844;
  - effects per section 8, plus REQ-906.

  If needed before BV1 lands, a temporary fixture in `src/components/__dev__/` is allowed and must be deleted before hand-off (v1 7.6).
- **FV2. App shell:**
  - `App.jsx` switches on `route.kind`;
  - header per REQ-840 to REQ-842, with the mobile disclosure removed;
  - footer per REQ-843;
  - delete `useActiveSection` and `scrollToSection`.
- **FV3. Home:** hero changes and the Explore index (REQ-820 to REQ-829), the section 9 tokens, and the `arrow-right` icon.
- **FV4. Content pages:**
  - generic `ContentPage` with the 5.6 heading rule and a `headingLevel` prop on section bodies;
  - Experience, Projects (including REQ-866 and REQ-867), About (including the Resume button in Contact, REQ-874).
- **FV5. Not found** (REQ-875).
- **FV6. Head sync** (REQ-881).
- **FV7. Passes:**
  - responsive (320 to 2560 on every page);
  - accessibility (axe on every page, both themes);
  - performance (`check:size`).

  Report the results in `frontend-status-v2.md`.

---

## 13. Requirements (v2)

| ID | Requirement |
| :- | :- |
| REQ-800 | Routes are Home `/`, `/{pageId}/` for each shown page, and Not found. All are relative to `BASE_URL`. |
| REQ-801 | Routing uses the History API (pushState/popstate) with no runtime dependency and no hash routing. |
| REQ-802 | Every internal page link is a real `<a href>` that works without JS and in a new tab (REQ-844). |
| REQ-803 | Client-side navigation does not reload the document. The theme state and the toggle persist across navigations. |
| REQ-804 | Back and forward move between visited pages and update content, head, scroll and focus (REQ-902). |
| REQ-805 | Unknown paths render Not found (REQ-875) on the client and via `dist/404.html` on the host. |
| REQ-806 | `resolveRoute` normalization: a missing trailing slash and `index.html` resolve to the page; `canonicalPath` drives `replaceState` (REQ-906). |
| REQ-820 to REQ-829 | Home (section 5.2). |
| REQ-840 to REQ-849 | Header, nav, footer, internal links (section 6). |
| REQ-860 to REQ-862 | Experience page (5.3). |
| REQ-865 to REQ-868 | Projects page (5.4), including the single-column rule and hiding zero stars. |
| REQ-870 to REQ-874 | About page (5.5). |
| REQ-875, REQ-876 | Not found page (5.7). |
| REQ-877 | The heading rule in 5.6: one h1 per page; no skipped levels; the lead section has no h2. |
| REQ-880 to REQ-885 | Per-page head, sitemap, description and title limits (section 7). |
| REQ-900 to REQ-906 | Focus, scroll and announcement (section 8). |
| REQ-920 to REQ-924 | The `site.pages` schema and validation (10.2). |
| REQ-925 | Page and section filtering (10.3). |
| REQ-926 | Content API additions and shapes (10.4). |
| REQ-927 | Teaser derivation (10.5). |
| REQ-928 | Moving a section between pages, renaming, reordering or hiding a page is a single edit to `site.json`, with no component changes. |
| REQ-940 to REQ-949 | Build output, plugin, scripts (section 11). |
| REQ-960 | Lighthouse mobile on each of `/`, `/experience/`, `/projects/` and `/about/`: Performance at least 95, Accessibility 100, Best Practices at least 95, SEO 100. axe reports 0 violations on each page plus Not found, in both themes. |
| REQ-961 | No horizontal scroll at 320 to 2560 px on every page, including at a 24 px root font and 200% zoom (v1 REQ-210 and REQ-211, applied per page). |
| REQ-962 | All v1 accessibility requirements REQ-300 to REQ-308, REQ-310 and REQ-311 hold on every page. The exceptions are those retired in section 14. |

---

## 14. v1 requirements superseded or retired

| v1 | Status in v2 |
| :- | :- |
| REQ-001 (section order from `site.sections`) | **Superseded** by REQ-920 to REQ-925 (`site.pages`). |
| REQ-002 (empty section hidden from page and nav) | **Kept**, extended by REQ-925: an empty page is hidden too. |
| REQ-010 | **Superseded** by REQ-820 (display size; location already overridden by CONTENT-FACTS). |
| REQ-013 (hero above the fold) | **Superseded** by REQ-828. |
| REQ-020, REQ-021, REQ-022, REQ-023 (section nav, mobile menu disclosure, scroll-to-section, scroll-spy) | **Retired.** Replaced by REQ-840 to REQ-848. |
| REQ-024 (scroll-padding for a sticky header) | **Superseded** by REQ-847 (no sticky header). |
| REQ-030, REQ-040 to REQ-043, REQ-060, REQ-070, REQ-080 to REQ-082 | **Kept**, with entry heading levels from 5.6 (h2 or h3 instead of always h3). |
| REQ-050 | **Amended** by REQ-866 (a single project gets one column). |
| REQ-051 | **Amended** by REQ-867 (no "★" when stars = 0). |
| REQ-303 (landmarks) | **Amended.** Each page has one banner, `nav[aria-label=Primary]`, main and contentinfo. The footer adds `nav[aria-label=Footer]`. Subpage non-lead sections use `aria-labelledby`. |
| REQ-304 (tab order header → hero → sections → footer) | **Amended**: header → main content in DOM order → footer, on every page. |
| REQ-309 (mobile menu) | **Retired.** There is no menu. |
| v1 4.7 numbered eyebrows above every h2 | **Retired** on subpages. Numbers appear only in the Home Explore index. |
| REQ-500 (one title) | **Superseded** by section 7 (Home title unchanged). |
| REQ-501 (one canonical) | **Superseded** by section 7. |
| REQ-503 (JSON-LD) | **Kept**, emitted on Home only. |
| REQ-504 (sitemap with a single URL) | **Superseded** by REQ-882. |
| REQ-505 (noscript) | **Kept**, extended by REQ-943. |
| REQ-703 (markers) | **Kept.** The `content:head:start`/`end` comments in output are allowed (REQ-940). |
| All other v1 REQs | **Unchanged.** This includes REQ-090, REQ-101, REQ-110 to REQ-114, REQ-200 to REQ-213, REQ-300 to REQ-308, REQ-310, REQ-311, REQ-400 to REQ-405, REQ-600 to REQ-602 and REQ-700 to REQ-702. |

---

## 15. QA test plan

### 15.1 Setup and reporting
- QA runs against the working tree after both builders report done:
  - `npm ci`;
  - `npm run ci`, which now includes `check:routes`;
  - `npm run preview`;
  - `npm run dev` for the dev-only tests.
- Use headless Chrome over CDP as in v1, with axe-core and Lighthouse installed **outside the repo**.
- Test both themes wherever a test says so.
- Record results in `docs/qa/REPORT-v2.md`. For each test, give its ID, pass or fail, the evidence and the REQ IDs it covers. Use the same defect table format as v1 (D-xx with an owner).
- Revert every test edit and prove the reverts with a baseline diff, as in v1.

### 15.2 Build and routing output
| ID | Test | Covers |
| :- | :- | :- |
| QA-800 | `npm run ci` exits 0 (lint, test, validate, build, check:size, check:routes). | REQ-945, REQ-949 |
| QA-801 | `package.json` `dependencies` are still only `react` and `react-dom`. There is no router package. | REQ-801, REQ-405 |
| QA-802 | `ls dist`: `index.html`, `experience/index.html`, `projects/index.html`, `about/index.html`, `404.html`, `robots.txt`, `sitemap.xml`. | REQ-940 |
| QA-803 | `diff` of `dist/index.html` against each route file: only the head block differs. Asset `src`/`href` values are absolute (start with the base). | REQ-940, REQ-941 |
| QA-804 | Build with `BASE_PATH=/personal-website/` and `siteUrl` set to match (temporary edit, then revert). Run `npx vite preview --base /personal-website/` and load `/personal-website/experience/`: assets load, the page renders, and nav hrefs carry the base. | REQ-800, REQ-941 |

### 15.3 Navigation and router behavior (preview, both themes)
| ID | Test | Covers |
| :- | :- | :- |
| QA-810 | From Home, click each Explore row and each header nav link. Check:<br>- the URL changes to `/{id}/`;<br>- no full reload: a `window.__probe` value set before the click survives;<br>- the right page renders;<br>- `aria-current="page"` is on the right header and footer links. | REQ-801, REQ-803, REQ-841 |
| QA-811 | Load each URL fresh (`/`, `/experience/`, `/projects/`, `/about/`, `/about/#contact`). Each renders the right page. `#contact` is scrolled into view, and focus is not moved on initial load. | REQ-800, REQ-900 |
| QA-812 | Back and forward through Home → Projects → About: content, title and `aria-current` follow. Scroll position is restored when going back (scroll Home down 600 px first). | REQ-804, REQ-902 |
| QA-813 | Cmd/Ctrl-click and middle-click on an Explore row and a nav link open a new tab at the right URL. The current tab does not navigate. The link `href` is visible on hover. | REQ-802, REQ-844 |
| QA-814 | Load `/experience` (no slash) and `/experience/index.html` in dev or preview. The page renders, and the address bar shows `/experience/` with no extra history entry. | REQ-806, REQ-906 |
| QA-815 | Load `/nope/` and `/experience/foo/`. Not found renders with the h1, the paragraph and links to Home plus each page. The title is "Page not found \| Andrew Leick" and `meta robots` is `noindex`. No nav link is current. | REQ-805, REQ-875, REQ-876 |
| QA-816 | Clicking "Experience" while on `/experience/` scrolls to the top and focuses the h1. `history.length` does not grow. | REQ-904 |
| QA-817 | Toggle the theme to dark on Home, navigate to Projects and back. The theme stays dark and the toggle label is correct. Reload on `/about/`: still dark, with no flash (v1 QA-202 method). | REQ-803, REQ-204, REQ-205 |
| QA-818 | External links, the resume PDF and `mailto:` are not intercepted. They behave per v1 QA-019. | REQ-846 |
| QA-819 | No console errors or warnings on any route, in dev or preview. | general |

### 15.4 Page content
| ID | Test | Covers |
| :- | :- | :- |
| QA-820 | Home:<br>- the h1 is the name, at the display size;<br>- headline, summary and availability line;<br>- action row;<br>- "Explore" h2;<br>- three rows in `site.pages` order, each with index, label (h3), blurb, teaser and arrow;<br>- exactly one `<a>` per row, with no nested interactive elements (DOM inspection). | REQ-820 to REQ-826 |
| QA-821 | The teasers equal the 10.5 expected strings for the current data. Set `pages[1].teaser` to a test string and that string shows. Make the first experience role a `TODO:` value (temporary): the Experience teaser falls through to `null` and the line disappears. Revert both. | REQ-927 |
| QA-822 | Above the fold at 390x844, 1366x768 and 1440x900, per REQ-828. Screenshots in both themes. | REQ-828 |
| QA-823 | Experience page: h1 "Experience", entries as `<h2>`, no section h2, v1 entry content (QA-014 checks) intact, no location shown. | REQ-860 to REQ-862, REQ-877 |
| QA-824 | Projects page: h1, card titles `<h2>`. With 1 project, single column at 1024 and 1440 widths. Add a second project (temporary): 2 columns at 768 and up. The NFL card shows no "★ 0" but shows the language. Set stars to 3 in a temp `github.json`: "★ 3" appears. Revert. | REQ-865 to REQ-868 |
| QA-825 | About page:<br>- h1 "About", bio paragraphs with no h2;<br>- then h2 Education, Skills, Contact with `aria-labelledby`, entry h3s;<br>- GPA shown;<br>- Contact has the mailto, Copy email (v1 QA-018 checks), the links list and "Resume (PDF)". | REQ-870 to REQ-874, REQ-877 |
| QA-826 | Header and footer on every page match REQ-840 and REQ-843. The header is not sticky (scroll down; it scrolls away). "Back to top" goes to `#top`. | REQ-840, REQ-843 |

### 15.5 Data-driven pages (maintainability promise)
| ID | Test | Covers |
| :- | :- | :- |
| QA-830 | Move `skills` out of `about` into a new page `{ id: "skills", label: "Skills", blurb, description, sections:[{id:"skills",label:"Skills"}] }`. With dev running:<br>- a 4th Explore row and nav link appear;<br>- `/skills/` renders with "Skills" as h1 and groups as h2;<br>- About no longer shows Skills.<br><br>Then `npm run build`: `dist/skills/index.html` exists and the sitemap lists it. `git diff --stat` shows only `site.json`. Revert. | REQ-920, REQ-925, REQ-928, REQ-940 |
| QA-831 | Reorder the pages in `site.json`: header, footer and Explore order change, and the indices renumber. Set `projects` `visible:false`: the row and links disappear, `/projects/` shows Not found, and the build emits no `dist/projects/`. Revert. | REQ-925, REQ-827 |
| QA-832 | Rename the label "About" to "About me": the nav, h1, Explore row and `<title>` update. Revert. | REQ-928, REQ-880 |
| QA-833 | Validator. One case at a time:<br>- (a) put `site.sections` back;<br>- (b) list `skills` on two pages;<br>- (c) page id `assets`;<br>- (d) description of 30 characters;<br>- (e) typo `blrub`;<br>- (f) remove `contact` from all pages.<br><br>For (a) to (e), `validate` exits 1 with a v1 6.11-format message and a hint, and the dev overlay shows it. For (f), it prints a warning only. Revert each. | REQ-920 to REQ-924, REQ-110, REQ-111 |
| QA-834 | v1 QA-100 to QA-104 still pass: add, edit, hide and feature entries, each a single-file edit. They now show on their subpage, and the Home teasers update where relevant (for example, a newer experience changes the Experience teaser). | REQ-101, REQ-927 |

### 15.6 Head and SEO
| ID | Test | Covers |
| :- | :- | :- |
| QA-840 | For each `dist/**/index.html` and `404.html`, `<title>`, description, canonical, robots, og:title/description/url and twitter:title/description equal the section 7 table. JSON-LD appears only in `dist/index.html`, is valid JSON and contains no TODO. | REQ-880, REQ-503 |
| QA-841 | After client navigation to each page, `document.head` holds exactly one of each tag, with the values from QA-840. After going to Not found: a `robots noindex` tag is present and the canonical is absent. Going back to Home: robots is absent or index, and the canonical is restored. | REQ-881 |
| QA-842 | `sitemap.xml` lists exactly Home and the three page URLs (absolute, trailing slash). `robots.txt` is unchanged. | REQ-882, REQ-883 |
| QA-843 | Fetch the raw HTML with `curl -s localhost:4173/projects/` (no JS): it has the Projects title and description. | REQ-880, REQ-940 |
| QA-844 | Disable JS: each route shows the noscript block with the resume, links and page links. | REQ-943 |
| QA-845 | `dist/404.html` has the not-found title and `noindex`. Serve `dist/` with a static server that serves `404.html` for misses (for example `npx serve dist` with its 404 handling, or a 10-line Node script in the QA scratch dir). `/missing/` returns status 404 and renders Not found. | REQ-942, REQ-805 |
| QA-846 | Dev server: `curl -s localhost:5173/about/` head has the About title. `curl -s localhost:5173/zzz/` head has not-found and `noindex`. | REQ-946 |

### 15.7 Accessibility, focus, responsive, performance
| ID | Test | Covers |
| :- | :- | :- |
| QA-860 | Keyboard on each page:<br>- the first Tab is the skip link, and Enter focuses `#main`;<br>- the order runs header → content → footer;<br>- every stop has a visible ring;<br>- Explore rows are single tab stops with an inset ring that is not clipped. | REQ-849, REQ-825, REQ-962 |
| QA-861 | Client navigation by keyboard (Enter on a nav link): `document.activeElement` is `#page-heading` after the change, the title updated before focus (log order), the viewport is at the top, and no focus ring is drawn on the heading. Navigating to `/about/#contact` focuses `#contact-heading`. Back focuses the h1. | REQ-901, REQ-902 |
| QA-862 | axe-core on `/`, `/experience/`, `/projects/`, `/about/` and Not found, in light and dark, at 1366 and 390: 0 violations. | REQ-960 |
| QA-863 | Lighthouse mobile and desktop on the four pages (preview, incognito): Performance at least 95, Accessibility 100, Best Practices at least 95, SEO 100; LCP at most 2.0 s, CLS at most 0.05, TBT at most 100 ms. Save the JSON in the QA scratch dir. | REQ-960, REQ-401 |
| QA-864 | Headings per page, using the accessibility tree: one h1, no skipped levels, per 5.6. Landmarks per amended REQ-303. | REQ-877, REQ-303 |
| QA-865 | Widths 320, 375, 390, 768, 1024, 1366, 1440 and 2560 on all four pages, both themes: no horizontal scroll. On mobile the header has two rows, all three nav links are visible, and there is no menu button. Each link is at least 44 px tall. A 24 px root font at 320, and 200% zoom: links may wrap, with no overflow. | REQ-842, REQ-961, REQ-212 |
| QA-866 | `check:size` passes. Report the JS delta against v1 (77.4 KB). | REQ-948, REQ-402 |
| QA-867 | Reduce motion: route changes jump, and `/about/` hash links jump. No transitions. | REQ-905, REQ-306 |
| QA-868 | Token discipline: the v1 QA-203 greps over `src/components`, `src/pages`, `src/router` and `src/styles/base.css` return nothing. | REQ-201, REQ-202 |
| QA-869 | Print preview of Home and About: the nav, footer nav and toggle are hidden, the page is light, and URLs are printed. | REQ-213 |
| QA-870 | Network: only the preview origin on every route. | REQ-403 |
| QA-871 | VoiceOver plus Safari (manual; if it cannot be run, mark it "Not run" and list it for Andrew, as in v1): a nav link click announces the new page heading. Note any pair that announces nothing, and planner will add the REQ-903 fallback announcer. | REQ-903 |

### 15.8 Ownership and process
| ID | Test | Covers |
| :- | :- | :- |
| QA-880 | Changed files are within each owner's paths (12.1). Use `git status` and `git diff --stat` against `66f76bb`. | REQ-700 |
| QA-881 | Components, pages and router import content only from `src/lib/content/index.js` (v1 QA-701 grep, extended to `src/pages` and `src/router`). `src/components/__dev__/` is absent. | REQ-701 |
| QA-882 | `useActiveSection.js` and `scrollToSection.js` are deleted, and nothing references them. There is no `public/404.html`. | REQ-848, 12.1 |
| QA-883 | No fabricated facts. Every new user-visible string is UI copy, a CONTENT-FACTS restatement or a `TODO:`. This covers blurbs, page descriptions, teasers and the not-found copy. | Hard rule |

### 15.9 Post-deploy (run once Andrew has deployed; record as "pending deploy" until then)
| ID | Test | Covers |
| :- | :- | :- |
| QA-890 | On GitHub Pages:<br>- each page URL returns 200 with its route title (`curl -sI`, `curl -s`);<br>- `/experience` redirects to `/experience/` (record the actual status);<br>- `/missing/` returns 404 with the Not found page. | REQ-800, REQ-805, REQ-806 |

### 15.10 v1 tests carried forward
Re-run these unchanged on the v2 build: QA-001 to QA-009, QA-010 to QA-012 (on Home), QA-014 to QA-019 (on their subpages), QA-100 to QA-106, QA-200 to QA-204, QA-302, QA-304, QA-401 to QA-406 (on every page), QA-502, QA-503, QA-505, QA-506, and QA-700 to QA-705.

These v1 tests are **dropped**:
- QA-012's "nav order from `site.sections`" (replaced by QA-831);
- QA-013 (replaced by QA-831);
- QA-020 (replaced by QA-810 to QA-816);
- QA-303 (no menu);
- QA-301 (replaced by QA-822);
- QA-500 and QA-501 (replaced by QA-863);
- QA-504 (replaced by QA-840).

---

## 16. Acceptance criteria (definition of done)

v2 is done when all of the following hold:
1. `npm run ci` exits 0 on a clean checkout. It includes the new `check:routes`.
2. Every QA-8xx test passes, except QA-871 and QA-890, which may be "not run" or "pending deploy" with a reason. The carried-forward v1 tests pass.
3. No open defects of medium or higher severity. Low defects are either fixed or accepted by planner in writing in the QA report.
4. `site.json` uses `pages`. CONTENT-GUIDE documents the page operations with examples that QA followed literally (QA-830 to QA-832).
5. Runtime dependencies are unchanged, and JS is at most 90 KB gzip.
6. Each owner wrote their `*-v2.md` hand-off with:
   - a task map (BVx or FVx to files and REQ IDs);
   - deviations;
   - requests for the other owner.
7. Nothing committed or pushed.
8. The launch blockers from the v1 QA report are still listed as open and are not silently changed: the resume PDF, the placeholders and the email.

---

## 17. Open items and sources

### 17.1 Still open (unchanged, for Andrew; do not resolve in v2)
- The resume PDF exposes the phone number and cities. It needs a redacted PDF, or `resumeUrl: null`.
- `TODO:` placeholders: `profile.availability` and the NFL results highlight. Deploy stays blocked by `validate:strict`.
- Confirm the public email (`aleick@stanford.edu`).
- Custom domain; hosting repo creation and Pages setup.
- NFL project course context and status; whether FIRST Robotics needs a label.
- VoiceOver pass (QA-871).

### 17.2 Sources
- [R1] wegic.ai, "Best modern portfolio website design examples": https://wegic.ai/inspiration/best-modern-portfolio-website-design-examples
- [R2] Kontra Agency, web design trends 2026 (simple navigation): https://kontra.agency/?p=7330
- [R3] Elcom, "Website design trends in 2026": https://www.elcom.com.au/resources/blog/website-design-trends-in-2026
- [R4] "15 best portfolio website examples for inspiration in 2025" (reduce navigation, typographic hierarchy): https://laptops251.com/15-best-portfolio-website-examples-for-inspiration-in-2025 ; dev.to, "How to build a frontend developer portfolio that stands out": https://dev.to/safdarali25/how-to-build-a-frontend-developer-portfolio-that-stands-out-4d3k
- [R5] dev.to, "I think we're all over-complicating personal websites in 2026": https://dev.to/dev_resources/i-think-were-all-over-complicating-personal-websites-in-2026-3iik
- [R6] "Neo-brutalist portfolio sites" (visible oversized nav instead of hamburger menus): https://designsignal-ai.pages.dev/articles/neo-brutalist-portfolio-sites
- [R7] rafgraph, "Single Page Apps for GitHub Pages" (404 redirect technique; notes Google no longer follows these redirects): https://github.com/rafgraph/spa-github-pages
- [R8] Smashing Magazine, "S(GH)PA: The Single-Page App Hack For GitHub Pages": https://www.smashingmagazine.com/2016/08/sghpa-single-page-app-hack-github-pages/
- [R9] Stack Overflow (archived), "Is there a configuration in GitHub Pages that allows you to redirect everything to index.html": https://kaweah.freedombox.rocks/kiwix/stackoverflow.com_en_all_2023-11/questions/36296012/is-there-a-configuration-in-github-pages-that-allows-you-to-redirect-everythin
- [R10] GitHub Docs, "Creating a custom 404 page for your GitHub Pages site": https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site
- [R11] SvelteKit accessibility docs (route announcements, focus management): https://svelte.dev/docs/kit/accessibility
- [R12] Nuxt accessibility docs (route announcer): https://nuxt.com/docs/4.x/guide/best-practices/accessibility
- [R13] Gatsby, "Accessibility improvements to client-side routing" (user testing; some screen-reader and browser pairs announced nothing): https://v2.gatsbyjs.com/blog/2020-02-10-accessible-client-side-routing-improvements
- [R14] Vispero, "Client-side routing accessibility": https://vispero.com/resources/client-side-routing-accessibility/
- [R15] Go Make Things, "Shifting focus on route change with React Router": https://gomakethings.com/shifting-focus-on-route-change-with-react-router/
- v1 sources [S1] to [S9] remain in `SPEC.md` section 15.
