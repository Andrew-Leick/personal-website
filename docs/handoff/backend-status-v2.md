# Backend status, v2 (home + subpages)

Owner: backend. Date: 2026-11-10. Spec: `docs/spec/SPEC-v2.md`. Nothing was committed or pushed. The v1 report (`backend-status.md`) is unchanged.

## Verification (Node 24, working tree with frontend's in-progress v2 files)

| Command | Result |
| :- | :- |
| `npm run ci` | exit 0: lint, test, validate, build, check:size, check:routes |
| `npm run lint` | exit 0, no warnings |
| `npm test` | 6 files, 143 tests pass (v1: 98) |
| `npm run validate` | `Content OK: 4 experience, 1 education, 1 project, 3 skill groups, 3 links (2 warnings)`. The 2 warnings are the existing open placeholders |
| `npm run check:size` | JS 79.95 KB, CSS 4.48 KB, total 85.86 KB gzip (all within budget) |
| `npm run check:routes` | `Routes OK: home + 3 pages + 404.html, sitemap matches (base "/")` |
| `npm run check:links` | `Links OK: 6 URLs, 9 internal links, 0 errors, 2 warnings` (LinkedIn 999; siteUrl not deployed yet) |
| Project-site base: `BASE_PATH=/personal-website/ vite build --outDir <scratch>` + `check-routes` | Routes OK. Assets, page hrefs and noscript links carry `/personal-website/`. The build prints the existing siteUrl/base mismatch warning, as expected |
| Dev server `curl` (REQ-946) | `/` Home title; `/about/`, `/about`, `/experience/?x=1`, `/experience/index.html` get page titles; `/zzz/` and `/experience/foo/` get "Page not found \| Andrew Leick" plus `noindex` |
| Preview `curl` (QA-843) | `/projects/` and `/projects/index.html` serve the Projects head. `/projects` and `/nope/` fall back to the root `index.html` (Home head), as spec 4.3 says; see "Notes for QA" |
| Workflow YAML | Both files parse (Ruby YAML) |

By hand, each followed by a byte-exact restore of `site.json` (`cmp` against a backup):
- QA-833 (a): `site.sections` back gives the migration error and exit 1;
- QA-833 (f): removing `contact` gives a warning only, exit 0;
- QA-830: the CONTENT-GUIDE "Move Skills to its own page" example, applied literally, validates, builds `dist/skills/index.html`, adds `/skills/` to the sitemap, and passes `check:routes`.

Current teasers (REQ-927; asserted in `api.test.js`):
- Experience: "Software Development Engineer Intern, Amazon";
- Projects: "Featured: NFL Play Reconstruction";
- About: "B.S. Electrical Engineering, Stanford University · Expected Jun 2028".

## Task map

| Task | Files | REQs |
| :- | :- | :- |
| BV1 API + data | `src/data/site.json` (`sections` → `pages`, spec 10.2 values verbatim; descriptions are 148/106/119 chars), `src/lib/content/normalize.js` (`derivePages`, `sectionTeaser`, `sectionHasContent`; `deriveSections` removed), `routes.js` (new), `head.js` (new), `index.js` (new getters), `types.js` (Section, Page, Route, Head; SiteContent gains `pages`) | REQ-920, 925, 926, 927, 806 |
| BV2 Validator | `src/lib/content/validate.js`: `pages` schema (1 to 6; label ≤ 20, blurb ≤ 100, description 50 to 160, teaser ≤ 100, sections ≥ 1), v1 `sections` migration error, duplicate page ids, reserved ids, clash with a `public/` entry, a section on two pages (names both locations), unplaced-section warning, page-title > 70 warning. Generic arrays now support `minItems`/`maxItems`, and item paths show `(id "…")` | REQ-920 to 924, 884, 885, 110, 111 |
| BV3 Plugin | `scripts/vite-plugin-content.js`: `renderHead(content, route)` built on `headFor`, wrapped in `content:head:start/end`. JSON-LD on Home only. `robots noindex` and no canonical or og:url on not-found. `writeBundle` writes `dist/{id}/index.html` and `404.html` by swapping only the head block of the built `index.html`. Sitemap lists Home plus pages. Noscript adds a page-link list. In dev, the head follows `ctx.originalUrl` | REQ-880, 882, 940 to 944, 946 |
| BV4 Scripts | `scripts/check-routes.mjs` (new CLI), `scripts/lib/routes-check.mjs` (logic), `scripts/check-links.mjs` (REQ-947 internal-link check), `package.json` (`check:routes`, added to `ci`), workflow step names | REQ-945, 947, 949 |
| BV5 Tests | `src/lib/content/__tests__/routes.test.js` (new: resolveRoute with base `/` and `/personal-website/`, section hrefs, getHead for all 3 kinds), `normalize.test.js` (page filtering, every teaser rule, placeholder skipping, override), `validate.test.js` (12 new page-rule tests), `api.test.js` (exports, shapes, real-data teasers/routes/head), `scripts/__tests__/vite-plugin-content.test.js` (per-route heads, swapHead, sitemap, noscript, and `checkRoutes` against synthetic dists, including every failure kind) | 10.6 |
| BV6 Docs | `docs/CONTENT-GUIDE.md` new "Pages and navigation" section, with examples for rename, reorder, hide, move Skills to `/skills/`, and change a blurb or override a teaser; file table and checks updated. `README.md`: intro, scripts table (`check:routes`), routing notes | 12.2 |

## `check:routes` checks (REQ-945)

- `index.html`, every shown page's `{id}/index.html` and `404.html` exist.
- In each file, `<title>`, canonical, robots and JSON-LD presence match `getHead()`.
- Every file is byte-identical to `index.html` outside the head block.
- No route folder exists for a page that is not shown.
- No unexpanded `content:head` or `content:noscript` marker remains.
- Every `assets/` URL starts with the base (REQ-941).
- The sitemap set equals Home plus the page URLs.

It reads `BASE_PATH` like `vite.config.js`. The deploy job sets it at job level, so the check sees the same base as the build.

## Deviations and interpretations

1. **A section on a hidden page is not placed.** 10.3 rule 1 doesn't say this explicitly. I read it this way so that `getSectionHref()` never returns a link that resolves to Not found. Such a section is also not "unplaced" for the validator warning, because it is listed on a page.
2. **The base without its trailing slash** (e.g. `/personal-website`) resolves to Home with canonicalPath `/personal-website/`. The spec's "outside the base" rule would otherwise make it not-found.
3. **Duplicate section ids across pages:** the validator errors, and the normalizer places the first occurrence only. This only matters while content is invalid, i.e. in dev.
4. **Teaser placeholder check** looks at the component values: the role and organization, the project titles, the degree, field, minor and institution, the dates (a `"TODO"` date counts), and the skill items. It does not check the composed string. So a `TODO:` in any part skips that section, as QA-821 expects.
5. **Projects teaser order** follows `getProjects()` order (featured, order, end, title), not file order.
6. **Validator item paths** inside `site.pages` now include the id, e.g. `pages[0] (id "work").blurb`, matching v1 REQ-111. This also changes the path format for nested `sections[i]` items.
7. **`getHead()` returns a frozen object.** Its `jsonLd` is a fresh object on each call.

## Notes for QA

- **Preview fallback** (spec 4.3): `vite preview` serves the root `index.html`, with the Home head, for `/projects` (no slash) and unknown paths. The correct per-route head appears only after the frontend's client head sync. Frontend confirmed that the sync runs on initial load too, and checked in preview: a fresh `/nope/` gets the not-found title and `noindex` with no canonical, and `/experience` normalizes with the Experience title. The static files themselves are right; check them with `curl` on `/projects/` or by reading `dist/`.
- QA-830 to QA-833 can follow CONTENT-GUIDE "Pages and navigation" literally. Every example is a `site.json`-only edit.

## Still open (unchanged from v1, for Andrew; not touched)

- The resume PDF exposes the phone number and cities (`public/content/resume/andrew-leick-resume.pdf`).
- `TODO:` placeholders: `profile.availability` and the NFL results highlight. `validate:strict` still blocks deploy.
- Confirm the public email `aleick@stanford.edu`.
- Custom domain; creating the hosting repo and setting up Pages.
- NFL project course context and status; whether FIRST Robotics needs a label.

## Requests for other owner (frontend)

- None open. The one request (run the head sync on initial load) was already met; frontend confirmed it.
- The API shape matches SPEC-v2 10.4, and frontend confirmed they are integrated against it.
