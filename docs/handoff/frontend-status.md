# Frontend status

Owner: frontend. Date: 2026-11-09. Nothing was committed or pushed.

## Verification run

- `npm run lint`: 0 errors, 0 warnings.
- `npm run build`: passes. Gzip sizes: JS 80.2 KB (budget 90), CSS 4.2 KB (budget 15).
- QA-203 greps (literal colors, literal `font-size`, `--gray-*` in components and base.css): no matches.
- QA-701 grep (direct data imports in components/App/main): no matches. `src/components/__dev__/` was never created.
- `index.html` has each marker once. `dist/index.html` has no leftover markers, and the backend plugin fills the head and noscript content.
- Checked in headless Chrome over CDP against `vite preview`. Results:
  - Widths 320, 375, 390, 768, 1024, 1366, 1440 and 2560, in both light and dark: no horizontal scroll, one h1, and the hero action row above the fold (including 390x844 and 1366x768). No button or icon link under 44px. No inline link under 24px.
  - Root font size of 24px at 320, 390 and 1366: no horizontal scroll.
  - Keyboard:
    - The first Tab stop is the skip link, and Enter moves focus to `<main>`.
    - Tab order runs header, hero, sections, footer.
    - Every stop shows a 2px solid focus outline.
  - Mobile menu: Enter opens it (`aria-expanded="true"`). Esc closes it and returns focus to the button. Clicking a link closes it. Clicking outside closes it.
  - Nav link click: the hash updates, focus moves to `#projects-heading`, the heading sits at 132px (below the 56px header), and `aria-current="location"` lands on "Projects".
  - Theme toggle:
    - Light to dark changes the label to "Switch to light theme".
    - `localStorage.theme` is set to `dark`, and `meta[name=theme-color]` becomes `#0a0a0a`.
    - After a reload, the theme is already `dark` at early load, before the app runs.
  - Copy email: the button shows "Copied", and the live region says "Email copied".
  - Print media while the page is in dark theme: white background, dark text, nav and toggle hidden, URLs printed after external links.
  - The only network origin is the preview host.
- **Not run:** axe-core and Lighthouse. The no-new-packages rule ruled out installing them, so QA should run QA-401 and QA-500.

## Task map

| Task | Files | Requirements |
| :- | :- | :- |
| F1 Styles | `src/styles/index.css`, `tokens.css`, `themes/light.css`, `themes/dark.css`, `base.css`. Starter `src/App.css`, `src/index.css`, `src/assets/`, `public/icons.svg` deleted | REQ-200 to REQ-203, REQ-024, REQ-213, REQ-305, REQ-306 |
| F2 index.html | `index.html` (lang, charset, viewport, favicon, theme-color, theme bootstrap script, both markers, `<noscript>`) | REQ-205, REQ-308, REQ-505, REQ-703 |
| F3 App shell | `src/main.jsx`, `src/App.jsx`, `components/SkipLink`, `SiteHeader`, `Nav` (+ `scrollToSection.js`), `Section`, `SiteFooter`, `Icon` (+ `iconForLinkKind.js`), `ExternalLink` (+ `isExternalUrl.js`), `Tag` (TagList), `LinkButton` (LinkList), `DateRange`, `Timeline/Timeline.module.css`, `hooks/useActiveSection.js` | REQ-001, REQ-002, REQ-020 to REQ-024, REQ-090, REQ-302 to REQ-305, REQ-309, REQ-311 |
| F4 Hero | `components/Hero` | REQ-010 to REQ-013 |
| F5 About | `components/About` | REQ-030 |
| F6 Experience | `components/Experience`, `Timeline` styles | REQ-040 to REQ-043 |
| F7 Projects | `components/Projects` (`Projects.jsx`, `ProjectCard.jsx`) | REQ-050 to REQ-055 |
| F8 Education | `components/Education` | REQ-060 |
| F9 Skills | `components/Skills` | REQ-070 |
| F10 Contact | `components/Contact` | REQ-080 to REQ-082, REQ-310 |
| F11 Theme | `components/ThemeToggle` (`ThemeToggle.jsx`, `themes.js`), `hooks/useTheme.js`, bootstrap script in `index.html` | REQ-204 to REQ-206 |
| F12 Responsive | All `*.module.css`. Breakpoints 480, 768 and 1024 | REQ-210 to REQ-212 |
| F13 Accessibility | Covered by the checks above. axe was not run | REQ-300 to REQ-311 (REQ-301 still needs QA's axe and Lighthouse runs) |
| F14 Performance | No web fonts, no third-party requests, sized images, lazy project images, photo uses `fetchpriority="high"` | REQ-402 to REQ-404 (REQ-400 and REQ-401 need Lighthouse) |
| F15 Favicon / OG | `public/favicon.svg` (white "AL" on black), `public/og-image.png` (1200x630, black "Andrew Leick" on white, made with headless Chrome) | 4.10 |

## Deviations and notes

1. **Locations are never rendered.** This follows the CONTENT-FACTS decision. Hero, Experience and Education ignore `location` even when the data has one. It overrides REQ-010, REQ-041 and REQ-060.
2. **GPA** shows as "GPA 3.83/4.0" in the Education meta line.
3. **FIRST Robotics** comes in as an Experience entry with no `employmentType`. It renders like the other jobs, without a type label and without an empty meta line.
4. **Project role:**
   - `project.role` shows as a "Role" line on the card. REQ-051's order does not list it, but 7.3 includes it and CONTENT-FACTS asks for Andrew's contributions.
   - Team credit comes from `contextLabel`, for example "Team project · 3 contributors · Ongoing".
   - The "Featured" and status badges sit right after the title, so heading navigation still lands on the title.
5. **Extra layout tokens** in `tokens.css`: `--icon-size`, `--photo-size`, `--photo-size-md`, `--date-column`. They are theme-independent lengths.
6. **Print forces light tokens** through an `@media print` block in `themes/light.css` (selector `html:root[data-theme]`). A new theme does not need to touch it.
7. **Theme bootstrap script:**
   - It accepts any kebab-case saved value, because it cannot import `THEMES`.
   - `useTheme` then re-checks the value against `THEMES`.
   - Theme logic runs in `App` even when `site.themeToggle` is false.
   - With no saved choice and `defaultTheme: "system"`, the site follows live OS theme changes.
8. **Hero and contact icon links:**
   - Each has `aria-label` set to its label. External links also get " (opens in new tab)" in the label.
   - Below 480px the hero shows icons only, and the external-link arrow is hidden along with the text.
9. **Copy email failure:** the button shows "Copy failed" and the live region says "Copy failed. Use the email link instead." Both states reset after 2 seconds.
10. **Header name at 320px with a 24px root font:** it truncates with an ellipsis. The full name is the h1 directly below.

11. **QA D-03 (fixed):** the noscript content was unstyled and flush against the edge. `index.html` now wraps the `<!-- content:noscript -->` marker (still present once) in `<div class="noscript">`. `base.css` gives that wrapper gutter padding, a max width of `--measure`, list bullets and spacing, all with tokens. I checked it with JavaScript disabled at 1024px.

## Spec conflicts with CONTENT-FACTS.md

- REQ-010, REQ-041 and REQ-060 (render location) conflict with the "no locations" decision. The frontend follows CONTENT-FACTS.
- Section 6.4 and section 11 email (`andrew.leick23@gmail.com`) differ from CONTENT-FACTS (`aleick@stanford.edu`, still to be confirmed). The frontend renders whatever `profile.email` holds.
- SPEC section 11 says Andrew's degree is "CS + EE". CONTENT-FACTS says B.S. Electrical Engineering. This is data only.

## Requests for other owner (backend)

None blocking. Content observations:
- In `projects.json`, the NFL project's `role` repeats its first three highlights. Consider keeping one of them.
- `profile.availability` is still a `TODO:` and shows in the hero as-is, per spec.
- The project still has the placeholder highlight "TODO: add results/metrics…".
