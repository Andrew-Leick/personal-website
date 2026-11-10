# Frontend status, v2 (home + subpages)

Owner: frontend. Date: 2026-11-10. Spec: `docs/spec/SPEC-v2.md`. Nothing committed or pushed. The v1 report (`frontend-status.md`) is untouched.

## Verification run

- `npm run lint`: 0 errors, 0 warnings.
- `npm run build`: passes (validate warns about the 2 known `TODO:` placeholders only).
- `npm run check:size`: JS 79.99 KB gzip (budget 90), CSS 4.46 KB, initial 85.87 KB. OK.
- `npm run check:routes` (backend script): "Routes OK: home + 3 pages + 404.html, sitemap matches".
- Greps (QA-868, QA-881, QA-882) over `src/components`, `src/pages`, `src/router`, `src/styles/base.css`:
  - no literal colors, no literal `font-size`, no `--gray-*`;
  - no direct data imports (content only via `src/lib/content/index.js`);
  - no `useActiveSection`, `scrollToSection`, `__dev__` or `aria-expanded` anywhere in `src/` (no fixture was ever created);
  - no `public/404.html`.
- Headless Chrome over CDP against `vite preview` (with backend's per-route HTML in `dist/`) and `vite` dev:
  - **Navigation (QA-810, QA-813, QA-816):**
    - header and Explore links change the URL without a reload (a `window.__probe` survives);
    - the title updates and focus lands on `#page-heading` with `scrollY` 0;
    - `aria-current="page"` is set in the header and footer navs, and on the header name link on Home;
    - Cmd-click on an Explore row does not navigate the current tab;
    - clicking the current page's link does not grow `history.length`.
  - **Back/forward (QA-812):** scrolled `/experience/` to 600, went to About, then back: `scrollY` is 600 and focus is on `#page-heading`. Forward works.
  - **Fresh loads (QA-811):** `/about/#contact` scrolls to the target (here that is the page's maximum scroll) and focus stays on `body`.
  - **Hash links:** an in-page `#skills` link focuses `#skills-heading`. "Back to top" scrolls to the header and keeps native focus behavior, so the next Tab goes to the name link.
  - **Normalization (QA-814):** `/experience` and `/experience/index.html` both show `/experience/` via `replaceState`.
  - **Not found (QA-815):** `/nope/` shows the h1, the paragraph and links to Home plus each page, with title "Page not found | Andrew Leick", `meta robots noindex`, no canonical and nothing marked `aria-current`. Navigating from there to Projects removes robots and restores the canonical.
  - **Head sync (QA-841):** after every navigation there is exactly one each of title, description, og:title, og:description, twitter:title and twitter:description. og:url and canonical are present (both absent on Not found), and `og:url` equals the canonical.
  - **Keyboard (QA-860, QA-861):**
    - the first Tab stop is "Skip to content", and Enter focuses `#main`;
    - Enter on a nav link focuses `#page-heading` with no ring drawn.
  - **Headings (QA-823 to QA-825):**
    - Experience: h1, then entries as h2;
    - Projects: h1, then card titles as h2;
    - About: h1, then h2 Education, Skills and Contact with h3 entries, and the sections carry `aria-labelledby`;
    - Home: h1 `#hero-name`, h2 "Explore", h3 row labels.
  - **Projects (QA-824):** a single card renders as one column (685 px, capped at `--measure`). The context line is "Team project · 3 contributors · Ongoing · Jupyter Notebook", with no "★ 0".
  - **Responsive (QA-865):** checked widths 320, 375, 390, 768, 1024, 1366, 1440 and 2560 on all 5 routes, in light and dark. No horizontal scroll, one h1 per page and no menu button. Every button and header, footer or card link is at least 44 px tall. On mobile the header has two rows.
  - **24 px root font** at 320 and 390 on every route: no overflow. The header nav wraps "About" to a second line at 320.
  - **Above the fold (QA-822):**
    - 390x844: the action row ends at 550 and the first Explore row starts at 633;
    - 1366x768: the first label ends at 615;
    - 1440x900: all three labels end by 884.
  - **axe-core 4.10.3 (QA-862):** run from the scratchpad, outside the repo, with wcag2a/aa, wcag21, wcag22aa and best-practice rules. Covered all 5 routes in light and dark at 1366 and 390, plus once after a client navigation: **0 violations**.
  - **Theme (QA-817):** toggling on Home, navigating to Projects and going back keeps the theme. The toggle label is correct.
  - **Print (QA-869):** the header and footer navs and the toggle are hidden, the background is white, and Explore rows print their href.
  - **Reduced motion (QA-867):** in-page hash scrolling jumps, and transitions are 0s.
  - **Dev server (QA-819):** all routes render with the right title, `/about` normalizes, `curl /zzz/` returns the not-found title plus `noindex`, and there are no console errors or warnings in dev or preview.
- **Not run:** Lighthouse (QA-863) and VoiceOver (QA-871). Those are left for QA.

## Task map

| Task | Files | Requirements |
| :- | :- | :- |
| FV1 Router | `src/router/history.js` (store, `navigate`, scroll Map, `scrollRestoration='manual'`, path normalization), `useRoute.js` (`useSyncExternalStore`), `Link.jsx`, `useRouteEffects.js`, `syncHead.js` | REQ-801 to REQ-806, REQ-844 to REQ-846, REQ-900 to REQ-906 |
| FV2 App shell | `src/App.jsx` (route switch), `components/SiteHeader`, `components/Nav` (rewritten: plain page list, `header` and `footer` variants), `components/SiteFooter`, new `components/ResumeLink`. Deleted `hooks/useActiveSection.js` and `components/Nav/scrollToSection.js` | REQ-840 to REQ-849 |
| FV3 Home | `src/pages/HomePage.jsx`, `components/Hero` (h1 `#hero-name`, display size), new `components/Explore`, `Icon` (`arrow-right`), `styles/tokens.css` (`--text-display`, `--text-page-title`, `--explore-index-col`) | REQ-820 to REQ-829 |
| FV4 Content pages | `src/pages/ContentPage.jsx`, `pages/sectionBodies.jsx`, `pages/Page.module.css`, `components/Section` (no eyebrow, no own container), a `headingLevel` prop on `Experience`, `Education`, `Skills`, `Projects`/`ProjectCard`, the resume button in `Contact`, entry-title styles in `Timeline`/`Projects`/`Skills` CSS | REQ-860 to REQ-874, REQ-877 |
| FV5 Not found | `src/pages/NotFoundPage.jsx` | REQ-875 (REQ-876 comes from `getHead`) |
| FV6 Head sync | `src/router/syncHead.js`, called first in `useRouteEffects` | REQ-881 |
| FV7 Passes | `styles/base.css` (`scroll-padding-top: var(--space-4)`, focus rules, `h2 a` target size) | REQ-960 (axe part), REQ-961, REQ-962, REQ-402 |

## Deviations and notes

1. **Accepted by planner, and the spec is amended.** The hero bottom padding at `md` and up is `--space-12`, not `--space-16`. With `--space-16`, the third Explore label ended exactly at 900 px at 1440x900 (REQ-828). The gap inside each row (label, blurb, teaser) is also `--space-1`. Row padding stays at `--space-6` as specified.
2. **Programmatic heading focus never shows a ring.** Chrome reports `:focus-visible` when a script moves focus right after a key press. So `:is(h1, h2)[tabindex="-1"]:focus` gets `outline: none` outright, not just via `:not(:focus-visible)`. These headings are never in the tab order.
3. **In-page hash links** (REQ-845, amended by planner to match): the router does not intercept them. When the browser fires `popstate` for a same-path hash change, the router:
   - scrolls to the target (smooth only with no reduced-motion preference);
   - focuses `#{id}-heading` if one exists, on the next frame;
   - otherwise leaves native behavior alone. "Back to top" therefore does not pull focus to the h1.
4. **A lead-section hash** (for example `/experience/#experience`) has no section heading. It scrolls to the wrapper, and focus goes to the page h1.
5. **The JSON-LD script is not touched on client navigation.** REQ-881 does not list it. After leaving Home in the client, the Home JSON-LD stays in the DOM. Crawlers get the right static file per route.
6. **On Home, the header name link has `aria-current="page"`, as REQ-840 asks.** Once the footer is counted, Home has two current links: the header name and the footer "Home".
7. **About's Contact section** shows "Resume (PDF)" in the same row as the outline contact links.
8. **Footer** order: the footer nav, then a row with the contact links and the resume text link, then a row with © and "Back to top".
9. **`main` is keyed by route.** Component state resets on navigation, for example the "Copied" label on the copy button.

## Requests for other owners

- None blocking. Backend's API matched SPEC-v2 10.4 exactly, and I made no requests.
- planner: the REQ-845 question is resolved, and the spec was amended to match note 3.

## Open (unchanged, for Andrew)

Resume PDF privacy, the `TODO:` placeholders (`profile.availability` and the NFL highlight), the public email, the custom domain, and the VoiceOver pass. See SPEC-v2 17.1.
