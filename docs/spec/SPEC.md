# Personal Portfolio Site: Build Spec

| | |
| :- | :- |
| Owner of this spec | Planner |
| Builders | Backend engineer (`backend`), Frontend engineer (`frontend`) |
| Verifier | QA (`qa`) |
| Repo | `/Users/andrewleick/personal-website` (Vite 8 + React 19, Node 24, branch `main`, no commits yet, no git remote yet) |
| Date | 2026-11-09 |
| Status | Ready to build. Resume content pending (see section 12). |

Read this whole document before starting. Everything here is a decision, not a suggestion. If something is ambiguous, follow the most literal reading, note the ambiguity in your hand-off report, and move on. Do not message the other engineer to negotiate an interface; the interface is fixed in section 7.

**Hard rule on facts:** nobody on the team invents facts about Andrew. Any value not listed in section 11 ("Known facts") is a placeholder string starting with `TODO:`. That includes employers, dates, titles, GPA, awards, locations, project outcomes and metrics.

---

## Contents

1. Goals, audience, success criteria
2. Research summary and the design choices it drives
3. Sitemap and section specs
4. Design system (tokens, themes, typography, layout, breakpoints)
5. Accessibility, performance, SEO requirements
6. Data model (schemas, examples, validation)
7. Ownership boundary and the backend/frontend interface
8. Hosting, build, CI
9. Task breakdown (backend, frontend)
10. QA test plan
11. Known facts and GitHub findings
12. Content-intake checklist (what we need from the resume)
13. Open questions for Andrew
14. Requirement index
15. Sources

---

## 1. Goals, audience, success criteria

### 1.1 Goal
A fast, clean, single-page portfolio Andrew can link from job applications, his resume, LinkedIn and GitHub. It should make three things obvious within about 10 seconds: who he is (name, role he wants, school), what he has built (projects with links to code), and how to contact him or get his resume.

### 1.2 Audience
1. **Recruiters / sourcers** (primary). Non-technical or semi-technical, skimming on a laptop or phone, often in under a minute. They want: role/level, school and graduation date, recent experience, recognizable tech keywords, resume PDF, contact.
2. **Hiring managers and engineers** (secondary). Click into projects and GitHub. They want: what he personally built, the technical problem, the stack, links to code that runs.
3. **Andrew** (maintainer). Must be able to add or edit an experience, project, or skill by editing one JSON file, without touching components.

### 1.3 Success criteria
- SC-1: Above the fold on a 1366x768 laptop and a 390x844 phone: name, headline, one-line summary, resume button, GitHub/LinkedIn/email links. (REQ-010, REQ-011)
- SC-2: Lighthouse (mobile, production build): Performance >= 95, Accessibility = 100, Best Practices >= 95, SEO = 100. (REQ-400, REQ-301)
- SC-3: Adding a new project means appending one object to `src/data/projects.json`; it renders after save in dev and after rebuild in prod, with zero component changes. (REQ-101)
- SC-4: Changing the whole color scheme means editing one theme file (or adding one and pointing `site.json` at it). (REQ-200, REQ-203)
- SC-5: Invalid content fails `npm run validate` and `npm run build` with a message naming the file, the path inside it, what is wrong, and how to fix it. (REQ-110)
- SC-6: No fabricated facts ship. The production deploy fails while any `TODO:` placeholder remains in visible content. (REQ-112)

---

## 2. Research summary and the design choices it drives

Short version of what the research says, and the decision each point produced. Sources in section 15.

| Finding | Decision |
| :- | :- |
| Recruiters skim fast. The Ladders eye-tracking study measured an average of 7.4 s for an initial resume scan, and found recruiters scan titles and subheads; cluttered layouts, multiple columns and long sentences did worse. [S1] | Single column for text content. Clear section headings. Role, organization, dates on one scannable line per job. Bullets capped at 6 per entry, 240 chars each. Hero carries the essentials. |
| Portfolio guides agree: make the best work easy to find, show what you built and its outcome, link to code and demos, include an about section and contact info, treat the site like a product. [S2][S3][S4] | Projects section with featured projects first; each card states Andrew's role, highlights, stack, and links to repo/demo. Contact section plus contact links in the hero. |
| Content and clarity matter more than visual flourish; reviewers will open the repos. [S2][S3] | Black-and-white, typography-led, no animations beyond subtle hover/focus. No skill "progress bars" (they carry no information). |
| Minimal developer portfolios that score well use semantic landmarks, WCAG AA contrast, keyboard support, and are tested with Lighthouse and a screen reader. [S5] | Semantic HTML landmarks, AA contrast (we exceed it: body text >= 7:1), full keyboard support, Lighthouse gates in QA. |
| WCAG 2.2 AA adds Focus Not Obscured (2.4.11) and Target Size Minimum 24x24 CSS px (2.5.8). [S6][S7] | Sticky header must never cover the focused element (`scroll-padding-top`); every interactive target >= 24x24 px, and we use 44x44 for buttons and icon links. |
| Core Web Vitals "good": LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1. [S8] | Budgets in section 5.2 are tighter than these. System fonts (no web font download), no third-party scripts, images sized and lazy-loaded. |
| Vite's official GitHub Pages guide: set Pages source to "GitHub Actions", build with `npm ci && npm run build`, upload `dist` with `actions/upload-pages-artifact`, deploy with `actions/deploy-pages`; `base` is `/` for a `<user>.github.io` repo. [S9] | Host on GitHub Pages from a repo named `Andrew-Leick.github.io`. Section 8. |
| Common portfolio layout patterns: single scrolling page with anchored sections and a sticky nav, hero with name + one-liner + CTAs, experience as a reverse-chronological list, project cards in a grid. [S2][S4] | Exactly that. No client-side router, no multi-page site. |

---

## 3. Sitemap and section specs

### 3.1 Sitemap
One page, `/`. Sections are anchors on that page. No router.

```
/  (index.html)
├── #main            skip-link target (the <main> element)
├── header           sticky: name/monogram + nav + theme toggle
├── #top             Hero (not in nav)
├── #about           About
├── #experience      Experience
├── #projects        Projects
├── #education       Education
├── #skills          Skills
├── #contact         Contact
└── footer
```

Section order and visibility come from `src/data/site.json` (`sections`), not from component code (REQ-001). A section whose data is empty is not rendered and not shown in the nav (REQ-002). The backend getter `getSections()` already applies both rules, so the frontend just maps over its result.

Section ids are a fixed set: `about`, `experience`, `projects`, `education`, `skills`, `contact`. The hero is always first and is not in the nav.

### 3.2 Global layout
- `SkipLink` ("Skip to content") as the first focusable element; visible on focus; targets `#main`. (REQ-302)
- `<header>` sticky at top, height `var(--header-height)`, background `var(--color-bg)` with bottom border `var(--color-border)`. Contains: left, Andrew's name as a link to `#top`; right, nav + `ThemeToggle` (toggle only if `site.themeToggle` is true).
- `<main id="main" tabindex="-1">` contains hero and sections.
- `<footer>`: "© {current year} {profile.name}", the links from `getLinks()` as icon+text links, and a "Back to top" link. Optional line "Built with React and Vite" (static text is fine).
- Content width: `max-width: var(--container-max)` centered, horizontal padding `var(--gutter)`. Prose blocks are capped at `var(--measure)`.

### 3.3 Navigation behavior (REQ-020 to REQ-024)
- REQ-020: Desktop (>= 768 px): horizontal list of section links in the header, labels from `site.sections[].label`.
- REQ-021: Mobile (< 768 px): a "Menu" button (text label plus icon, 44x44 min) toggles a disclosure panel listing the same links vertically. Button has `aria-expanded` and `aria-controls`. `Esc` closes it and returns focus to the button. Clicking a link closes it. Clicking outside closes it. No focus trap (it is a disclosure, not a modal).
- REQ-022: Clicking a nav link scrolls to the section; smooth scroll only when `prefers-reduced-motion: no-preference`. The URL hash updates. Focus moves to the section heading (headings get `tabindex="-1"`) so keyboard and screen-reader users land in the right place.
- REQ-023: The nav link for the section currently in view gets `aria-current="location"` and a visible style (underline, `var(--color-text)` instead of `var(--color-text-muted)`). Use `IntersectionObserver`; no scroll listeners.
- REQ-024: `html { scroll-padding-top: calc(var(--header-height) + var(--space-4)); }` so anchored headings and focused elements are never hidden under the sticky header (WCAG 2.4.11).

### 3.4 Section specs
Field names below refer to the normalized objects in section 7.3.

#### Hero (`#top`) (REQ-010 to REQ-013)
- REQ-010: Renders `profile.name` as the page's only `<h1>`; `profile.headline` under it (e.g. "TODO: from resume, e.g. Software Engineer"); `profile.summary` as one short paragraph (max 280 chars); `profile.location` and `profile.availability` as a small muted line if present.
- REQ-011: Action row: primary button "Resume" (links to `profile.resumeUrl`, opens the PDF in a new tab, has `download`-free behavior, label "Resume (PDF)"); hidden if `resumeUrl` is null. Then icon links for each link in `getLinks()` with `showInHero: true`, each with visible text label on >= 480 px and an `aria-label` always.
- REQ-012: Optional photo: if `profile.photo` is non-null, render it at 160x160 (mobile 120x120), `border-radius: var(--radius-full)`, grayscale is not forced, with explicit `width`/`height`, `fetchpriority="high"`, not lazy. If null, render nothing (no placeholder silhouette).
- REQ-013: Hero fits above the fold at 390x844 and 1366x768 with the default content lengths (name, headline, 280-char summary, action row).

#### About (`#about`) (REQ-030)
- Heading "About" (from section label). Renders `profile.about` (array of paragraphs, 1 to 4) as `<p>` elements, max width `var(--measure)`.
- Optional "Currently" line from `profile.currently` if non-null (e.g. "TODO: what Andrew is working on now").

#### Experience (`#experience`) (REQ-040 to REQ-043)
- REQ-040: Ordered list (`<ol>`) of entries in the order `getExperience()` returns (already sorted newest first).
- REQ-041: Each entry: first line `role` (h3) and `organization` (linked to `organizationUrl` if present; external link rules in 3.5); second line, muted: `dateLabel` (e.g. "Jun 2025 – Present"), `employmentType` if present, `location` if present, separated by " · ". Dates use `<time datetime="YYYY-MM">`.
- REQ-042: `summary` paragraph if present, then `highlights` as a `<ul>`, then `technologies` as tags (`Tag` component, `<ul aria-label="Technologies">`).
- REQ-043: Layout: on >= 1024 px, a two-column row per entry: left column (fixed 11rem) shows `dateLabel`; right column shows everything else. Below 1024 px, single column with the date line under the title.

#### Projects (`#projects`) (REQ-050 to REQ-055)
- REQ-050: Grid of `ProjectCard`s in `getProjects()` order (featured first). 1 column < 768 px, 2 columns >= 768 px. Featured cards do not span differently; keep the grid uniform.
- REQ-051: Card content in this order: optional image (16:9, `object-fit: cover`, lazy, explicit width/height); `title` (h3), linked to `primaryUrl` if non-null; `context` line, muted (e.g. "Team project · 3 contributors · 2026"); `summary`; `highlights` list (max 4 shown on card); `technologies` tags; link row: "Code" (`links.repo`), "Live demo" (`links.demo`), "Write-up" (`links.writeup`), each only if present. If `githubStats` is present, show "★ {stars}" and language in the context line.
- REQ-052: No nested links. The title link and the link row are separate links; the card itself is not a link. Card has a 1px `var(--color-border)` border, padding `var(--space-6)`, and `:hover`/`:focus-within` changes border to `var(--color-border-strong)`.
- REQ-053: Featured projects show a small "Featured" label (text, not color-only).
- REQ-054: `status` other than `"complete"` renders a muted badge ("In progress" or "Archived").
- REQ-055: Adding/removing/reordering projects in `projects.json` changes this grid with no code changes.

#### Education (`#education`) (REQ-060)
- List like Experience: `institution` (h3, linked if `institutionUrl`), `degreeLabel` (backend-composed string such as "B.S. Computer Science"), `dateLabel` (shows "Expected Jun 2027" style when `expected` is true), optional `gpa`, `honors` list, `coursework` as tags (`<ul aria-label="Relevant coursework">`).

#### Skills (`#skills`) (REQ-070)
- One block per group in `getSkills()`: group `name` (h3) then items as tags. No proficiency bars, percentages or star ratings.

#### Contact (`#contact`) (REQ-080 to REQ-082)
- REQ-080: Short line from `profile.contactBlurb` (e.g. "TODO: e.g. I'm looking for new-grad software roles. Email is the best way to reach me.").
- REQ-081: Email shown as a `mailto:` link with the address as visible text, plus a "Copy email" button that copies to clipboard and announces "Email copied" in an `aria-live="polite"` region; the button label changes to "Copied" for 2 s. If the Clipboard API is unavailable or fails, the button text becomes "Copy failed" and the mailto link still works.
- REQ-082: The full links list (all of `getLinks()`), each as icon + text.
- No contact form (no server, and forms add spam and privacy issues).

### 3.5 Link rules (REQ-090)
- External links (`http(s)://` to another origin): `target="_blank" rel="noopener noreferrer"`, an external-link icon with visually hidden text "(opens in new tab)".
- `mailto:` links: same tab, no icon.
- The resume PDF opens in a new tab with the same external-link treatment.
- Every link has a visible focus style (section 5.1) and underline on hover at minimum. Body-text links are underlined by default (not color-only, since the theme is monochrome).

---

## 4. Design system

### 4.1 Principles
Black and white, typography-led, generous whitespace, 1px rules instead of shadows, one font family plus a mono accent. Every color, font, size, space, radius, duration and z-index is a CSS custom property. Component CSS contains **no literal colors and no literal font sizes**; it only uses `var(--...)` (REQ-201). Lengths like `1px` borders and percentage widths are fine.

### 4.2 Files (all frontend-owned)
```
src/styles/
  index.css          imports, in this order: tokens.css, themes/light.css, themes/dark.css, base.css
  tokens.css         primitive tokens + theme-independent semantic tokens (type, space, layout, motion)
  themes/
    light.css        color tokens for data-theme="light" (default)
    dark.css         color tokens for data-theme="dark"
  base.css           reset, element defaults, utilities (.visually-hidden), print styles
src/components/**/X.module.css   component styles (CSS Modules), tokens only
```
`src/main.jsx` imports `./styles/index.css`. The starter files `src/index.css`, `src/App.css`, and `src/assets/*` are deleted.

### 4.3 Primitive tokens (`tokens.css`, on `:root`)
Primitives are the palette. Themes map semantic tokens onto primitives. Components never use primitives directly (REQ-202).

```css
:root {
  /* Neutral palette */
  --gray-0:   #ffffff;
  --gray-50:  #fafafa;
  --gray-100: #f2f2f2;
  --gray-200: #e5e5e5;
  --gray-300: #d4d4d4;
  --gray-400: #a3a3a3;
  --gray-500: #737373;
  --gray-600: #525252;
  --gray-700: #404040;
  --gray-800: #262626;
  --gray-900: #171717;
  --gray-950: #0a0a0a;
}
```

### 4.4 Theme-independent tokens (`tokens.css`, on `:root`)
```css
:root {
  /* Typography */
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;

  --text-xs:   0.75rem;    /* 12px: tags, footnotes */
  --text-sm:   0.875rem;   /* 14px: meta lines, nav */
  --text-base: 1rem;       /* 16px: body (never smaller) */
  --text-lg:   1.125rem;   /* 18px: hero summary, lead */
  --text-xl:   1.25rem;    /* 20px: h3 */
  --text-2xl:  clamp(1.5rem, 1.3rem + 0.8vw, 1.875rem);  /* h2 */
  --text-3xl:  clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem);   /* hero headline */
  --text-4xl:  clamp(2.25rem, 1.6rem + 3vw, 3.5rem);     /* h1 name */

  --weight-regular: 400;
  --weight-medium:  500;
  --weight-bold:    700;

  --leading-tight:  1.1;
  --leading-snug:   1.35;
  --leading-normal: 1.6;

  --tracking-tight: -0.02em;  /* h1, h2 */
  --tracking-wide:  0.08em;   /* uppercase labels (section eyebrow, "Featured") */

  /* Spacing (4px base) */
  --space-1: 0.25rem;  --space-2: 0.5rem;  --space-3: 0.75rem; --space-4: 1rem;
  --space-5: 1.25rem;  --space-6: 1.5rem;  --space-8: 2rem;    --space-10: 2.5rem;
  --space-12: 3rem;    --space-16: 4rem;   --space-20: 5rem;   --space-24: 6rem;

  /* Layout */
  --container-max: 64rem;     /* 1024px */
  --measure: 68ch;            /* max prose line length */
  --gutter: clamp(1rem, 0.5rem + 2.5vw, 2rem);
  --header-height: 3.5rem;
  --section-gap: clamp(4rem, 3rem + 4vw, 6rem);  /* vertical space between sections */

  /* Shape */
  --border-width: 1px;
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-full: 9999px;

  /* Focus */
  --focus-ring-width: 2px;
  --focus-ring-offset: 3px;

  /* Motion */
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);

  /* Layers */
  --z-header: 10;
  --z-menu: 20;
  --z-skip-link: 100;

  /* Hit area */
  --target-min: 44px;
}

@media (prefers-reduced-motion: reduce) {
  :root { --duration-fast: 0ms; --duration-base: 0ms; }
}
```

### 4.5 Semantic color tokens (themes)
Every theme file defines exactly this set of names. Adding a token means adding it to every theme.

| Token | Purpose | Light value | Dark value |
| :- | :- | :- | :- |
| `--color-bg` | page background | `var(--gray-0)` | `var(--gray-950)` |
| `--color-bg-subtle` | tags, code, hover fills | `var(--gray-100)` | `var(--gray-900)` |
| `--color-text` | body and headings | `var(--gray-950)` | `var(--gray-50)` |
| `--color-text-muted` | meta lines, dates | `var(--gray-600)` | `var(--gray-400)` |
| `--color-border` | rules, card borders | `var(--gray-200)` | `var(--gray-800)` |
| `--color-border-strong` | hovered card border, inputs | `var(--gray-950)` | `var(--gray-50)` |
| `--color-accent` | primary button bg, active nav underline | `var(--gray-950)` | `var(--gray-50)` |
| `--color-accent-contrast` | text on accent | `var(--gray-0)` | `var(--gray-950)` |
| `--color-link` | links | `var(--gray-950)` | `var(--gray-50)` |
| `--color-link-hover` | link hover | `var(--gray-700)` | `var(--gray-300)` |
| `--color-focus-ring` | focus outline | `var(--gray-950)` | `var(--gray-50)` |
| `--color-tag-bg` | tag background | `var(--gray-100)` | `var(--gray-900)` |
| `--color-tag-text` | tag text | `var(--gray-800)` | `var(--gray-200)` |
| `--color-selection-bg` | `::selection` | `var(--gray-950)` | `var(--gray-50)` |
| `--color-selection-text` | `::selection` | `var(--gray-0)` | `var(--gray-950)` |
| `--color-scheme` | value for `color-scheme` property | `light` | `dark` |

Contrast check (WCAG AA needs 4.5:1 for body text, 3:1 for large text and UI). Light: text #0a0a0a on #fff ~ 19.8:1; muted #525252 on #fff ~ 7.8:1; tag text #262626 on #f2f2f2 ~ 13:1. Dark: text #fafafa on #0a0a0a ~ 19:1; muted #a3a3a3 on #0a0a0a ~ 8:1; tag text #e5e5e5 on #171717 ~ 14:1. All pass AA; most pass AAA. Any new theme must meet the same minimums (REQ-300).

### 4.6 How themes plug in (REQ-203 to REQ-206)
- Theme files use this selector pattern (light shown):
  ```css
  :root,
  :root[data-theme="light"] { --color-bg: var(--gray-0); /* ...all semantic tokens... */ color-scheme: light; }
  ```
  `dark.css`:
  ```css
  :root[data-theme="dark"] { /* ...all semantic tokens... */ color-scheme: dark; }
  ```
  Light is the fallback (`:root` with no attribute), so the page is readable even if JS fails.
- **Adding a new theme** (e.g. `navy`): create `src/styles/themes/navy.css` with selector `:root[data-theme="navy"]`, define every semantic token (it may add primitives such as `--navy-900` inside the same file), import it in `src/styles/index.css`, add `"navy"` to the `THEMES` array in `src/components/ThemeToggle/themes.js`, and set `"defaultTheme": "navy"` in `src/data/site.json`. No component changes.
- **Swapping the default scheme entirely** (e.g. turn the site navy/cream): edit only `themes/light.css` and `themes/dark.css` values. No component changes. (REQ-203)
- **Theme selection logic** (REQ-204):
  1. Saved choice in `localStorage["theme"]` (if it is one of `THEMES`) wins.
  2. Else `site.defaultTheme` if it is not `"system"` and is in `THEMES`.
  3. Else `prefers-color-scheme` (`dark` -> `"dark"`, otherwise `"light"`).
  The result is written to `document.documentElement.dataset.theme`.
- REQ-205: To avoid a flash of the wrong theme, `index.html` contains a tiny inline `<script>` in `<head>` that runs step 1 and 3 before paint (it cannot read `site.json`; the React app applies step 2 on mount only when nothing is saved). Wrap `localStorage` access in `try/catch`.
- REQ-206: `ThemeToggle` (rendered only if `site.themeToggle` is true): a 44x44 button that toggles between `light` and `dark`, saves to `localStorage`, and has an accessible name that states the action: "Switch to dark theme" / "Switch to light theme". Icon: moon in light mode, sun in dark mode. If the current theme is a custom theme (not light/dark), the toggle switches to `dark` and then alternates.
- Also update `<meta name="theme-color">` to the current `--color-bg` when the theme changes.

### 4.7 Typography rules
- Body: `var(--font-sans)`, `var(--text-base)`, `var(--leading-normal)`, `var(--color-text)`.
- h1 (name): `var(--text-4xl)`, `var(--weight-bold)`, `var(--leading-tight)`, `var(--tracking-tight)`.
- h2 (section titles): `var(--text-2xl)`, bold, tight tracking, with a 1px `var(--color-border)` rule above the section and `var(--space-8)` below the heading. Above each h2, a small mono "eyebrow" with the section index (`01`, `02`, ...) in `var(--font-mono)`, `var(--text-xs)`, `var(--color-text-muted)`, uppercase, wide tracking, `aria-hidden="true"`.
- h3: `var(--text-xl)`, `var(--weight-medium)`, `var(--leading-snug)`.
- Meta lines and dates: `var(--text-sm)`, `var(--color-text-muted)`; dates use `font-variant-numeric: tabular-nums`.
- Tags: `var(--font-mono)`, `var(--text-xs)`, `var(--color-tag-bg)` / `var(--color-tag-text)`, padding `var(--space-1) var(--space-2)`, `var(--radius-sm)`.
- Heading levels never skip (h1 -> h2 -> h3).

### 4.8 Buttons and controls
- Primary button (Resume): bg `var(--color-accent)`, text `var(--color-accent-contrast)`, min-height `var(--target-min)`, padding `0 var(--space-5)`, `var(--radius-md)`, `var(--weight-medium)`. Hover: bg `var(--color-link-hover)`.
- Secondary/icon link (GitHub, LinkedIn, Email): transparent bg, 1px `var(--color-border)` border, same height. Hover: border `var(--color-border-strong)`.
- Transitions only on `color`, `background-color`, `border-color`, `opacity`, using `var(--duration-fast) var(--ease-standard)`. No transforms, parallax, typing effects, or scroll-triggered reveal animations.

### 4.9 Breakpoints and responsive rules (REQ-210 to REQ-212)
CSS variables cannot be used inside media queries, so breakpoints are fixed constants. Mobile-first `min-width` queries only.

| Name | Min width | Changes |
| :- | :- | :- |
| base | 0 | single column, mobile menu, icon links show icon + aria-label, tags wrap |
| `sm` | 480px | hero icon links show visible text labels |
| `md` | 768px | desktop nav replaces menu button; project grid 2 columns |
| `lg` | 1024px | experience/education date column layout (3.4) |
| `xl` | 1280px | no layout change; container stays at `--container-max` |

- REQ-210: No horizontal scroll at any width from 320 px to 2560 px.
- REQ-211: Text remains readable at 200% browser zoom and with root font size set to 24px (everything is in `rem`).
- REQ-212: Touch targets >= 44x44 for buttons and icon links; inline text links >= 24px line box (WCAG 2.5.8).

### 4.10 Icons and images
- Icons are inline SVG React components in `src/components/Icon/` (github, linkedin, mail, external, file, sun, moon, menu, close, copy). `fill="currentColor"`, `aria-hidden="true"`, `focusable="false"`. No icon font or icon library dependency. GitHub/LinkedIn glyphs may be taken from Simple Icons (CC0).
- Content images (headshot, project screenshots) live in `public/content/images/` (backend-owned) and are referenced from data. Requirements: WebP or AVIF, headshot <= 60 KB at 320x320, project images <= 150 KB at 1200x675.
- Favicon: `public/favicon.svg`, a black square with white "AL" monogram (frontend). OG image: `public/og-image.png` 1200x630, black "Andrew Leick" on white (frontend; see F15).

### 4.11 Print styles (REQ-213)
`@media print`: hide header nav, theme toggle, skip link, copy button, images; force light tokens; show link URLs after external links (`a[href^="http"]::after { content: " (" attr(href) ")"; }`); avoid page breaks inside entries.

---

## 5. Accessibility, performance, SEO

### 5.1 Accessibility (target WCAG 2.2 AA)
- REQ-300: All text/background pairs meet AA (4.5:1 body, 3:1 large text and UI components) in every theme.
- REQ-301: Lighthouse Accessibility = 100 and zero axe-core violations (serious or critical) in both light and dark themes.
- REQ-302: Skip link is the first tab stop and moves focus to `<main>`.
- REQ-303: Landmarks: exactly one `<header>` (banner), `<nav aria-label="Primary">`, `<main>`, `<footer>` (contentinfo). Each section is `<section aria-labelledby="{id}-heading">`.
- REQ-304: Every interactive element reachable and operable by keyboard in a logical order (header -> hero -> sections -> footer). No positive `tabindex`.
- REQ-305: Visible focus indicator on every focusable element: `outline: var(--focus-ring-width) solid var(--color-focus-ring); outline-offset: var(--focus-ring-offset);` via `:focus-visible`. Never `outline: none` without a replacement.
- REQ-306: `prefers-reduced-motion: reduce` disables smooth scrolling and all transitions.
- REQ-307: Images have meaningful `alt` from data (`photo.alt`, `image.alt`); decorative icons are `aria-hidden`. Icon-only links/buttons have `aria-label`.
- REQ-308: `<html lang="en">`. Page `<title>` is set (section 5.3).
- REQ-309: Mobile menu disclosure as specified in REQ-021; `Esc` closes; focus returns to the toggle.
- REQ-310: Live region announces "Email copied". Theme toggle state is conveyed by its label.
- REQ-311: Content order in the DOM matches visual order (no CSS `order` tricks that change reading order).

### 5.2 Performance budgets (REQ-400 to REQ-405)
- REQ-400: Lighthouse mobile (default throttling) on `npm run preview`: Performance >= 95, Best Practices >= 95, SEO = 100.
- REQ-401: LCP <= 2.0 s, CLS <= 0.05, TBT <= 100 ms in that Lighthouse run.
- REQ-402: Initial JS <= 90 KB gzip total; CSS <= 15 KB gzip; total initial transfer excluding the resume PDF and images <= 150 KB gzip. Enforced by `npm run check:size` (backend script).
- REQ-403: Zero third-party requests at runtime: no web fonts, no analytics, no CDN scripts, no embeds.
- REQ-404: All `<img>` have `width` and `height`; below-the-fold images use `loading="lazy" decoding="async"`.
- REQ-405: No runtime dependencies other than `react` and `react-dom`.

### 5.3 SEO and sharing (REQ-500 to REQ-505)
The backend's Vite plugin injects the head block at build and dev time, from `site.json` and `profile.json`, replacing the comment marker `<!-- content:head -->` in `index.html`.
- REQ-500: `<title>`: `{profile.name} | {profile.headline}`. `<meta name="description">`: `site.description` (50 to 160 chars, validated).
- REQ-501: `<link rel="canonical" href="{site.siteUrl}">`.
- REQ-502: Open Graph: `og:type=website`, `og:title`, `og:description`, `og:url`, `og:image` (absolute URL `{siteUrl}og-image.png`, omitted if `site.ogImage` is null), `og:image:width=1200`, `og:image:height=630`, `og:image:alt`. Twitter: `twitter:card=summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`.
- REQ-503: JSON-LD `<script type="application/ld+json">` with schema.org `Person`: `name`, `url` (siteUrl), `jobTitle` (headline, omitted if placeholder), `email` (`mailto:`), `sameAs` (all `links` URLs except email), `alumniOf` (education institutions as `CollegeOrUniversity`). Fields with `TODO:` values are omitted.
- REQ-504: Build output includes `dist/robots.txt` (`User-agent: *`, `Allow: /`, `Sitemap: {siteUrl}sitemap.xml`) and `dist/sitemap.xml` with the single URL. Generated by the backend plugin.
- REQ-505: `index.html` contains a `<noscript>` block with the name, a sentence ("This site needs JavaScript. My resume and links:"), and plain links to the resume and GitHub. Since `index.html` cannot read data, the frontend uses the marker `<!-- content:noscript -->` inside `<noscript>`, which the backend plugin replaces with the name and links.

---

## 6. Data model

### 6.1 Files
All content lives in `src/data/` (backend-owned). Each file is plain JSON, UTF-8, 2-space indent. List files are top-level arrays so adding an entry is "append one object".

| File | Shape | Purpose |
| :- | :- | :- |
| `site.json` | object | site URL, SEO text, theme defaults, section order/labels/visibility |
| `profile.json` | object | name, headline, summary, about, email, resume, photo |
| `links.json` | array | GitHub, LinkedIn, email, other profiles |
| `experience.json` | array | jobs, internships, research positions |
| `education.json` | array | degrees |
| `projects.json` | array | projects |
| `skills.json` | array | skill groups |
| `generated/github.json` | object | written by `npm run sync:github` only; never hand-edited |

Local asset paths in data (resume, images) are written **relative to `public/` with no leading slash**, e.g. `"content/resume/andrew-leick-resume.pdf"`. The content API resolves them with `import.meta.env.BASE_URL` so they work under any deploy base path.

### 6.2 Common field rules
| Rule | Detail |
| :- | :- |
| `id` | kebab-case `^[a-z0-9]+(-[a-z0-9]+)*$`, unique within its file, stable (used as React key and anchor). |
| Dates | `"YYYY-MM"` (preferred) or `"YYYY"`. `end` may be `null` meaning "Present". `end` >= `start`. The literal string `"TODO"` is also accepted in any date field as a placeholder (same warn/strict-error treatment as other placeholders; the start/end order check is skipped; formatters render it as "TODO"; entries with `"TODO"` dates sort last). |
| URLs | Absolute `https://` URLs, except `links[].url` for `kind: "email"` which must be `mailto:`. |
| Local paths | No leading `/`, no `..`, must exist under `public/`. |
| Strings | Trimmed, non-empty. Length limits per field below. Plain text only (no HTML, no Markdown). |
| Optional fields | May be omitted or `null`. Optional arrays may be omitted or `[]`. |
| `visible` | Optional boolean on list items, default `true`. `false` hides the entry everywhere without deleting it. |
| Placeholders | Any string that starts with `TODO:` is a placeholder. Allowed in dev; warning in `npm run validate`; error in `npm run validate:strict` (used by deploy). |
| Unknown keys | Error, with a "did you mean" suggestion (catches typos like `technolgies`). |

### 6.3 `site.json`
| Field | Type | Req | Rules |
| :- | :- | :- | :- |
| `siteUrl` | string | yes | `https://`, must end with `/` |
| `title` | string | yes | <= 70 chars; fallback title if headline is a placeholder |
| `description` | string | yes | 50 to 160 chars |
| `locale` | string | yes | e.g. `en_US` |
| `ogImage` | string \| null | yes | local path or null |
| `ogImageAlt` | string \| null | yes | required if `ogImage` set |
| `defaultTheme` | string | yes | `"system"`, `"light"`, `"dark"`, or any `^[a-z][a-z0-9-]*$` theme name |
| `themeToggle` | boolean | yes | |
| `sections` | array | yes | each `{ id, label, visible }`; `id` in the fixed set (3.1); each id at most once; `label` <= 20 chars |

```json
{
  "siteUrl": "https://andrew-leick.github.io/",
  "title": "Andrew Leick",
  "description": "TODO: from resume. One-sentence description of Andrew for search results, 50 to 160 characters.",
  "locale": "en_US",
  "ogImage": "og-image.png",
  "ogImageAlt": "Andrew Leick, portfolio",
  "defaultTheme": "system",
  "themeToggle": true,
  "sections": [
    { "id": "about", "label": "About", "visible": true },
    { "id": "experience", "label": "Experience", "visible": true },
    { "id": "projects", "label": "Projects", "visible": true },
    { "id": "education", "label": "Education", "visible": true },
    { "id": "skills", "label": "Skills", "visible": true },
    { "id": "contact", "label": "Contact", "visible": true }
  ]
}
```
Note: `ogImage` points to `public/og-image.png`, which the frontend creates. If it does not exist the validator errors; if the frontend cannot produce the PNG, backend sets `ogImage` and `ogImageAlt` to `null`.

### 6.4 `profile.json`
| Field | Type | Req | Rules |
| :- | :- | :- | :- |
| `name` | string | yes | <= 60 |
| `headline` | string | yes | <= 80 (e.g. role sought) |
| `summary` | string | yes | <= 280 |
| `about` | string[] | yes | 1 to 4 paragraphs, each <= 700 |
| `currently` | string \| null | no | <= 160 |
| `location` | string \| null | no | <= 60 |
| `availability` | string \| null | no | <= 80 (e.g. "Open to new-grad SWE roles, starting TODO") |
| `email` | string | yes | valid email |
| `contactBlurb` | string \| null | no | <= 200 |
| `resumeUrl` | string \| null | no | local path to a `.pdf` |
| `photo` | `{ src, alt }` \| null | no | `src` local image path; `alt` <= 120 |

```json
{
  "name": "Andrew Leick",
  "headline": "TODO: from resume (e.g. target role)",
  "summary": "TODO: from resume. One or two sentences: what Andrew studies, what he builds, what role he wants.",
  "about": [
    "TODO: from resume / Andrew. Paragraph 1: background and interests (GitHub bio mentions CS + EE at Stanford and robotics).",
    "TODO: Paragraph 2: what kind of work he is looking for."
  ],
  "currently": null,
  "location": null,
  "availability": null,
  "email": "andrew.leick23@gmail.com",
  "contactBlurb": "TODO: one line inviting contact, e.g. the best way to reach Andrew.",
  "resumeUrl": null,
  "photo": null
}
```

### 6.5 `links.json`
| Field | Type | Req | Rules |
| :- | :- | :- | :- |
| `id` | string | yes | kebab-case, unique |
| `kind` | enum | yes | `github`, `linkedin`, `email`, `website`, `scholar`, `other` (selects the icon; `other` uses the external icon) |
| `label` | string | yes | <= 30, visible text |
| `url` | string | yes | `https://` or `mailto:` for `email` |
| `showInHero` | boolean | no | default `true` |

```json
[
  { "id": "github", "kind": "github", "label": "GitHub", "url": "https://github.com/Andrew-Leick", "showInHero": true },
  { "id": "linkedin", "kind": "linkedin", "label": "LinkedIn", "url": "https://www.linkedin.com/in/TODO-from-andrew", "showInHero": true },
  { "id": "email", "kind": "email", "label": "Email", "url": "mailto:andrew.leick23@gmail.com", "showInHero": true }
]
```
The LinkedIn URL contains `TODO`, so it counts as a placeholder (the placeholder check for URLs is "contains `TODO`", for other strings "starts with `TODO:`").

### 6.6 `experience.json`
| Field | Type | Req | Rules |
| :- | :- | :- | :- |
| `id` | string | yes | kebab-case, unique |
| `organization` | string | yes | <= 80 |
| `organizationUrl` | string \| null | no | https |
| `role` | string | yes | <= 80 |
| `employmentType` | enum \| null | no | `full-time`, `part-time`, `internship`, `research`, `teaching`, `contract`, `volunteer` (rendered as "Full-time", "Internship", etc.) |
| `location` | string \| null | no | <= 60 (e.g. "Stanford, CA" or "Remote") |
| `start` | date | yes | |
| `end` | date \| null | yes | `null` = Present |
| `summary` | string \| null | no | <= 280 |
| `highlights` | string[] | no | 0 to 6 items, each <= 240 |
| `technologies` | string[] | no | 0 to 12 items, each <= 30, no duplicates (case-insensitive) |
| `visible` | boolean | no | default true |

```json
[
  {
    "id": "todo-first-role",
    "organization": "TODO: from resume (employer)",
    "organizationUrl": null,
    "role": "TODO: from resume (title)",
    "employmentType": "internship",
    "location": "TODO: from resume",
    "start": "TODO",
    "end": "TODO",
    "summary": null,
    "highlights": [
      "TODO: from resume. Action + what + measurable result."
    ],
    "technologies": [],
    "visible": true
  }
]
```
Additionally, **ids starting with `todo-` are treated as placeholders** by the validator, so the whole example entry is flagged. Replace the entry, including its id, when the resume arrives.

### 6.7 `education.json`
| Field | Type | Req | Rules |
| :- | :- | :- | :- |
| `id` | string | yes | |
| `institution` | string | yes | <= 80 |
| `institutionUrl` | string \| null | no | https |
| `degree` | string | yes | <= 40 (e.g. "B.S.", "M.S.") |
| `field` | string | yes | <= 80 (e.g. "Computer Science") |
| `minor` | string \| null | no | <= 80 |
| `location` | string \| null | no | |
| `start` | date | yes | |
| `end` | date | yes | graduation (actual or expected); `"TODO"` allowed as placeholder |
| `expected` | boolean | no | default false; true renders "Expected {end}" |
| `gpa` | string \| null | no | e.g. "3.8/4.0"; only include if Andrew wants it shown |
| `honors` | string[] | no | 0 to 6, each <= 120 |
| `coursework` | string[] | no | 0 to 12, each <= 60 |
| `visible` | boolean | no | |

```json
[
  {
    "id": "stanford",
    "institution": "Stanford University",
    "institutionUrl": "https://www.stanford.edu",
    "degree": "TODO: from resume (e.g. B.S.)",
    "field": "TODO: from resume (GitHub bio says CS + EE; confirm major/minor)",
    "minor": null,
    "location": "Stanford, CA",
    "start": "TODO",
    "end": "TODO",
    "expected": true,
    "gpa": null,
    "honors": [],
    "coursework": ["TODO: from resume (e.g. CS131 Computer Vision, if Andrew wants it listed)"],
    "visible": true
  }
]
```
Only the institution, its URL and location come from known facts (GitHub bio). `expected: true` is a guess based on the bio describing him as a current student; confirm it with the resume. Degree, field and dates are placeholders.

### 6.8 `projects.json`
| Field | Type | Req | Rules |
| :- | :- | :- | :- |
| `id` | string | yes | |
| `title` | string | yes | <= 60 |
| `summary` | string | yes | <= 200, one or two sentences |
| `role` | string \| null | no | <= 120, what Andrew did (e.g. "Built the jersey-number recognition model") |
| `teamSize` | integer \| null | no | >= 1; 1 renders "Solo project", >1 renders "Team project · N contributors" |
| `context` | string \| null | no | <= 60, e.g. "Course project, CS 131" or "Hackathon" |
| `start` | date \| null | no | |
| `end` | date \| null | no | |
| `status` | enum | yes | `complete`, `in-progress`, `archived` |
| `featured` | boolean | no | default false; warn if more than 4 are featured |
| `order` | integer | no | default 100; lower shows first within the featured/non-featured groups |
| `highlights` | string[] | no | 0 to 6, each <= 240 |
| `technologies` | string[] | no | 0 to 12 |
| `links` | object | no | `{ repo?, demo?, writeup? }` all https |
| `githubRepo` | string \| null | no | `"owner/name"`; if set, the content API merges stats from `generated/github.json` |
| `image` | `{ src, alt }` \| null | no | local image path; `alt` <= 160 |
| `visible` | boolean | no | |

```json
[
  {
    "id": "nfl-play-reconstruction",
    "title": "Football Play Reconstruction (Computer Vision)",
    "summary": "TODO: from Andrew. Team computer-vision project that analyzes college football game footage. Confirm exact goal and results.",
    "role": "TODO: from Andrew (commit history suggests work on the jersey-number recognition model and game database; confirm)",
    "teamSize": 3,
    "context": "Team project",
    "start": null,
    "end": null,
    "status": "in-progress",
    "featured": true,
    "order": 1,
    "highlights": [
      "TODO: from Andrew. Concrete contribution and measurable result."
    ],
    "technologies": ["Python", "Jupyter", "TODO: confirm stack (e.g. detection/tracking libraries)"],
    "links": {
      "repo": "https://github.com/CarterDessommes/NFL-Play-Reconstruction"
    },
    "githubRepo": "CarterDessommes/NFL-Play-Reconstruction",
    "image": null,
    "visible": true
  }
]
```
`teamSize: 3` is based on the repo's three listed contributors (CarterDessommes, Andrew-Leick, efrainangon). `technologies` placeholder items count as placeholders.

### 6.9 `skills.json`
| Field | Type | Req | Rules |
| :- | :- | :- | :- |
| `id` | string | yes | |
| `name` | string | yes | <= 30 (group name) |
| `items` | string[] | yes | 1 to 20, each <= 30, no case-insensitive duplicates within the group |

```json
[
  { "id": "languages", "name": "Languages", "items": ["TODO: from resume"] },
  { "id": "frameworks", "name": "Frameworks & Libraries", "items": ["TODO: from resume"] },
  { "id": "tools", "name": "Tools & Platforms", "items": ["TODO: from resume"] }
]
```

### 6.10 `generated/github.json` (written by script only)
```json
{
  "generatedAt": "2026-11-09T00:00:00Z",
  "repos": {
    "CarterDessommes/NFL-Play-Reconstruction": {
      "url": "https://github.com/CarterDessommes/NFL-Play-Reconstruction",
      "description": "",
      "language": "Jupyter Notebook",
      "stars": 0,
      "updatedAt": "2026-06-15T03:56:05Z",
      "homepage": null
    }
  }
}
```
If the file is missing, the content API behaves as if `repos` is `{}`. The validator checks its shape only if it exists.

### 6.11 Validation requirements (REQ-110 to REQ-114)
- REQ-110: Validator lives in `src/lib/content/validate.js` as a pure function `validateContent(raw, { strict, publicDir })` returning `{ errors: Issue[], warnings: Issue[] }`, where `Issue = { file, path, message, hint }`. No dependencies. Unit-tested.
- REQ-111: Message format, one issue per line:
  ```
  ✖ src/data/projects.json → [2].links.repo: expected an https:// URL, got "github.com/foo/bar". Hint: use the full URL, e.g. "https://github.com/foo/bar".
  ⚠ src/data/profile.json → headline: placeholder text "TODO: from resume (e.g. target role)". Hint: replace before deploying.
  ✖ src/data/experience.json → [0].technolgies: unknown field. Hint: did you mean "technologies"?
  ✖ src/data/experience.json → [1].end: "2024-02" is before start "2024-09".
  ✖ src/data/projects.json → [3].id: duplicate id "chess-engine" (also at [1]).
  ✖ src/data/projects.json: invalid JSON at line 14, column 5: Unexpected token }. Hint: check for a trailing comma.
  ```
  Paths use `[index].field` notation; when an item has a valid `id`, also show it: `[2] (id "nfl-play-reconstruction").links.repo`.
- REQ-112: `npm run validate` exits 1 on any error, 0 otherwise (warnings printed). `npm run validate:strict` treats placeholders as errors. Final line: `Content OK: 1 experience, 1 education, 1 project, 3 skill groups, 3 links (5 warnings)` or `Content invalid: 3 errors, 5 warnings`.
- REQ-113: `npm run build` runs validation first (non-strict). The deploy workflow runs `validate:strict`, so placeholders can never reach production.
- REQ-114: In `npm run dev`, editing a data file re-validates; on error, the Vite error overlay shows the same messages and the page does not render stale data silently. On fix, the page reloads.

---

## 7. Ownership boundary and interface

### 7.1 File ownership (REQ-700)
Each path has exactly one owner. Never edit a file you do not own. If you need a change in the other side's file, write it under "Requests for other owner" in your hand-off report; do not make it.

| Path | Owner |
| :- | :- |
| `src/data/**` (all content JSON, including `generated/`) | backend |
| `src/lib/content/**` (content API, validator, formatters, types, tests) | backend |
| `scripts/**` (validate, sync-github, check-links, check-size) | backend |
| `vite.config.js` (including the content plugin, which may live in `scripts/vite-plugin-content.js`) | backend |
| `package.json`, `package-lock.json` | backend |
| `.oxlintrc.json`, `.gitignore`, `.nvmrc` | backend |
| `.github/**` (CI and deploy workflows) | backend |
| `README.md`, `docs/CONTENT-GUIDE.md` | backend |
| `public/content/**` (resume PDF, headshot, project images) | backend |
| `index.html` | frontend |
| `src/main.jsx`, `src/App.jsx` | frontend |
| `src/components/**` | frontend |
| `src/styles/**` (tokens, themes, base) | frontend |
| `src/hooks/**` (e.g. `useActiveSection`, `useTheme`) | frontend |
| `public/**` except `public/content/**` (favicon, og-image, icons) | frontend |
| Deleting starter files `src/App.css`, `src/index.css`, `src/assets/**`, `public/icons.svg` | frontend |
| `docs/spec/**` | planner |
| `docs/qa/**` (QA report) | qa |

Rules:
- Frontend adds **no npm dependencies**. Backend adds only devDependencies listed in B4 (`vitest`) plus anything strictly needed for its scripts, and no runtime dependencies (REQ-405).
- Frontend imports content **only** from `src/lib/content/index.js` (never JSON files directly) (REQ-701).
- Backend never writes JSX or CSS. Frontend never writes in `src/data` or `src/lib`.

### 7.2 Public API: `src/lib/content/index.js` (REQ-702)
All functions are synchronous, pure, and return frozen, already-normalized data (JSON is imported statically, so Vite bundles it and HMR works). Return values never contain `undefined`: optional strings are `null`, optional arrays are `[]`. Hidden entries (`visible: false`) are removed.

```js
// src/lib/content/index.js
export function getSite()        // -> Site
export function getProfile()     // -> Profile
export function getLinks()       // -> Link[]          (file order)
export function getExperience()  // -> Experience[]    (sorted, see 7.4)
export function getEducation()   // -> Education[]     (sorted)
export function getProjects()    // -> Project[]       (sorted)
export function getSkills()      // -> SkillGroup[]    (file order)
export function getSections()    // -> Section[]       (site.sections filtered: visible && has content)
export function getSiteContent() // -> { site, profile, links, experience, education, projects, skills, sections }
export function isPlaceholder(value) // -> boolean (string starting "TODO:" or URL containing "TODO")
export { formatDateRange, formatMonth } from './format.js'
```

`format.js`:
```js
formatMonth("2025-06")            // "Jun 2025"
formatMonth("2025")               // "2025"
formatDateRange("2025-06", null)  // "Jun 2025 – Present"
formatDateRange("2025-06", "2025-09") // "Jun 2025 – Sep 2025"
formatDateRange("2025-06", "2025-06") // "Jun 2025"
formatDateRange("2023-09", "2027-06", { expected: true }) // "Sep 2023 – Expected Jun 2027"
formatDateRange(null, null)       // null
formatDateRange("TODO", "TODO")   // "TODO – TODO"
```
Month names are English 3-letter abbreviations, en dash with spaces (`" – "`). No `Intl` locale dependence (tests must be deterministic).

### 7.3 Normalized return shapes (JSDoc typedefs in `src/lib/content/types.js`)
```js
/** @typedef {{ siteUrl: string, title: string, description: string, locale: string,
 *   ogImage: string|null, ogImageAlt: string|null, defaultTheme: string, themeToggle: boolean }} Site */

/** @typedef {{ id: 'about'|'experience'|'projects'|'education'|'skills'|'contact',
 *   label: string, index: string }} Section   // index: "01", "02", ... in display order */

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
 *   location: string|null, start: string, end: string, expected: boolean,
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
```

### 7.4 Sorting and derivation rules
- Experience: entries with `end: null` first (by `start` desc), then by `end` desc, then `start` desc.
- Education: by `end` desc.
- Projects: `featured` true first; within each group by `order` asc, then `end` desc (`null` end counts as newest), then `title` asc.
- `contextLabel` parts, joined with `" · "`, skipping nulls: `context` ?? (teamSize-derived text), then teamSize text if `context` was also given, then year of `end` (or "Ongoing" if status is `in-progress`). Example: `{ context: "Team project", teamSize: 3, status: "in-progress" }` -> `"Team project · 3 contributors · Ongoing"`.
- `getSections()` drops a section when: `visible` is false, or about has no paragraphs, experience/projects/education/skills is empty, or contact has no email and no links. `index` is assigned after filtering.

### 7.5 Content Vite plugin (backend) and `index.html` markers (frontend) (REQ-703)
- `vite.config.js` registers `contentPlugin()` from `scripts/vite-plugin-content.js`.
- `index.html` (frontend) must contain, exactly once each: `<!-- content:head -->` inside `<head>` and `<!-- content:noscript -->` inside `<noscript>`. Frontend must **not** hardcode `<title>`, description, canonical, OG, or JSON-LD tags.
- Plugin behavior: `transformIndexHtml` replaces the markers (section 5.3); `buildStart` runs validation and fails the build on errors; in dev, `handleHotUpdate`/watcher on `src/data/**` re-validates and sends errors to the overlay; `generateBundle` emits `robots.txt` and `sitemap.xml`.
- Frontend owns the rest of `<head>`: charset, viewport, favicon link, `<meta name="theme-color" content="#ffffff">`, the theme bootstrap inline script (REQ-205).

### 7.6 Working in parallel
- Backend task B1 (content API with example data) is small and goes first. Frontend starts with F1 to F3, which do not need data.
- If the frontend reaches a data-dependent task before B1 lands, it may temporarily create `src/components/__dev__/fixture.js` returning objects in the exact 7.3 shapes, and must delete it (and every import of it) before hand-off. QA checks this (QA-704).
- Neither side waits on the other for anything else. Integration is: `App.jsx` calls `getSiteContent()` and renders.

---

## 8. Hosting, build, CI

### 8.1 Decision: GitHub Pages, user site
- Host on GitHub Pages using GitHub Actions, from a public repo named **`Andrew-Leick.github.io`**, served at `https://andrew-leick.github.io/` with Vite `base: '/'`.
- Why: free, no extra account, the site URL sits next to his GitHub profile, which recruiters already visit; static output fits a single-page site; the Vite docs give an official workflow. Vercel/Netlify would add preview deploys, which a one-person portfolio does not need.
- Custom domain later: add `public/CNAME` (backend creates it under its ownership exception: backend may create `public/CNAME` only) and change `site.siteUrl`. Open question Q2.
- The repo currently has no remote and no commits. Creating the GitHub repo, pushing, and enabling Pages (Settings -> Pages -> Source: GitHub Actions) are actions for Andrew (Q1). Agents do not create remote repos or push.
- `vite.config.js` reads `base` from `process.env.BASE_PATH ?? '/'` so a project-site deploy (`/personal-website/`) remains a one-line change in the workflow.

### 8.2 npm scripts (backend, REQ-600)
| Script | Does |
| :- | :- |
| `dev` | `vite` |
| `build` | `npm run validate && vite build` |
| `preview` | `vite preview` |
| `lint` | `oxlint` (must pass with 0 errors, 0 warnings) |
| `test` | `vitest run` (content API, formatters, validator) |
| `validate` | `node scripts/validate-content.mjs` |
| `validate:strict` | `node scripts/validate-content.mjs --strict` |
| `check:links` | `node scripts/check-links.mjs` (HEAD/GET every URL in data + verify every `#anchor` used by nav exists in `getSections()`; 10 s timeout; LinkedIn may return 999, which counts as a warning, not an error) |
| `check:size` | `node scripts/check-size.mjs` (gzip sizes of `dist/assets/*.js` and `*.css` against REQ-402; prints a table; exits 1 on overrun) |
| `sync:github` | `node scripts/sync-github.mjs` (writes `src/data/generated/github.json` for every `githubRepo` in projects; uses `GITHUB_TOKEN` if set; never edits `projects.json`) |
| `ci` | `npm run lint && npm run test && npm run validate && npm run build && npm run check:size` |

Node version pinned in `.nvmrc` (`24`) and `"engines": { "node": ">=24" }`.

### 8.3 Workflows (backend, REQ-601, REQ-602)
- `.github/workflows/ci.yml`: on pull_request and push to any branch except `main`: checkout, setup-node (from `.nvmrc`, npm cache), `npm ci`, `npm run ci`.
- `.github/workflows/deploy.yml`: on push to `main` and `workflow_dispatch`, following the Vite docs [S9]: permissions `contents: read, pages: write, id-token: write`; concurrency group `pages`; build job runs `npm ci`, `npm run validate:strict`, `npm run ci`, then `actions/configure-pages`, `actions/upload-pages-artifact` (path `./dist`); deploy job uses `actions/deploy-pages` with environment `github-pages`. Use the current major versions the Vite guide lists.

---

## 9. Task breakdown

Each task lists its deliverable and acceptance criteria (AC). Report completed tasks by number in your hand-off, with any deviations.

### 9.1 Backend

**B1. Content API with example data (do first).**
Deliverable: `src/data/*.json` exactly as the examples in 6.3 to 6.9 (with placeholders), `src/lib/content/index.js`, `format.js`, `types.js`, `paths.js` (BASE_URL resolution).
AC: every function in 7.2 exists with the 7.3 shapes; `getSiteContent()` works in a quick node/vitest import; sorting per 7.4; hidden entries removed; local paths resolved with `import.meta.env.BASE_URL`.

**B2. Validator.**
Deliverable: `src/lib/content/validate.js` (pure), `scripts/validate-content.mjs` (reads files, catches JSON parse errors with line/column, prints issues, exits per REQ-112).
AC: implements every rule in 6.2 to 6.10 and REQ-110 to REQ-112; message format matches 6.11; "did you mean" uses edit distance <= 2 against allowed keys; path existence checks against `public/`.

**B3. Unit tests.**
Deliverable: `src/lib/content/__tests__/*.test.js` with vitest.
AC: tests cover each formatter case in 7.2, each sort rule in 7.4, `contextLabel` derivation, `getSections()` filtering, and at least one failing fixture per validator rule (bad URL, bad date, end before start, duplicate id, unknown key with suggestion, over-length string, too many items, placeholder warn vs strict error, missing local file, invalid JSON). `npm test` passes.

**B4. package.json and tooling.**
Deliverable: scripts in 8.2, `vitest` devDependency, `.nvmrc`, `engines`, `.oxlintrc.json` kept (add `"ignorePatterns": ["dist"]` if needed).
AC: `npm ci && npm run ci` passes on a clean checkout once frontend work is in; no new runtime dependencies.

**B5. Vite content plugin.**
Deliverable: `scripts/vite-plugin-content.js`, registered in `vite.config.js`; `base` from `BASE_PATH`.
AC: REQ-500 to REQ-505 output appears in `dist/index.html` and in dev; build fails on invalid content with 6.11 messages; dev overlay shows errors when a data file is broken and clears when fixed (REQ-114); `dist/robots.txt` and `dist/sitemap.xml` exist; JSON-LD omits placeholder fields; all injected text is HTML-escaped.

**B6. CI and deploy workflows.** Per 8.3. AC: YAML is valid (`npx --yes @action-validator/cli` or careful review); deploy runs `validate:strict`.

**B7. check:links and check:size scripts.** Per 8.2. AC: `check:size` prints sizes and fails if over budget; `check:links` lists each URL with status and exits 1 on any 4xx/5xx except LinkedIn 999.

**B8. GitHub sync (lower priority, do after B1 to B7).** Per 8.2 and 6.10. AC: running it creates/updates `generated/github.json`; `getProjects()` returns `githubStats` for projects with `githubRepo`; works without a token for public repos; network failure leaves the existing file untouched and exits 1 with a clear message.

**B9. Docs.**
Deliverable: `docs/CONTENT-GUIDE.md` and an updated `README.md`.
AC: CONTENT-GUIDE explains, with copy-paste examples, how to: add/edit/hide/reorder an experience; add/feature/reorder/hide a project; add a skill group; update profile text; replace the resume PDF and photo (paths, size limits); what `TODO:` placeholders mean and that deploy fails while they remain; how to run `validate`, `dev`, `build`, `sync:github`; how to read validator errors. README covers setup, scripts, deploy steps (including the one-time GitHub Pages setup for Andrew), and links to the spec and CONTENT-GUIDE.

### 9.2 Frontend

**F1. Styles foundation.** Delete starter CSS/assets (see 7.1). Create `src/styles/` per 4.2 with tokens and both themes exactly as 4.3 to 4.5; `base.css` with a modern reset, element defaults from 4.7, `.visually-hidden`, `:focus-visible` rule, `::selection`, `scroll-padding-top`, reduced-motion rules, print styles (4.11).
AC: no literal colors or font sizes outside `tokens.css` and `themes/*.css` (QA-203 grep passes); both themes pass contrast.

**F2. index.html.** `lang="en"`, charset, viewport, favicon, theme-color meta, theme bootstrap script (REQ-205), the two markers (7.5), `<noscript>` wrapper. Remove the hardcoded `<title>personal-website</title>`.
AC: markers present exactly once each; no hardcoded SEO tags.

**F3. App shell.** `src/main.jsx`, `src/App.jsx`, components `SkipLink`, `SiteHeader`, `Nav` (desktop + mobile disclosure), `Section` (wrapper rendering `<section aria-labelledby>`, eyebrow index, h2 with `tabindex="-1"`), `SiteFooter`, `Icon`, `ExternalLink`, `Tag`, `useActiveSection` hook.
AC: REQ-020 to REQ-024, REQ-090, REQ-302 to REQ-305, REQ-309, REQ-311.

**F4. Hero.** REQ-010 to REQ-013.
**F5. About.** REQ-030.
**F6. Experience.** REQ-040 to REQ-043.
**F7. Projects.** REQ-050 to REQ-055.
**F8. Education.** REQ-060.
**F9. Skills.** REQ-070.
**F10. Contact.** REQ-080 to REQ-082, REQ-310.
For F4 to F10, AC: renders entirely from `getSiteContent()`; renders correctly with 0, 1, and many entries; empty sections are absent (they will be, because `getSections()` filters them, but components must not crash on empty arrays); placeholder strings render as-is (no special styling required).

**F11. Theme toggle.** `ThemeToggle` component, `themes.js` (`export const THEMES = ['light', 'dark']`), `useTheme` hook. AC: REQ-204 to REQ-206; no flash of wrong theme on reload in dark mode.

**F12. Responsive pass.** AC: REQ-210 to REQ-212 at 320, 375, 390, 768, 1024, 1366, 1440, 2560 widths.

**F13. Accessibility pass.** Run axe (DevTools or `npx @axe-core/cli` against `npm run preview`) in both themes and fix issues. AC: REQ-300 to REQ-311.

**F14. Performance pass.** AC: REQ-400 to REQ-404 on `npm run build && npm run preview`.

**F15. Favicon and OG image.** `public/favicon.svg` (AL monogram, black/white) and `public/og-image.png` 1200x630 (black "Andrew Leick" on white; no headline, so it never needs a placeholder). If you cannot produce a PNG with the tools available, ship only the favicon and list "og-image.png missing" under "Requests for other owner" so backend sets `ogImage: null`.

---

## 10. QA test plan

QA runs against a clean checkout: `npm ci`, then the commands below. Record pass/fail per test ID in `docs/qa/REPORT.md` with evidence (command output, screenshots, Lighthouse JSON path). Note the requirement IDs each test covers. Test both themes where a test says "both themes". Use Chrome for Lighthouse.

### 10.1 Build and tooling
| ID | Test | Covers |
| :- | :- | :- |
| QA-001 | `npm run lint` exits 0 with 0 warnings. | REQ-600 |
| QA-002 | `npm test` passes. | REQ-110, B3 |
| QA-003 | `npm run validate` exits 0 and prints the "Content OK" line with warnings for placeholders. | REQ-112 |
| QA-004 | `npm run validate:strict` exits 1 while placeholders remain, listing each placeholder. | REQ-112, REQ-113 |
| QA-005 | `npm run build` succeeds; `dist/index.html`, `dist/robots.txt`, `dist/sitemap.xml` exist. | REQ-504, REQ-600 |
| QA-006 | `npm run check:size` passes and the printed sizes are within REQ-402. | REQ-402 |
| QA-007 | `npm run ci` passes end to end. | REQ-600 |
| QA-008 | Workflows exist; `deploy.yml` runs `validate:strict` before build; permissions and actions match 8.3. | REQ-601, REQ-602 |
| QA-009 | `package.json` dependencies are only `react` and `react-dom`. | REQ-405 |

### 10.2 Functional rendering (dev and preview)
| ID | Test | Covers |
| :- | :- | :- |
| QA-010 | Hero shows name (only h1), headline, summary, action row; resume button hidden while `resumeUrl` is null; appears after setting it to a real PDF path. | REQ-010, REQ-011 |
| QA-011 | Set `profile.photo` to a test image: it renders 160x160 with alt text; set to null: no image or placeholder. | REQ-012 |
| QA-012 | Section order matches `site.sections`; reorder two entries in `site.json`, reload: nav and page order change; set one `visible: false`: it disappears from page and nav. | REQ-001 |
| QA-013 | Empty `skills.json` (`[]`): Skills section and nav link disappear; no console errors. Restore. | REQ-002 |
| QA-014 | Experience entry shows role, organization, date label with `<time>`, type, location, highlights, tags; ordering newest-first per 7.4. | REQ-040 to REQ-043 |
| QA-015 | Project cards: featured first, "Featured" label, context line, status badge, link row only shows present links, no nested anchors (inspect DOM). | REQ-050 to REQ-054 |
| QA-016 | Education shows degree label and "Expected ..." date label. | REQ-060 |
| QA-017 | Skills groups render as tags; no bars or ratings. | REQ-070 |
| QA-018 | Contact: mailto link works; "Copy email" copies and announces "Email copied" (check live region in DOM / VoiceOver). | REQ-080 to REQ-082, REQ-310 |
| QA-019 | External links open in new tab with `rel="noopener noreferrer"` and hidden "(opens in new tab)" text; mailto does not. | REQ-090 |
| QA-020 | Nav: click each link, page scrolls, URL hash updates, focus lands on section heading, heading not under the sticky header; active link has `aria-current="location"` while scrolling. | REQ-020, REQ-022 to REQ-024 |
| QA-021 | No console errors or warnings in dev or preview. | general |

### 10.3 Data-editing workflow (the maintainability promise)
| ID | Test | Covers |
| :- | :- | :- |
| QA-100 | Add a project by appending one object to `projects.json` (copy the CONTENT-GUIDE example). With `npm run dev` running, it appears without restarting; `git diff --stat` shows only `projects.json` changed. | REQ-101, REQ-055 |
| QA-101 | Add an experience entry with `end: null`; it appears first with "– Present". Only `experience.json` changed. | REQ-101, REQ-040 |
| QA-102 | Edit an existing project's title and add a `links.demo`; card updates; "Live demo" link appears and becomes `primaryUrl` for the title link. | REQ-101, REQ-051 |
| QA-103 | Set `visible: false` on a project; it disappears. Set `featured: true` and `order: 0` on another; it moves first. | REQ-101 |
| QA-104 | Add a skill group; renders. | REQ-101 |
| QA-105 | Error messages: in turn introduce (a) typo key `technolgies`, (b) `"repo": "github.com/x/y"`, (c) end before start, (d) duplicate id, (e) trailing comma (invalid JSON), (f) `resumeUrl` pointing to a missing file. Each: `npm run validate` exits 1 with a message in the 6.11 format naming file, path, problem and hint; dev overlay shows it; `npm run build` fails. Revert each. | REQ-110, REQ-111, REQ-113, REQ-114 |
| QA-106 | Follow `docs/CONTENT-GUIDE.md` literally as a newcomer for "add a project" and "replace the resume PDF"; steps work as written. | B9 |

### 10.4 Theme and design tokens
| ID | Test | Covers |
| :- | :- | :- |
| QA-200 | Theme swap test: change `--color-bg`, `--color-text`, `--color-accent` in `themes/light.css` to a visible test palette (e.g. navy `#0b1f3a` bg / cream `#f5efe0` text); the whole site recolors with no component edits. Revert. | REQ-200, REQ-203 |
| QA-201 | New theme test: add `themes/test.css` with `:root[data-theme="test"]`, import it, add to `THEMES`, set `site.defaultTheme: "test"`, clear localStorage; site renders in test theme. Revert. | REQ-203, REQ-204 |
| QA-202 | Toggle: switches light <-> dark, label reads "Switch to dark theme"/"Switch to light theme", persists across reload, no flash of light theme when reloading in dark (record with throttled CPU). With `themeToggle: false` the toggle is absent. With localStorage blocked (private window), it still works for the session without errors. | REQ-204 to REQ-206 |
| QA-203 | Token discipline: `grep -rEn '#[0-9a-fA-F]{3,8}\b\|rgb\(\|hsl\(' src/components src/styles/base.css` returns nothing; `grep -rEn 'font-size:\s*[0-9]' src/components src/styles/base.css` returns nothing; components do not reference `--gray-*` primitives. | REQ-201, REQ-202 |
| QA-204 | Every semantic token in 4.5 is defined in both `light.css` and `dark.css`. | REQ-200 |

### 10.5 Responsive
| ID | Test | Covers |
| :- | :- | :- |
| QA-300 | At 320, 375, 390, 768, 1024, 1366, 1440, 2560 px: no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`), no overlapping text, layout changes match 4.9. Screenshot each in both themes. | REQ-210 |
| QA-301 | At 390x844 and 1366x768, hero essentials (name, headline, summary, resume button when set, contact links) visible without scrolling. | REQ-013, SC-1 |
| QA-302 | 200% zoom and 24px default font size: content readable, nothing clipped. | REQ-211 |
| QA-303 | Mobile menu: opens/closes, `aria-expanded` toggles, `Esc` closes and returns focus, link click closes. | REQ-021, REQ-309 |
| QA-304 | Print preview: nav and toggle hidden, light colors, URLs printed after external links. | REQ-213 |

### 10.6 Accessibility and keyboard
| ID | Test | Covers |
| :- | :- | :- |
| QA-400 | Keyboard only: Tab from page load; first stop is skip link, Enter moves focus to main; every interactive element reachable in visual order; focus ring visible on each; nothing focused is hidden under the header. | REQ-302, REQ-304, REQ-305, REQ-024 |
| QA-401 | axe-core (DevTools or `npx @axe-core/cli http://localhost:4173`) in both themes: 0 violations. | REQ-301 |
| QA-402 | Landmarks and headings: one h1, h2 per section, h3 per entry, no skipped levels; landmarks per REQ-303 (use the browser accessibility tree or the HeadingsMap extension). | REQ-303, REQ-308 |
| QA-403 | Contrast spot-check in both themes for body, muted, tag text, button text (DevTools contrast picker). | REQ-300 |
| QA-404 | Enable OS "reduce motion": nav clicks jump without smooth scroll; no transitions. | REQ-306 |
| QA-405 | VoiceOver (macOS) pass: hero, nav, a project card, theme toggle, copy button announce sensibly. Icon-only controls have names. | REQ-307, REQ-310 |
| QA-406 | Target sizes: buttons and icon links >= 44x44 (DevTools box model). | REQ-212 |

### 10.7 Performance, SEO, links
| ID | Test | Covers |
| :- | :- | :- |
| QA-500 | Lighthouse mobile on `npm run preview` (incognito): Perf >= 95, A11y = 100, Best Practices >= 95, SEO = 100. Save JSON reports to `docs/qa/lighthouse/`. Also run desktop. | REQ-400, REQ-301, SC-2 |
| QA-501 | Same run: LCP <= 2.0 s, CLS <= 0.05, TBT <= 100 ms. | REQ-401 |
| QA-502 | Network panel: no requests to any origin other than the preview host. | REQ-403 |
| QA-503 | All `<img>` have width/height; below-fold images lazy. | REQ-404 |
| QA-504 | `dist/index.html` contains title, description, canonical, OG and Twitter tags, JSON-LD (valid JSON, `@type: Person`, no `TODO` text), noscript content; `index.html` source contains no hardcoded SEO tags. Paste JSON-LD into the schema.org validator. | REQ-500 to REQ-505, REQ-703 |
| QA-505 | `npm run check:links` passes (LinkedIn 999 allowed as warning). Placeholder LinkedIn URL is reported. | REQ-090 |
| QA-506 | Disable JavaScript: noscript block shows name and links; page background is light and readable. | REQ-505, REQ-203 |

### 10.8 Ownership and process
| ID | Test | Covers |
| :- | :- | :- |
| QA-700 | Using git history / file timestamps and the engineers' reports, confirm each changed file is within its owner's paths per 7.1. List any violation. | REQ-700 |
| QA-701 | `grep -rn "src/data\|\.json'" src/components src/App.jsx src/main.jsx`: components import content only via `src/lib/content`. | REQ-701 |
| QA-702 | `src/lib/content/index.js` exports exactly the API in 7.2, and returned objects match 7.3 (spot-check in a vitest or browser console). | REQ-702 |
| QA-703 | `index.html` contains each marker once; built HTML contains no leftover markers. | REQ-703 |
| QA-704 | `src/components/__dev__/` does not exist and nothing imports a fixture. | 7.6 |
| QA-705 | No fabricated facts: every non-placeholder fact in `src/data/**` appears in section 11 or in the resume once supplied. Flag anything else. | Hard rule |

---

## 11. Known facts and GitHub findings

Only these facts may appear as non-placeholder content until the resume arrives.

| Fact | Source |
| :- | :- |
| Name: Andrew Leick | GitHub profile name |
| Email: andrew.leick23@gmail.com | Provided by Andrew |
| GitHub username: `Andrew-Leick` (https://github.com/Andrew-Leick) | `gh api user` |
| GitHub bio: "CS + EE @ Stanford. Robotics and General Projects"; company: Stanford University | GitHub profile (degree, major and dates still need the resume) |

GitHub public repositories owned by `Andrew-Leick` (as of 2026-11-09): **1**.
- `CS131_release`: a **fork** of `StanfordVL/CS131_release` (Stanford CS131 Computer Vision course assignments, Jupyter Notebook). Not his original work, and it is course homework. **Decision: do not list it as a project.** It may appear as coursework under Education if Andrew wants (Q5).

Pinned on his profile (owned by someone else, public):
- `CarterDessommes/NFL-Play-Reconstruction`: Jupyter Notebook / Python. README title "CFB CV Project, College Football Computer Vision Project", with a benchmark harness for speed/accuracy on labeled key frames. Contributors: CarterDessommes (42 commits), Andrew-Leick (20), efrainangon (9). Andrew's commit messages mention the jersey-number model, the game database, and game footage. **Decision: include as the featured project**, with role and outcomes as placeholders until Andrew confirms (example in 6.8).

Implication: the Projects section will be thin. Q4 asks Andrew for more projects (private repos he can make public, class projects he is allowed to share, robotics work).

---

## 12. Content-intake checklist (from the resume and Andrew)

When the resume arrives, the backend (or whoever edits content) fills these fields, then runs `npm run validate:strict` until it passes. Leave any field `null`/omitted rather than guess.

**Profile (`profile.json`, `site.json`)**
- [ ] Headline: target role (e.g. "Software Engineer", "Robotics Software Engineer"), max 80 chars
- [ ] Summary: 1 to 2 sentences, max 280 chars
- [ ] About: 1 to 4 short paragraphs (background, interests, what he wants next)
- [ ] Location to display (city, or "Remote"), or none
- [ ] Availability line (e.g. graduation date / start date / internship vs full-time), or none
- [ ] Contact blurb, one line
- [ ] Site meta description, 50 to 160 chars
- [ ] Resume PDF file (final version) -> `public/content/resume/andrew-leick-resume.pdf`
- [ ] Headshot (optional): square, >= 320x320, -> `public/content/images/headshot.webp` (<= 60 KB), plus alt text

**Links (`links.json`)**
- [ ] LinkedIn URL
- [ ] Any other profiles (personal site, Google Scholar, Devpost, etc.)
- [ ] Confirm the email address to publish

**Experience (`experience.json`)**, for each position:
- [ ] Organization name and website
- [ ] Role / title
- [ ] Type (internship, research, teaching, part-time, ...)
- [ ] Location (or Remote)
- [ ] Start month/year, end month/year or "present"
- [ ] Up to 6 bullets (action, what, measurable result), max 240 chars each
- [ ] Technologies used (max 12)

**Education (`education.json`)**
- [ ] Degree(s) (B.S./M.S./coterm), major(s), minor
- [ ] Start and (expected) graduation month/year
- [ ] GPA, only if Andrew wants it shown
- [ ] Honors/awards
- [ ] Relevant coursework to list (max 12)

**Projects (`projects.json`)**, for each project:
- [ ] Title, 1 to 2 sentence summary
- [ ] Andrew's specific role/contribution
- [ ] Solo or team (team size); context (course, hackathon, research, personal)
- [ ] Dates; status (complete / in progress / archived)
- [ ] Up to 6 highlights with results/metrics
- [ ] Tech stack
- [ ] Links: repo (public), demo, write-up/video
- [ ] Screenshot (optional, 1200x675, <= 150 KB WebP) and alt text
- [ ] Which 2 to 4 projects are featured, and their order

**Skills (`skills.json`)**
- [ ] Languages, frameworks/libraries, tools/platforms (and any other groups, e.g. "Robotics" or "Hardware")

---

## 13. Open questions for Andrew

1. **Q1 Hosting repo:** OK to create a public GitHub repo `Andrew-Leick.github.io`, push this project there, and enable Pages with "GitHub Actions" as the source? (Agents will not create or push the repo.) If you would rather keep the repo name `personal-website`, the site URL becomes `https://andrew-leick.github.io/personal-website/` and the workflow sets `BASE_PATH=/personal-website/`.
2. **Q2 Custom domain:** do you own or want a domain (e.g. `andrewleick.com`)? If yes, we add `public/CNAME` and change `site.siteUrl`.
3. **Q3 Resume PDF and photo:** please provide the resume (the source for section 12) and the PDF to publish, plus a headshot if you want one shown.
4. **Q4 Projects:** your only public repo is a fork of CS131 assignments. Which other projects can be shown (private repos that could be made public, class projects you are allowed to share, robotics or hardware work)? For NFL-Play-Reconstruction: what did you personally build, what were the results, and is it OK to feature a repo owned by CarterDessommes?
5. **Q5 CS131 fork:** should it stay public? It likely contains course homework; check Stanford's honor code rules on posting solutions. We will not feature it either way; list CS131 under coursework only if you want.
6. **Q6 LinkedIn URL** and any other profile links.
7. **Q7 Target role and availability:** which roles (SWE, robotics, ML/CV, embedded) and when (internship vs full-time, start date)? This drives the headline and summary.
8. **Q8 Analytics:** the spec ships with no analytics (privacy and performance). Do you want privacy-friendly analytics later? (Would need a spec change to REQ-403.)
9. **Q9 Location:** show a city, "Bay Area", or nothing?
10. **Q10 GPA:** show it or not?

---

## 14. Requirement index

| Range | Area | Section |
| :- | :- | :- |
| REQ-001 to REQ-002 | section order/visibility from data | 3.1 |
| REQ-010 to REQ-013 | hero | 3.4 |
| REQ-020 to REQ-024 | navigation | 3.3 |
| REQ-030 | about | 3.4 |
| REQ-040 to REQ-043 | experience | 3.4 |
| REQ-050 to REQ-055 | projects | 3.4 |
| REQ-060, REQ-070 | education, skills | 3.4 |
| REQ-080 to REQ-082 | contact | 3.4 |
| REQ-090 | link rules | 3.5 |
| REQ-101 | single-file data edits, no code changes | 1.3, 6 |
| REQ-110 to REQ-114 | validation | 6.11 |
| REQ-200 to REQ-206 | tokens and themes | 4.1 to 4.6 |
| REQ-210 to REQ-213 | responsive, print | 4.9, 4.11 |
| REQ-300 to REQ-311 | accessibility | 5.1 |
| REQ-400 to REQ-405 | performance | 5.2 |
| REQ-500 to REQ-505 | SEO and sharing | 5.3 |
| REQ-600 to REQ-602 | scripts and workflows | 8 |
| REQ-700 to REQ-703 | ownership and interface | 7 |

REQ-200: all colors/typography/spacing come from tokens in `src/styles/tokens.css` and `src/styles/themes/*.css`. REQ-201: component CSS uses no literal colors/font sizes. REQ-202: components use semantic tokens, never primitives. REQ-101: adding/editing/hiding/reordering an experience, project, education entry, skill group or link is a single-file edit in `src/data/` with no component changes.

---

## 15. Sources

- [S1] The Ladders 2018 eye-tracking study, summarized by HR Dive: https://www.hrdive.com/news/eye-tracking-study-shows-recruiters-look-at-resumes-for-7-seconds/541582/ (methodology has critics; used only as directional evidence that skimmability matters).
- [S2] CareerFoundry, "The Ultimate Software Engineer Portfolio Guide": https://careerfoundry.com/en/blog/web-development/software-engineer-portfolio/
- [S3] Arc.dev, "How to Build a Software Engineer Portfolio": https://arc.dev/talent-blog/software-engineer-portfolio/
- [S4] Springboard, "Software Engineer Portfolio": https://www.springboard.com/blog/software-engineering/software-engineer-portfolio/ ; Taro, "Creating a portfolio that makes recruiters come to you": https://www.jointaro.com/lesson/wuiq8vI7ablCd09zkz0x/creating-a-portfolio-that-makes-recruiters-come-to-you/ (notes a portfolio supports applications rather than generating inbound interest on its own).
- [S5] Examples of minimal, Lighthouse-tested developer portfolios with semantic landmarks and AA contrast: https://jerrybature.github.io/projects/portfolio.html , https://montreuil.pages.dev/articles/building-montreuil-dev
- [S6] W3C, "What's New in WCAG 2.2": https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
- [S7] WebAIM, WCAG 2.2 checklist: https://webaim.org/standards/wcag/wcag22
- [S8] web.dev, "How the Core Web Vitals metrics thresholds were defined": https://web.dev/articles/defining-core-web-vitals-thresholds
- [S9] Vite, "Deploying a Static Site", GitHub Pages section: https://vite.dev/guide/static-deploy.html
