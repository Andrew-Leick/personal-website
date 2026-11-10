# QA report

Owner: QA. Date: 2026-11-09. Nothing was committed or pushed.

Setup:
- Build under test: the working tree at `/Users/andrewleick/personal-website` (no commits yet), Node 24.22.0.
- Browser checks: headless Chrome over CDP, against `npm run preview` (port 4173) and `npm run dev` (port 5173).
- axe-core and Lighthouse were installed in a scratch directory outside the repo. `package.json` is unchanged.

Evidence is in the QA scratch directory `/private/tmp/claude-501/-Users-andrewleick/4e26215d-ae89-47ea-9607-02fd7271ed76/scratchpad/qa/`:
- `logs/`: command output
- `shots/`: screenshots
- `lighthouse/`: Lighthouse JSON
- `t*.mjs` and `t*.json`: browser test scripts and their results
- `baseline/`: a copy of the tree taken before testing

The spec names `docs/qa/REPORT.md` and `docs/qa/lighthouse/`. Per the QA brief, the report is here instead and the Lighthouse JSON stays out of the repo.

**Revert proof:** every test edit was made to the real files and then restored from `baseline/`. These edits covered data files, theme CSS, `themes.js`, `site.json`, a temporary test headshot, and broken JSON. After all tests, `diff -rq` against the baseline shows only the engineers' QA fixes (listed below) and this report.

## Verdict: NO-GO for launch (content and privacy blockers only)

The software passes every requirement QA could test:
- Lighthouse 100/100/100/100 on mobile and desktop.
- 0 axe violations in both themes.
- All QA-0xx to QA-7xx tests pass.

The launch is blocked by content decisions that only Andrew can make.

### Launch blockers
1. **The resume PDF exposes the phone number and cities.**
   - `public/content/resume/andrew-leick-resume.pdf` is byte-identical to `docs/AndrewLeick_Resume.pdf` (`cmp`).
   - It shows `678-699-0321`, "Palo Alto, CA", "Seattle, WA" (twice) and "Atlanta, GA" (twice).
   - It is linked from the hero "Resume (PDF)" button and from the noscript block. It would be public on deploy.
   - This contradicts the CONTENT-FACTS decisions "no phone" and "no locations".
   - Fix: supply a redacted PDF at the same path (no data change needed), or set `profile.resumeUrl` to `null`.
   - QA did not alter the file. The validator cannot detect this.
2. **`TODO:` placeholders remain.** `npm run validate:strict` exits 1, so the deploy workflow will refuse to publish. The two placeholders:
   - `profile.availability`. It is **visible in the hero** as "TODO: target roles and availability…".
   - `projects[0].highlights[0]`: "TODO: add results/metrics and confirm the course context." It is visible on the NFL card.
3. **The public email is not confirmed.** The site shows `aleick@stanford.edu`, which comes from the resume. CONTENT-FACTS marks it "to be confirmed by Andrew before launch".

Not blockers but needed before go-live:
- Create the `Andrew-Leick.github.io` repo, push, and set Pages to "GitHub Actions" (Andrew's step).
- The custom domain is still pending (see "Needs Andrew's input").

## Results at a glance

| Area | Result |
| :- | :- |
| Requirements traced | 76 REQ IDs: **74 pass**, **2 partial**, **0 fail**. The 2 partials are REQ-301 (manual VoiceOver not run) and REQ-700 (no git history to audit ownership). Locations are intentionally not rendered: REQ-010/041/060 pass with the CONTENT-FACTS override |
| QA tests (section 10) | 58 tests: **55 pass**, **3 pass with substitution or limitation** (QA-405 VoiceOver, QA-700 ownership, QA-504 schema.org validator; see notes), **0 fail** |
| Defects found | 3 (D-01 medium, D-02 low, D-03 low) |
| Defects fixed and re-verified | 3 of 3, each fixed on the first attempt |
| Content audit | Every fact traces to CONTENT-FACTS.md and the resume. No phone, no location, no CS131, no gmail, no fabricated metric on the site. The **resume PDF** is the exception (blocker 1) |

## Command results (final run, after fixes)

| Command | Result |
| :- | :- |
| `npm run lint` | exit 0, 0 warnings |
| `npm test` | 5 files, 98/98 pass |
| `npm run validate` | exit 0: `Content OK: 4 experience, 1 education, 1 project, 3 skill groups, 3 links (2 warnings)` |
| `npm run validate:strict` | exit 1. Lists both placeholders as `✖`, then `Content invalid: 2 errors, 0 warnings` |
| `npm run build` | exit 0. `dist/index.html`, `robots.txt`, `sitemap.xml`; no markers left |
| `npm run check:size` | JS 77.4 KB, CSS 4.1 KB, initial 82.8 KB gzip (budgets 90 / 15 / 150) |
| `npm run check:links` | exit 0. GitHub, Stanford and the NFL repo return 200. LinkedIn returns 999 (warning). `siteUrl` returns 404 because the site is not deployed yet (warning). 8 nav anchors verified |
| `npm run ci` | exit 0 |
| Lighthouse mobile | Perf 100, A11y 100, Best Practices 100, SEO 100; LCP 0.8 s, CLS 0, TBT 0 ms |
| Lighthouse desktop | 100 / 100 / 100 / 100; LCP 0.2 s, CLS 0, TBT 0 ms |
| axe-core (WCAG 2.0/2.1/2.2 A+AA + best-practice) | 0 violations: light and dark × 1366 and 390. The only "incomplete" item is the decorative `★` glyph (`aria-hidden`) |

## Traceability: requirements

| REQ | Status | Evidence |
| :- | :- | :- |
| 001 | Pass | Swapping About and Experience in `site.json` reorders both the nav and the page. Hiding Education removes it from both (t7 `qa012`) |
| 002 | Pass | `skills.json = []` removes the section and its nav link, and the eyebrows renumber 01–05. No console errors (t7 `qa013`) |
| 010 | Pass (override) | One `h1`, headline, summary, and the availability line. Location is never rendered, per CONTENT-FACTS |
| 011 | Pass | "Resume (PDF)" has `target=_blank`, `rel="noopener noreferrer"` and hidden "(opens in new tab)" text. It disappears when `resumeUrl: null`. Hero links have `aria-label`, and text labels show at ≥480 px |
| 012 | Pass | Test headshot: 160×160 (120×120 at 390 px), alt from data, `width`/`height` set, `fetchpriority=high`, not lazy, radius 9999px. With null there is no element |
| 013 | Pass | Name, headline, summary, resume button and links all sit above the fold at 390×844 and 1366×768, in both themes (`shots/w390-*-fold.png`, `w1366-*-fold.png`) |
| 020 | Pass | ≥768 px: inline nav, menu button hidden |
| 021 | Pass | <768 px: "Menu" button 89×44 with `aria-expanded` and `aria-controls`. Esc closes and refocuses the button. Clicking a link closes it. Clicking outside closes it. No focus trap |
| 022 | Pass | For all 6 links the hash updates and focus moves to `#{id}-heading`, which sits at 132 px, below the 57 px header. Keyboard Enter does the same. Scrolling is smooth only with no-preference |
| 023 | Pass | `aria-current="location"` follows the scroll: About→…→Contact, Contact at the bottom, none in the hero. Implemented with IntersectionObserver |
| 024 | Pass | `scroll-padding-top` is set. Tab walk at 1366 and 390: 0 focused elements hidden under the header or off-screen |
| 030 | Pass | 3 About paragraphs, capped at `--measure` |
| 040 | Pass | `<ol>`, newest first per 7.4. FIRST (ends May 2024) sorts before GTRI (ends Jul 2023), which follows the "end desc" rule |
| 041 | Pass (override) | Role h3 · org, `<time datetime>`, and "Internship". The org link renders when `organizationUrl` is set (Acme test). No location |
| 042 | Pass | Highlights `<ul>`, then tags in `<ul aria-label="Technologies">` |
| 043 | Pass | 11rem date column at ≥1024. Below 1024 the date sits inline. The duplicate date is hidden with `display:none` |
| 050 | Pass | 1 column below 768, 2 columns at 768 and up. Featured projects first |
| 051 | Pass | Card order matches the spec. The link row shows only the links present. The context line shows ★ and language. With a demo the title links to the demo (QA-102) |
| 052 | Pass | No nested anchors. 1px border, and the border turns strong on `:hover`/`:focus-within` |
| 053 | Pass | "Featured" text badge |
| 054 | Pass | "In progress" badge |
| 055 | Pass | QA-100 and QA-103 |
| 060 | Pass (override) | "B.S. Electrical Engineering", "Expected Jun 2028", "GPA 3.83/4.0", coursework tags in `<ul aria-label="Relevant coursework">`. No location |
| 070 | Pass | 3 groups as tags. No bars or ratings |
| 080 | Pass | Contact blurb |
| 081 | Pass | Mailto link with the address as its text. Copy puts `aleick@stanford.edu` on the clipboard; the button shows "Copied" and the live region says "Email copied", then both reset after 2 s. On a forced rejection it shows "Copy failed", and the mailto still works |
| 082 | Pass | All 3 links show icon + text |
| 090 | Pass | Every external link has `_blank` + `noopener noreferrer` + hidden text. Mailto has neither. Underlined by default |
| 101 | Pass | QA-100 to QA-104: each was a single-file edit with no component change |
| 110 | Pass | `validateContent` is pure and unit-tested (98 tests) |
| 111 | Pass | All 6 error cases use the 6.11 format, including `[i] (id "…")` and the hint |
| 112 | Pass | Exit codes and summary lines as above |
| 113 | Pass | `build` fails on each error case. `deploy.yml` runs `validate:strict` before `ci` |
| 114 | Pass | The dev overlay shows the same messages for all 6 cases and clears after the fix with a full reload. The overlay covers the stale page, so it is not silent |
| 200 | Pass | Tokens only. QA-200 swap recolors bg, text, button and header from one file |
| 201 | Pass | QA-203 grep for literal colors and font sizes: empty |
| 202 | Pass | No `--gray-*` in components or base.css |
| 203 | Pass | QA-200 and QA-201 |
| 204 | Pass | Saved choice wins. `defaultTheme:"dark"` beats an OS light setting. "system" follows the OS live. An invalid saved value (`navy`) falls back to light |
| 205 | Pass | Inline bootstrap script. At 6× CPU throttle with dark saved, `data-theme=dark` and bg `#0a0a0a` hold at body insertion, first paint and FCP. The same holds for OS dark with nothing saved |
| 206 | Pass | 44×44 button. Labels "Switch to dark theme" / "Switch to light theme". It persists. `theme-color` updates (`#0a0a0a` / `#fff`). A custom theme goes to dark, then alternates. `themeToggle:false` removes the button |
| 210 | Pass | No horizontal scroll at 320, 375, 390, 768, 1024, 1366, 1440 or 2560, in both themes |
| 211 | Pass | 24 px root at 320, 390 and 1366, and 200% zoom (683@2x, 195@2x): no overflow. The header name truncates with an ellipsis at 320/24 px (documented; the full name is the h1 below) |
| 212 | Pass | All buttons and icon links ≥44 px tall. Heading links are 35 px tall (≥24) |
| 213 | Pass | In print with dark saved: white bg, `#0a0a0a` text. Nav, toggle, skip link and copy are hidden. `(https://…)` is printed after links. `break-inside: avoid` (`shots/print-emulated.png`, `shots/print.pdf`) |
| 300 | Pass | Light: body 19.8:1, muted 7.81, tags 13.5, button 19.8. Dark: 18.97 / 7.85 / 14.2 / 18.97 |
| 301 | Partial | axe 0 and Lighthouse A11y 100 in both themes. Manual VoiceOver was not run (headless environment) |
| 302 | Pass | The first Tab is "Skip to content", visible at top 8px. Enter focuses `#main`. The next Tab goes to Resume |
| 303 | Pass | One header, `nav[aria-label=Primary]`, main and footer. Sections use `aria-labelledby` |
| 304 | Pass | 25 tab stops at desktop in the order header → hero → sections → footer. 0 positive tabindex |
| 305 | Pass | Every stop has a 2px solid `:focus-visible` ring |
| 306 | Pass | Under reduce: `scroll-behavior:auto`, transitions 0s, nav jumps instantly |
| 307 | Pass | Icons are `aria-hidden`. Icon-only hero links have `aria-label`. Photo alt comes from data |
| 308 | Pass | `lang="en"`. Title is injected |
| 309 | Pass | See 021 |
| 310 | Pass | Live region is `aria-live=polite aria-atomic`. The toggle label states the action |
| 311 | Pass | DOM order matches visual order. No `order` tricks |
| 400 | Pass | Lighthouse mobile 100/100/100/100 |
| 401 | Pass | LCP 0.8 s, CLS 0, TBT 0 ms |
| 402 | Pass | `check:size` |
| 403 | Pass | The only request origin is `http://localhost:4173`. No fonts, analytics or CDNs |
| 404 | Pass | No images in the current content. The headshot test had width/height. Project images use `loading=lazy decoding=async` (code) |
| 405 | Pass | dependencies: `react` and `react-dom` only |
| 500 | Pass | `<title>Andrew Leick \| Electrical Engineering student at Stanford University</title>`. Description is 139 chars |
| 501 | Pass | Canonical is `https://andrew-leick.github.io/` |
| 502 | Pass | All OG and Twitter tags, plus `og:locale`, `og:site_name` and `twitter:image:alt` |
| 503 | Pass | JSON-LD parses. `Person` with name, url, jobTitle, `mailto:` email, sameAs (GitHub, LinkedIn) and alumniOf Stanford. No TODO, no address |
| 504 | Pass | `robots.txt` and `sitemap.xml` are correct. With a custom `siteUrl` (test), the build emits `CNAME` (`qa-example.dev`) and the canonical, robots and sitemap follow it. A `BASE_PATH` mismatch prints a warning |
| 505 | Pass | Noscript shows the name, the sentence, and links to the resume, GitHub, LinkedIn and email. The page stays light and readable with JS off and OS dark. Padding fixed in D-03 |
| 600 | Pass | Scripts match 8.2 |
| 601 | Pass | `ci.yml`: PRs and non-main pushes; Node from `.nvmrc`; `npm ci`; `npm run ci` |
| 602 | Pass | `deploy.yml`: push to main plus dispatch; the required permissions; concurrency `pages`; `validate:strict` before ci; configure, upload and deploy Pages; `github-pages` environment |
| 700 | Partial | There is no git history to audit. File contents and both hand-offs show each side stayed in its own paths. D-01/D-02 touched only backend files and D-03 only frontend files |
| 701 | Pass | QA-701 grep is empty. App imports only `src/lib/content/index.js` |
| 702 | Pass | `index.js` exports the 7.2 list exactly. Shapes checked through the rendered output and the 98 tests |
| 703 | Pass | Each marker appears once in `index.html`; none remain in `dist/index.html` |

## QA test results (section 10)

| Test | Result | Notes |
| :- | :- | :- |
| QA-001 to QA-009 | Pass | See command results. Workflows reviewed by hand |
| QA-010 | Pass | Resume button hidden when `resumeUrl` is null, shown with a path |
| QA-011 | Pass | Headshot test (temporary WebP, removed afterwards) |
| QA-012, QA-013 | Pass | |
| QA-014 to QA-019 | Pass | |
| QA-020 | Pass | |
| QA-021 | Pass | Preview: 0 console messages. Dev: only Vite connect messages and the React DevTools info line |
| QA-100 | Pass | The CONTENT-GUIDE example project rendered without a server restart (HMR full reload). Context: "Personal project · Solo project · 2026". The title links to the demo. Code, Live demo and Write-up all appear |
| QA-101 | Pass | `end:null` sorts first as "Jun 2027 – Present". Editing an existing role updated in place |
| QA-102 | Pass | Title edit plus `links.demo`: the title link becomes the demo URL and "Live demo" appears |
| QA-103 | Pass | |
| QA-104 | Pass | |
| QA-105 | Pass | All 6 cases (validate, build, overlay). Example: `✖ src/data/experience.json → [0] (id "amazon-sde-intern-2026").technolgies: unknown field. Hint: did you mean "technologies"?` |
| QA-106 | Pass | The guide's project example and the resume-replacement steps work as written |
| QA-200 to QA-204 | Pass | Navy/cream swap; new `test` theme including a theme-local primitive; 16 tokens defined in both theme files |
| QA-300 to QA-304 | Pass | Screenshots: `shots/w{width}-{light,dark}-full.png` |
| QA-400 to QA-404, QA-406 | Pass | |
| QA-405 | Not run (substituted) | VoiceOver needs an interactive Mac session. Substitutes: axe accessible-name rules, a DOM audit of every `aria-label`, and the live-region text. Andrew should do a 5-minute VoiceOver pass |
| QA-500, QA-501 | Pass | `lighthouse/mobile.json`, `desktop.json`, `mobile-final.json` |
| QA-502, QA-503 | Pass | |
| QA-504 | Pass (local) | JSON-LD parsed and checked against the schema.org Person fields. The online validator was not used, because the site is undeployed and data was not sent to external services |
| QA-505 | Pass | |
| QA-506 | Pass | |
| QA-700 | Pass with limitation | See REQ-700 |
| QA-701 to QA-704 | Pass | `src/components/__dev__` does not exist |
| QA-705 | Pass | See the content audit |

## Defects

| ID | Severity | Owner | Requirement | Found | Fix and re-test |
| :- | :- | :- | :- | :- | :- |
| D-01 | Medium | backend | REQ-051; CONTENT-FACTS "describe his role precisely" | The NFL card said the same thing three times: the summary sentence "I built the jersey number recognition model, the team classifier, and the offense/defense classifier", then the identical `role`, then three highlights repeating it | **Fixed (attempt 1).** The summary now describes only the project, the role is stated once, and the duplicate highlights are removed. Re-verified on the card (`shots/project-card-fixed.png`); validate, test and build pass |
| D-02 | Low | backend | UX / content | The hero summary began "Stanford Electrical Engineering student…", repeating the headline directly above it. It also said "serverless", an inference not in the facts | **Fixed (attempt 1).** It now reads "Seeking software development roles. Two summers as a Software Development Engineer Intern at Amazon, building systems on AWS." Re-verified |
| D-03 | Low | frontend | REQ-505 / UX | The noscript fallback text sat flush against the viewport's top-left corner with no spacing | **Fixed (attempt 1).** `<div class="noscript">` around the marker (marker still appears once), plus a token-only `.noscript` rule in `base.css`. Re-verified at 320 and 1024 with JS off (`shots/noscript-fixed-*.png`): no overflow, QA-203 grep still empty, axe 0, Lighthouse 100×4 |

There are no open defects in the code.

## Content audit (CONTENT-FACTS.md and the resume PDF)

Every rendered fact traces to the facts file and the resume:
- **Name, email, GitHub, LinkedIn:** match. The resume prints the LinkedIn path as `Andrew-Leick`; the site uses the `andrew-leick` path given in CONTENT-FACTS.
- **Education:** Stanford, B.S. Electrical Engineering, GPA 3.83/4.0, Expected Jun 2028. All 9 courses appear. "Fall 26" is written as "Fall 2026".
- **Skills:** the three groups match exactly. "Cloud" is labeled "Cloud (AWS)" and the "AWS" prefix is dropped from items. Equivalent.
- **Experience:**
  - Both Amazon internships, GTRI and FIRST Robotics have the right titles and months.
  - The bullets match the resume word for word, with small grammar fixes ("a robot", "an audience"). One Amazon 2026 bullet was split in two to stay under the 240-character limit; no wording or facts changed.
  - The technology tags match the facts file.
- **Project:**
  - NFL Play Reconstruction: three-person team, the three components Andrew built, Python only, repo link.
  - The repo stats (★ 0, "Jupyter Notebook") come from the GitHub sync.
  - No metrics, no course claim (the course context is still a TODO), no libraries beyond Python.
- **Prose** (summary, About, `site.description`, contact blurb): restatements of the facts above. Nothing was added after D-02.

Checks:
- `grep` of `src/`, `index.html` and `dist/` (HTML, JS, robots, sitemap) for the phone number, Palo Alto, Seattle, Atlanta, CS131 or gmail: no matches. CS131 appears only in the sync script's `EXCLUDE` list and the content guide.
- JSON-LD has no address and no TODO.
- **Exception:** the linked resume PDF (blocker 1).

The "Extracurriculars" label from the resume is not shown. FIRST Robotics sits in Experience with no type label, which CONTENT-FACTS allows. See the UX observations.

## Needs Andrew's input

1. **Redacted resume PDF** (blocker), or hide the resume button.
2. **Confirm the public email** (`aleick@stanford.edu`; the earlier spec had `andrew.leick23@gmail.com`).
3. **Availability and target roles.** Replaces the visible hero TODO. Also review the headline "Electrical Engineering student at Stanford University", which the backend drafted.
4. **NFL project:**
   - results or metrics, or decide to drop that highlight;
   - course context;
   - status: in progress or complete;
   - whether "NFL" is the right title for a college-football project (it is the repo name);
   - that featuring a classmate's repo is OK.
5. **Custom domain.** None chosen; changing it is a one-line `siteUrl` edit (CONTENT-GUIDE "Custom domain").
6. **Hosting.** Create the `Andrew-Leick.github.io` repo, push, and enable Pages (README "Deploy").
7. **Optional:** a headshot, and more projects (the Projects section is thin).
8. **Quick VoiceOver pass** (QA-405), and a check that the LinkedIn URL opens (it returns 999 to bots).

## UX observations (not defects)

- **Overall:** the site looks clean and professional in both themes at every tested width. The typography hierarchy is clear, spacing is generous, and the layout is single-column and skimmable. The Experience section reads well, and the 11rem date column at desktop is a good touch.
- **The hero TODO line** is the most visible flaw today. It goes away when Andrew supplies availability (or the field is set to `null`).
- **"★ 0" GitHub stars** on the NFL card are spec-compliant (REQ-051) but advertise zero stars. Recommendation for the planner/Andrew: hide the star count when it is 0. This needs a one-line spec change; the frontend has not changed it.
- **A single project in a two-column grid** leaves the right half empty at ≥768 px. The spec's uniform grid is correct, and this resolves itself once a second project is added. Adding projects is the best fix for the thin section.
- **FIRST Robotics** (an extracurricular on the resume) sits between the Amazon and GTRI internships with no label. That is correct by the sort rule, but a recruiter may read it as a job. Option: set `employmentType` to a fitting value if Andrew agrees, or add a small "Leadership" section later (needs a spec change).
- **The headline and About paragraph 1** still overlap a little ("Electrical Engineering… Stanford"). That is acceptable.
- **The header name truncates** with an ellipsis only at 320 px with a 24 px root font (documented edge case).
- **`<meta name="theme-color">`** starts as `#ffffff` until React mounts, even in dark mode. It is cosmetic (mobile browser chrome only) and the spec mandates this initial value.
