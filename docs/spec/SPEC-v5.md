# SPEC v5: Pokédex for Experience + Projects

Amends [SPEC-v4.md](SPEC-v4.md). Approved 2026-11-15. Built by the `content` (backend), `ui` (frontend) and `qa` agent team. QA verifies every V5 ID against section 5.

## Context

The site is a Pokémon-themed one-page portfolio (`site.layout: "journey"`). Before v5 it had three pages, each led by a starter: Experience (Charmander), Projects (Bulbasaur) and About (Squirtle). v5 adds a **Pokédex** that catalogs both work experience and projects. It shows a **numbered list on the left and the selected entry's details on the right**, with a **toggle between dexes** (like regional vs National): **Work / Projects / All**.

Decisions made with the owner:
- The **Experience page hosts the Pokédex**. Its section body becomes the dex.
- The Bulbasaur page becomes **Education** (Education + Skills move there from About). About keeps About + Contact. That keeps 3 starters and 3 rail balls.
- **`/projects/` keeps working.** It opens the dex on the Projects view.
- Views: **Work (default) / Projects / All**. All works like the National dex.

---

## 1. Requirements (QA verifies each ID)

### Structure and routing
| ID | Requirement |
| :- | :- |
| V5-01 | `site.json` gets `"pokedex": true` (optional boolean, default `false`). When `false`, the site behaves exactly as before v5: the Experience timeline and project cards render. |
| V5-02 | Pages, in order: `experience` (label "Experience", guide charmander, sections `[experience]`), `education` (label "Education", guide bulbasaur, sections `[education, skills]`), `about` (label "About", guide squirtle, sections `[about, contact]`). Each page gets a new blurb (≤100 chars) and a new description (50–160 chars) in the owner's existing voice. |
| V5-03 | When `pokedex` is true, the `experience` section body renders the Pokédex fed by Experience **and** Projects. The `projects` section is not placed on any page. |
| V5-04 | Validator, when `pokedex` is true: placing the `projects` section on any page is an **error**. The message says the projects already show in the Pokédex and to remove that section. The usual "projects is not on any page" warning is **suppressed**. If `experience` is not placed, there is a **warning** that the Pokédex has nowhere to show. |
| V5-05 | A page may declare `aliases: [{ "id": "projects", "hash": "pokedex-projects" }]`: at most 3 per page, `hash` nullable, id format = the page-id format. Validation errors: the alias id is reserved (`RESERVED_PAGE_IDS`), equals any page id, repeats across pages, or is malformed. |
| V5-06 | `resolveRoute('/projects/')` (with or without the trailing slash or `index.html`) returns the experience page with `canonicalPath: '/experience/'` and `hash: '#pokedex-projects'`. Every other route has `hash: null`. |
| V5-07 | Loading `/projects/` in the browser replaces the URL with `/experience/#pokedex-projects` (no extra history entry). The page opens at the Pokédex with the Projects view selected. Focus does not move on load (REQ-900 still holds). |
| V5-08 | The build writes `dist/projects/index.html`. It is the experience page's HTML, with the experience page's title, description and canonical, so GitHub Pages serves it with a 200. Aliases are **not** in `sitemap.xml`. `npm run check:routes` asserts both. |
| V5-09 | The journey works with the new pages: the hero "Choose your starter" lists Experience / Education / About, the rail has 3 balls, the scroll spy moves the URL to `/education/`, and intros play for all three. |

### Pokédex UI
| ID | Requirement |
| :- | :- |
| V5-10 | The dex is drawn as the device, in CSS only, with no images and no extra markup, in the site's sprite style. It has a red clamshell body with a dark outline and light and dark shading bands, and a top bar with a big blue lens and red, yellow and green lights (pseudo-element box-shadows). The title text reads **"Pokédex"**, or **"Index"** when `site.fanArt` is false. The view tabs are blue keys; the selected key is pressed in, ringed and underlined. Each screen has a grey bezel with two red dots. In the two-column layout a hinge separates the list half from the detail half. The device colors (`--dex-*` in `tokens.css`) are the same in every theme; the screens use the theme's surface and text. On the red body the focus ring is white (5.88:1), because the theme's blue ring is 1.17:1 on red. *(Revised after QA: the first version was a plain `.pixel-dialog` box. No licensed Pokédex art exists in PokeAPI or the open sprite sets, and a fixed image cannot hold the responsive list and detail.)* |
| V5-11 | View toggle: an ARIA tablist (`aria-label="Pokédex views"`) with tabs **Work**, **Projects** and **All**. Each tab shows its entry count, e.g. "Work 4". Tab ids are `pokedex-work`, `pokedex-projects` and `pokedex-all`. Left/Right arrows move between tabs and wrap, Home/End jump to the ends, selection follows focus, and roving tabindex is used. The default view is Work. |
| V5-12 | Only views with entries get a tab. If only one region (Work or Projects) has entries, the tablist and All are not rendered. If there are no entries at all, the section renders nothing. |
| V5-13 | Entry list: a vertical tablist (`aria-orientation="vertical"`, `aria-label="{View} entries"`). Each row shows `#001`, the name and the subtitle. Up/Down move between rows and wrap, Home/End jump to the ends, selection follows focus, and roving tabindex is used. The selected row shows the `MenuCursor` ▶ plus a `--color-bg-subtle` background, so it is never marked by color alone. |
| V5-14 | Numbering: Work = experience in `getExperience()` order, numbered #001…; Projects = `getProjects()` order, numbered #001…; All = Work then Projects, numbered #001…#00N. The list and detail show the **current view's** number. |
| V5-15 | Each view remembers its selected entry; a view's first entry is selected the first time. When the view changes, an entry that also appears in the new view stays selected (Work → All keeps the same job). |
| V5-16 | Detail panel (`role="tabpanel"`, labelled by the selected entry's tab, `tabIndex=0`) shows the number, the name as a heading at `headingLevel`, the subtitle (organization as an `ExternalLink` when it has a URL, or the project's context line), a `DateRange` and badges. The badges are a type badge ("Work" in `--color-type-fire`, "Project" in `--color-type-grass`, always with its text), the employment type or status, and "Featured". After those come GitHub stars and language, the summary, the project role line, **all** highlights, a technologies `TagList`, the project links (Code / Live demo / Write-up) and the project image when it has one. |
| V5-17 | Hash deep links: `#pokedex-work`, `#pokedex-projects` and `#pokedex-all` (initial load, in-page link, back/forward) select that view. |
| V5-18 | Layout: a container query on the dex body. At ≥ 40rem container width it has two columns (list `minmax(12rem, var(--dex-list-width))`, detail `minmax(0, 1fr)`), and the list scrolls inside the box (`max-block-size: 28rem`, `overflow-y: auto`, `overscroll-behavior: contain`). Below that it is one column, with the list above the detail. No horizontal scroll at 320px. Long names wrap. |
| V5-19 | Polish follows the project's rules: hover styles only inside `@media (hover: hover)`, transitions name their properties (`background-color`, `color`) at `var(--duration-fast)`, and there is no new motion. Text pairs pass contrast (≥4.5:1; large text ≥3:1) in light and dark, and focus rings are visible on every stop. |
| V5-20 | Print: tablists and the list are hidden, and every entry of the current view prints expanded (hidden detail panels are shown), with no breaks inside an entry. |
| V5-21 | The footer disclaimer lists "Pokédex" among the trademarks (when fanArt is on). |
| V5-22 | Budgets hold: `npm run check:size` passes **without raising any limit**. JS was 88.14 of 90 KB gzip at planning time, so the dex has about 1.8 KB. No new dependencies. |

---

## 2. Data contract (backend produces, frontend consumes)

Add to `src/lib/content/types.js` and expose it as `content.dex` (null when `site.pokedex` is false) plus a `getDex()` getter in `index.js`:

```js
/** @typedef {{ key: string,               // "work:<id>" | "project:<id>"; DOM ids use it with ':' → '-'
 *   kind: 'work'|'project', id: string,
 *   number: { national: number, regional: number },   // 1-based
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
 *   primaryUrl: string|null, githubStats: GithubStats|null, image: Image|null }} DexEntry */
/** @typedef {{ work: DexEntry[], projects: DexEntry[], all: DexEntry[] }} Dex
 *   // all = [...work, ...projects] as NEW objects carrying number.national; work/projects carry number.regional
 *   // (each entry has both numbers; the view decides which to show) */
```
- `formatDexNumber(n)` → `"#001"` in `src/lib/content/format.js`, exported from `index.js`.
- `Page` gains `aliases: { id: string, path: string, hash: string|null }[]` (`path` like `"projects/"`). `Route` gains `hash: string|null` (`"#pokedex-projects"`).
- `Site` gains `pokedex: boolean`.

---

## 3. Backend tasks (`content`)

Owns: `src/data/site.json`, `src/lib/content/*` and its tests, `src/router/history.js`, `scripts/vite-plugin-content.js`, `scripts/check-routes.mjs`, `scripts/__tests__/*`, `docs/CONTENT-GUIDE.md`, `README.md`.

1. **Schema and normalize.** In `validate.js` `SCHEMAS.site`: add `pokedex` (boolean) and the page `aliases` field (array ≤3 of `{ id: req id, hash: nul id-like }`). In `normalize.js`: default `pokedex: false`; normalize aliases into `Page.aliases`; build `content.dex` from the already-normalized `experience` and `projects` arrays (reuse their `dateLabel`, `employmentType`, `statusLabel`, `contextLabel`, `primaryUrl` and `githubStats`; don't recompute).
2. **Validator rules** for V5-04 and V5-05 in `checkPages` (it already tracks `placedAt` and the unplaced-section warning; extend it there). Error and warning text follow the existing `formatIssue` style, with a hint.
3. **Routes.** In `resolveRouteWithBase` (`routes.js`), when no page id matches, look up the alias and return `{ kind: 'page', page, canonicalPath: b + page.path, hash }`. Add `hash: null` to every other route, including `NOT_FOUND_ROUTE`. `allRoutes` is unchanged (aliases are not routes the build emits as pages).
4. **History.** In `history.js`, `normalizeCurrentPath()` and `navigate()`: when the URL has no hash and the resolved route has `hash`, append it to the replaced or pushed URL (V5-07).
5. **Build plugin.** In `vite-plugin-content.js`, next to the per-page write, write `dist/{alias.id}/index.html` for each alias with the **target page's** head. Leave `sitemapUrls` as is. In `check-routes.mjs`, assert that alias files exist, that their canonical equals the target page URL, and that sitemap has no alias.
6. **Content.** Restructure `site.json` per V5-02 and set `"pokedex": true` and the experience page's `aliases`. Run `npm run validate:strict`.
7. **Tests.** Update `__tests__/api.test.js` (it reads the real data: the pages are now experience/education/about and `/projects` resolves via the alias). Add tests in `normalize.test.js` (dex null when off; numbering; mapping; all = work + projects), `validate.test.js` (V5-04 and V5-05 messages), `routes.test.js` (alias, trailing slash, index.html, hash null elsewhere) and the plugin tests (alias file, sitemap).
8. **Docs.** `CONTENT-GUIDE.md`: a "Pokédex" section (what `pokedex` does, how numbering works, that projects are added in `projects.json` as before) and "Page aliases". Update the README page list.
9. Report to `ui` the moment items 1 and 6 land, since `content.dex` is then real.

## 4. Frontend tasks (`ui`)

Owns: `src/components/Pokedex/*` (new), `src/hooks/useRovingTabs.js` (new), `src/pages/sectionBodies.jsx`, `src/components/Projects/ProjectCard.jsx` (exports only), `src/components/SiteFooter/SiteFooter.jsx`, `src/styles/tokens.css` (one token), and the Pokedex tests.

1. **`useRovingTabs({ count, index, onSelect, orientation })`** in `src/hooks/useRovingTabs.js` returns `getTabProps(i)` with `tabIndex`, `ref`, `aria-selected` and `onKeyDown`. It handles Arrow keys per orientation with wrapping, plus Home and End, then focuses the new tab and calls `onSelect(i)`. It is used for **both** tablists (V5-11, V5-13).
2. **`Pokedex({ dex, fanArt, headingLevel })`** in `Pokedex.jsx`, rendering the structure in V5-10…V5-15:
   - `<div className="pixel-dialog …" id="pokedex">` → title bar `<p>` → view tablist → one `role="tabpanel" id="pokedex-panel"` labelled by the selected view tab → `.dexBody` (container) holding the entry tablist and the detail panels.
   - Render one `DexDetail` per entry **in the current view**, with `hidden` on all but the selected one (needed for print, V5-20). Ids: entry tab `dex-entry-{key}`, detail `dex-detail-{key}` (key with `:` → `-`).
   - State: `view` plus `selectedByView` (`{ work, projects, all }` of entry keys), following V5-15.
   - Hash (V5-17): read `useRoute()` from `src/router/useRoute.js`. In a `useLayoutEffect` on `nav.id` (and on mount), map `nav.hash` `#pokedex-{view}` to `setView`.
3. **`DexDetail({ entry, number, headingLevel })`** in `DexDetail.jsx` (V5-16). Reuse `DateRange`, `TagList`, `ExternalLink`, `Icon` and `MenuCursor`. In `ProjectCard.jsx`, **export** `ContextLine` and `LINK_LABELS` and use them; do not copy them.
4. **Styles** in `Pokedex.module.css`, tokens only (no literal colors or sizes), following V5-18 to V5-20. Model the badges on `Projects.module.css` `.featured`/`.status`, and the selected rows and cursor on `Nav.module.css`/`BallLink.module.css`. Add `--dex-list-width: 18rem` in `tokens.css`. Print rules go under `@media print` in the module.
5. **Wiring.** In `sectionBodies.jsx`, set `experience: (c, level) => c.dex ? <Pokedex dex={c.dex} fanArt={c.site.fanArt} headingLevel={level} /> : <Experience …/>`, and leave `projects` as is (used when pokedex is off). In `SiteFooter.jsx`, add "Pokédex" to `DISCLAIMER` (V5-21).
6. **Tests** in `src/components/Pokedex/__tests__/Pokedex.test.jsx` with a `// @vitest-environment happy-dom` docblock (the config's environment is `node`; `happy-dom` is already installed; no testing-library). Use `react-dom/client` + `act`. Cover the tab and entry ARIA wiring, Arrow, Home and End on both lists, view memory (V5-15), V5-12 single-region and empty, and the hash selecting the view. Build against a fixture that matches section 2, so this can start before `content` lands.
7. Run `npm run check:size` after the build. If JS goes over 90 KB, **stop and tell the lead**; do not raise the budget.

---

## 5. Verification (`qa`)

**Gates:** `npm run lint` (0 warnings), `npm test`, `npm run validate:strict`, `npm run build`, `npm run check:size` (JS ≤ 90 KB, limits unchanged), `npm run check:routes`; or all of it via `npm run ci`.

**Functional**, driven through `npm run preview` with headless Chrome over CDP (launch Chrome with `--remote-debugging-port`, script it from Node 24's global `WebSocket`):
- V5-06/07: load `/projects` and `/projects/`. Check that the URL becomes `/experience/#pokedex-projects`, `history.length` is unchanged, Projects is `aria-selected`, the dex is in view and `document.activeElement` is `body`.
- V5-08: `dist/projects/index.html` exists and its canonical is `/experience/`; `sitemap.xml` has no `/projects/`.
- V5-09: hero links, 3 rail balls, the scroll spy reaching `/education/`, intros for all three sections.
- V5-11/13/15/17: a keyboard walk covering Tab into the tabs, the arrows, Home/End, Tab into the list, the arrows, Tab to the detail and its links. After each key, assert `aria-selected`, roving `tabindex`, the visible panel, the focus ring and view memory. Also test hash links to each view.
- V5-12: covered by unit tests. State that it was not run in the browser.
- V5-14: numbers in each view against the data.
- V5-16: every field against `experience.json` and `projects.json`.
- V5-20: `Emulation.setEmulatedMedia({ media: 'print' })`, screenshot.
- V5-01 regression: the unit tests cover `pokedex: false`. QA does not edit `site.json`.

**Interface:** run the `better-interface` skill scoped to the Pokédex and the restructured pages. Inspect 320, 390, 640 (200% zoom), 768, 1280, 1440 and 1920px in light and dark, plus reduced motion, and measure contrast for the badge, number and subtitle pairs. Get computed names and roles from `Accessibility.getFullAXTree`. Also check the v4 review fixes did not regress: no focus under the mobile dock (now with the dex's links), and headings not clipped at 320px.

**Report:** `docs/qa/REPORT-v5.md`. It contains a table of every V5 ID (Pass/Fail/Not verified, with evidence: command, viewport, screenshot path), the better-interface findings table, and a final **Approve/Block**. An ID is Pass only with evidence.

---

## 6. v5.1: the Pokédex flow

This replaces V5-11, V5-13, V5-15, V5-17, V5-18 and V5-20, drops the All view from V5-14, and changes V5-22's limit. V5-10 (the device look) still holds.

| ID | Requirement |
| :- | :- |
| V5-23 | **Closed.** The Pokédex starts closed. Below the top bar is a red cover with a hinge band on its left edge and one key, **Open Pokédex** (**Open index** with fan art off). The cover and the open screen share `--dex-screen-min`, so opening does not jump. It is sized from the device width (`cqi`, with `.dex` as the container), so the whole device has the real one's proportions (the Kanto Pokédex replica: 4.35 in wide, 4.9 in tall, ≈ 1.125). The floor is 20rem, so on phones the device is taller than that. Longer content makes the device taller; it never spills. |
| V5-24 | **Opening.** Open swings a copy of the cover (the lid) away on its left hinge (`rotateY` to −120° with a fade, 700ms, `--ease-standard`). The lid is created only under `prefers-reduced-motion: no-preference` (never mounted otherwise) and is removed when its animation ends. With reduced motion, or on a deep link, the screen appears at once. |
| V5-25 | **Start screen.** The heading "What would you like to see?", then one large key per dex that has entries, **Experience** and **Projects**, each with its count. **Close** returns to the closed device. |
| V5-26 | **A dex.** The heading (**Experience** or **Projects**), then a grid of Pokémon, one button per entry. Each shows its sprite (2×; negative margins trim the transparent canvas, and the sprite ignores clicks so its overflow never catches a neighbour's), its number (`#001` within that dex), and a label. The label is the organization and start year for experience ("Amazon 2026") or the title for a project. The accessible name is an `aria-label` that starts with the visible text and adds the role (experience) or the context line (project), with no hidden text (Chrome would put a space before out-of-flow text). **◀ Menu** returns to the start screen. |
| V5-27 | **Showcase.** The entry's Pokémon at 2× on a stage (1× below a 24rem screen), beside the V5-16 details from a 40rem screen and above them below that. **◀ Experience** (or **◀ Projects**) returns to the grid. **◀ Previous** and **Next ▶** step through the dex and are disabled at its ends. |
| V5-28 | **Focus.** Each step the reader takes moves focus to the new screen's heading (`#pokedex-start-heading`, `#pokedex-{view}-heading`, `#pokedex-entry-heading`). Going back moves it to where the reader came from: Close to Open, Menu to that dex's key, and the showcase's back key to the entry's tile. Focus never moves on load. |
| V5-29 | **Sprites.** An entry's `pokemon` field (optional) picks its sprite from `DEX_POKEMON`: `porygon`, `porygon2`, `magnemite`, `pikachu`, `noctowl`. Each is a 96×96 PokeAPI default sprite in `public/sprites/`, shown pixelated at whole-number scales. Anything else is a validation error. With no Pokémon, or with fan art off, the entry shows the egg. Current picks: Amazon 2026 Porygon2 and Amazon 2025 Porygon (a return internship, evolved), GTRI Magnemite (the autonomous robot), FIRST Robotics Pikachu (electrical lead), NFL Play Reconstruction Noctowl (computer vision). |
| V5-30 | **Deep links.** `#pokedex-experience` and `#pokedex-projects` (on load, in-page links, back/forward) open that grid directly, with no lid. `/projects/` resolves to `/experience/#pokedex-projects`. The screen element carries `id="pokedex-{view}"` and a `scroll-margin-block-start`, so the glide keeps the device's top bar in view. |
| V5-31 | **Print.** The device and screen are hidden. A hidden copy of every entry prints instead (V5-16 details), grouped under an **Experience** and a **Projects** heading, with the entries one level below. |
| V5-32 | **Removed.** The `layout` setting and the v3 separate-pages layout (`HomePage`, `ContentPage`, `GuideLink`), the All view, national numbering (`DexEntry.number` is now a number), `Dex.all`, and `useRovingTabs`. A `layout` field in `site.json` is now an "unknown field" error. |
| V5-33 | **Budget.** JS ≤ **95 KB** gzip (raised from 90 at the owner's request). At v5.1 the bundle is 89.41 KB: removing the pages layout freed more than the flow added. |
