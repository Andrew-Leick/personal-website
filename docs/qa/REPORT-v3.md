# QA report v3 (Pokemon theme, minimal home)

Owner: QA. Date: 2026-11-10. Spec: `docs/spec/SPEC-v3.md` section 13. Nothing was committed or pushed.

Build under test: the working tree after frontend's final rebuild (`dist/` at about 10:40), Node 24.22.0, headless Chrome over CDP against `npm run preview` (port 4173) and `npm run dev` (copy of the tree, port 5174). axe-core and Lighthouse were installed outside the repo. Evidence (scripts, JSON, screenshots, logs) is in `/private/tmp/claude-501/-Users-andrewleick-personal-website/d9b933ec-fe7e-4d0a-ae32-e10449ede972/scratchpad/qa/v3/` (`*.mjs` scripts and `*.json` results, `lh/` Lighthouse JSON, `shots/` screenshots, `logs/` command output).

**Revert proof.** All test edits (site.json guide swaps, `fanArt`, invalid values, token and theme edits, the new test theme, BASE_PATH build, the 4th page) were made in a scratch copy of the tree (`qa/v3/work`, with `work.orig` as the baseline), never in the repo. After every edit `diff -r work work.orig -x node_modules` printed nothing (CLEAN). The only in-repo write was one corrupted byte in `dist/fonts/pixelify-sans-latin-700.woff2` for QA-1003, restored from a byte copy (`check:routes` exits 0 again). `docs/qa/REPORT-v3.md` is the only file QA added to the repo.

## Verdict

**GO for v3 on the engineering side.** Every testable checkbox passes after three defects were found and fixed (D-01 to D-03, all re-verified). Only human-only items remain (below).

Final numbers: `npm run ci` exit 0; 188 tests; JS 81.58 KB gzip (limit 90), CSS 5.56 KB (15), fonts 27.45 KB raw = 28,108 bytes (32 KB), initial transfer 116.21 KB (150); Lighthouse 100/100/100/100 on all 8 runs (LCP at most 0.79 s, CLS 0, TBT at most 12 ms); axe 0 violations everywhere tested; sprite crispness 0 mismatches.

## Open for Andrew (human-only, unchanged by v3)
1. The resume PDF still exposes the phone number and cities (not touched).
2. `TODO:` placeholders remain: `profile.availability` (now visible on About) and the NFL results highlight (visible on the card). `validate:strict` still fails, so deploy is blocked.
3. Public email unconfirmed. Custom domain and Pages repo setup pending.
4. Fan-art IP risk (SPEC-v3 section 3): original pixel fan art of trademarked characters, with a footer disclaimer. `"fanArt": false` in `site.json` removes it (verified, QA-1021).
5. VoiceOver pass (QA-871) and post-deploy checks (QA-890) not run.

## Defects

| ID | Sev | Owner | Requirement | Summary | Status |
| :- | :- | :- | :- | :- | :- |
| D-01 | Low | frontend | REQ-1003, QA-1011 | CDP accessible name was "Experience , with Charmander" (space before comma). An aria-label fix introduced an axe `label-content-name-mismatch` violation (QA-1062). | Fixed (in-flow `.joiner` span, no aria-label). Names exact, axe 0. |
| D-02 | Medium | frontend | REQ-1011, QA-1031 | After hover or focus ended, the idle sprite-bob replayed about 4 s. | Fixed (bob stays in the animation list, hop added on hover or focus). After leave or blur no sprite animation runs, transform is identity. |
| D-03 | Medium | frontend | REQ-1013, QA-1043, R7 | At 320 wide with a 24 px root font, "Experience" and "Projects" overflowed the dialog border. | Fixed. Labels now break inside the dialog (mid-word at that extreme size, e.g. "Experie/nce"; screenshot `shots/home-320-24px.png`). |

Observations (not defects): footer "Home" link is 41x44 px (QA-1044 lists guide, header, button and icon links, all at least 44x44; WCAG 2.5.8 needs 24). At 24 px root the header name truncates to "Andrew ..." (v2 behavior). The Home JSON-LD stays in `<head>` after client navigation away from Home (v2 behavior; static HTML is correct). CSS-module hashing means the animation names are `_sprite-hop_<hash>`, which contain `sprite-hop`. At hover end a 120 ms background-color transition is the only running animation; no sprite motion.

## v3 checklist

### Build and tooling
- QA-1000 PASS: `npm run lint` exit 0, no output; `npm test` 7 files, 188 tests, includes `sprites.test.js` (33) and the validate/normalize/api/routes tests (`logs/lint.txt`).
- QA-1001 PASS: `npm run ci` exit 0 (`logs/ci2.txt`, final build).
- QA-1002 PASS: JS 81.58 KB, CSS 5.56 KB, fonts 27.45 KB raw (28,108 bytes), initial 116.21 KB.
- QA-1003 PASS: `check:routes` exit 0, 5 font files OK. After one corrupted byte in the 700 font: exit 1, "SHA-256 is 0cd7eba5..., expected c836cfa5... (font files must not be modified)". Restored, exit 0.
- QA-1004 PASS: `dependencies` are exactly react and react-dom. `git diff 66f76bb -- package.json` shows only the `check:routes` script and the `ci` script change.
- QA-1005 PASS: `shasum` of `public/fonts`, `dist/fonts` and `docs/spec/v3-assets/fonts` all match 6.4 (afec8699..., d830612a..., c836cfa5...). Both OFL texts byte-identical (`cmp`), hashes b66ba46f... and 705960c3... match.

### Home and navigation
- QA-1010 PASS: one `h1#hero-name` "Andrew Leick"; next sibling `p` "Electrical Engineering student at Stanford University"; `nav[aria-labelledby=party-heading]` with `h2#party-heading` "Where to next?"; 3 links; no summary, no `[class*=explore]`.
- QA-1011 PASS (after D-01): AX names exactly `Experience, with Charmander`, `Projects, with Bulbasaur`, `About, with Squirtle`. Each link has svgs with `aria-hidden="true"`, `data-sprite` charmander, bulbasaur, squirtle (plus the cursor svg), hrefs `/experience/`, `/projects/`, `/about/`.
- QA-1012 PASS: each link goes to the right URL, `window.__probe` survives, `activeElement.id` is `page-heading`, titles `Experience | Andrew Leick` and so on.
- QA-1013 PASS: tab order skip link, header name, Experience, Projects, About, theme toggle, 3 guide links, Resume, GitHub, LinkedIn, Email, footer. Every stop has a 3px solid outline equal to `--color-focus-ring` (rgb(32,80,200) light). The guide cursor is `visibility: visible` on focus. Enter on Bulbasaur goes to `/projects/`, probe survives, focus `page-heading`.
- QA-1014 PASS: four deep links render the right h1 and title; `/about/#contact` scrolls to y=1531; `curl localhost:4173/projects/ | grep -c '<title>Projects | Andrew Leick</title>'` prints 1.
- QA-1015 PASS: `/nope/` h1 "Page not found", `.pixel-dialog` with `svg[data-sprite=egg]`, text "A wild 404 appeared! There is no page at this address.", links Home, Experience, Projects, About; `dist/404.html` contains `<meta name="robots" content="noindex"`. A static 404 server (`serve404.mjs`) returned status 404 with the page for `/missing/`.
- QA-1016 PASS: Home to Projects to About to Back to Back to Forward. Titles follow; focus lands on `page-heading` (on Home, on `hero-name`); dark theme preserved. Scroll position restored on Back (y=200).
- QA-1017 PASS: with JS disabled `/` and `/about/` show name, "This site needs JavaScript. My resume and links:", resume, links and page links; computed font-family starts with "Pixelify Sans".
- QA-1018 PASS: 0 console messages on 5 routes in preview, both themes. In dev (scratch copy): only the React DevTools info line, no errors or warnings.

### Data-driven sprites and kill switch
- QA-1020 PASS: guide swap gives Experience with Squirtle (water blue border rgb(29,99,184), title sprite squirtle) and About with Charmander (fire rgb(194,65,12)); only `site.json` differed; reverted.
- QA-1021 PASS: `fanArt: false`: 3 egg sprites on Home with names `Experience`, `Projects`, `About`; no character sprites on any of the 5 routes, both themes; no Charmander, Bulbasaur, Squirtle or Pokemon text; footer has the copyright and font credit only; subpage heading border equals `--color-type-normal` (rgb(74,74,92) light, rgb(180,178,196) dark). Reverted. (The 404 keeps its egg sprite, which is an allowed non-character sprite.)
- QA-1022 PASS: (a) `fanArt:"yes"`, (b) `guide:"charmandr"`, (c) duplicate guide each exit 1 with the 8.2 messages (b includes "did you mean "charmander""); the dev overlay shows them. Reverted.
- QA-1023 PASS: grep for the three names over `dist/index.html`, the page HTMLs, `404.html` and `sitemap.xml` prints nothing.

### Motion
- QA-1030 PASS: at 2 s `getAnimations().length` is 4 (3 sprite-bob plus the dialog arrow); running animations are 0 at 4.8 s and later (all finish by about 4.5 s).
- QA-1031 PASS (after D-02): hover Bulbasaur: running `sprite-hop` within 100 ms; transforms observed `matrix(1,0,0,1,0,0)`, `...,-6)`, `...,-12)`. Pointer away or blur: no sprite animation, transform identity; only a 120 ms background transition is momentarily running.
- QA-1032 PASS: reduced motion: 0 animations at 0.5 s and 3 s; while hovered and while focused still 0, sprite `transform: none`, cursor visible, label underlined.
- QA-1033 PASS: reduced motion: `scroll-behavior: auto`, hash jump lands instantly (1531 in all samples), route change jumps.

### Responsive and layout
- QA-1040 PASS: no horizontal scroll on 5 routes x 6 viewports x 2 themes (60 cases).
- QA-1041 PASS: 390x844 (light and dark): h1 bottom 190, role 268, party heading 336, guides 436/532/628, Resume 724, all within 844. 1366x768: 214, 265, 337, 524, Resume 628, all within 768.
- QA-1042 PASS: 320 and 390 stacked (tops 375/471/567 and 348/444/540), sprites 64x64; 480 same top 364, 64x64; 768, 1366 and 2560 same top 349, 96x96.
- QA-1043 PASS (after D-03): 320x568 with 24 px root: scrollWidth equals innerWidth; all labelText parents have scrollWidth equal to clientWidth; labels contained in the dialog. 200% zoom on 1366 (683 css px): no overflow.
- QA-1044 PASS: all guide links, header nav links, buttons and icon links are at least 44x44 (390 and 1366, 5 routes). Inline prose links and the footer text links are not at 44 wide (see Observations).

### Fonts
- QA-1050 PASS: `document.fonts.check` true for Press Start 2P, Pixelify Sans and bold Pixelify Sans; exactly 3 woff2 requests, all on the preview origin, 200 (304 on reload).
- QA-1051 PASS: Press Start 2P on `#hero-name`, `#page-heading`, `#party-heading`, About `h2`s and the header name link; Pixelify Sans on body, guide links, nav links, experience entry titles (22px) and tags.
- QA-1052 PASS: every text node using Press Start 2P is 16, 24, 32 or 48 px at all 6 viewports, 5 routes, 2 themes (0 offenders).
- QA-1053 PASS: `BASE_PATH=/personal-website/` build: preload hrefs and `@font-face` urls start with `/personal-website/fonts/`; `vite preview --base /personal-website/` loads the fonts with 200; nav hrefs carry the base. (Temporary `siteUrl` edit was made in the scratch copy.)

### Theme and tokens
- QA-1060 PASS: all 24 tokens in both themes match 6.1 (three values compare as `#fff` vs `#FFFFFF`, same color).
- QA-1061 PASS (light / dark): body 16.55 / 16.57; role 16.55 / 16.57; guide label on dialog-bg 16.85 / 15.31; caption 8.66 / 8.27; label on bg-subtle 14.62 / 14.65; Resume 5.88 / 6.70, hovered 8.14 / 9.16; tag 14.19 / 13.21; footer `.fine` 8.50 / 8.95; focus ring on bg 6.78 / 7.86 (on dialog-bg 6.90 / 7.26); cursor 5.88 / 6.19.
- QA-1062 PASS (after D-01): axe (wcag2a, aa, 21a, 21aa, 22aa, best-practice) 0 violations on 5 routes x 2 themes x 390 and 1366, plus `/` with a guide link focused.
- QA-1063 PASS: Lighthouse mobile and desktop on `/`, `/experience/`, `/projects/`, `/about/`: all 100/100/100/100; LCP 0.20 to 0.79 s; CLS 0; TBT 0 to 12 ms (`lh/*.json`).
- QA-1064 PASS: the four greps print nothing or only the two allowed files (`tokens.css`, `sprites.js`).
- QA-1065 PASS: toggle labels `Switch to dark theme` / `Switch to light theme`; persists across reload and route change; with dark saved and CPU throttled 6x, `data-theme="dark"` is set at body creation and DOMContentLoaded; `meta[name=theme-color]` equals `--color-bg` after toggle.

### Recolor via tokens
- QA-1080 PASS (scratch copy, reverted, diff CLEAN): (a) `--color-accent` and `--color-dialog-border` set to `#0b1f3a` in `themes/light.css`: the Resume button background on Home and every `.pixel-dialog` border on Home, Projects and 404 compute to rgb(11, 31, 58), with no other edits. (An earlier attempt used a regex that did not match the `var(--pk-*)` values, so nothing changed; QA caught that and redid the test.) (b) `--sprite-char-body: #3060f0` in `tokens.css`: Charmander's body path computes rgb(48, 96, 240). (c) New `themes/test.css` (24 tokens, `--color-bg: #e0f0ff`), imported in `index.css`, `'test'` added to `THEMES`, `defaultTheme: "test"`, localStorage cleared: `data-theme="test"`, body background rgb(224, 240, 255), `theme-color` #e0f0ff.

### Print and other
- QA-1090 PASS: print emulation on `/` and `/about/` (dark theme set): 0 visible svgs, `.pixel-dialog` box-shadow none, body background rgb(255, 253, 245) (light tokens), external link URLs printed via `::after`.
- QA-1091 PASS: `/about/` shows "Availability" followed by "TODO: target roles and availability ..." (expected); no photo (0 img).
- QA-1092 PASS: every route's footer has `Fonts: Press Start 2P and Pixelify Sans (SIL Open Font License).` and the exact section 9 disclaimer; with `fanArt: false` the disclaimer is gone and the credit stays (QA-1021).

### Visual (objective)
- QA-1100 PASS: 1366x768, DPR 1 and 2, both themes, after 5 s idle: every pixel of each sprite capture is a 6.2 palette color or the theme's dialog-bg; distinct colors 6 to 8 per sprite, 0 foreign pixels (12 captures).
- QA-1101 PASS: DPR 1 capture of each sprite against the 96x96 expected image: 0 mismatched pixels at offset (2,2). QA padded the capture by 2 px, so this is the spec's (1,1) placement. Expected images were taken from the reference PNG tiles, which are independent of `sprites.js`.
- QA-1102 PASS: the three Home sprites equal the tiles of `sprites-reference-light-6x.png` (background FFFDF5 mapped to FFFFFF) with 0 mismatched pixels.
- QA-1103 PASS: dialog border-top-width 4px, color equals `--color-dialog-border` (rgb(28,28,40) light, rgb(244,242,232) dark), radius 6px, box-shadow two insets (2px and 4px).
- QA-1104 PASS: `#page-heading` border-bottom 4px; Experience fire, Projects grass, About water, both themes (values equal the tokens); title sprite 32x32.

### Visual review rubric (screenshots in `shots/`, 390 and 1366, both themes, 5 routes)
- R1 yes: Charmander (orange, flame tail), Bulbasaur (teal with green bulb), Squirtle (blue with brown shell) are recognizable against the reference.
- R2 yes: Home is name, role, one dialog and one button row.
- R3 yes: each sprite has a label and caption; hover and focus show the cursor and an underline (QA-1013, QA-1032).
- R4 yes: Pixelify Sans at 18px body is readable at 390 wide, including experience bullets.
- R5 yes: both themes look intentional; dark sprites are clean, borders visible.
- R6 yes: same fonts, dialog frames, red cursors, pixel buttons and tags on all 5 pages.
- R7 yes (after D-03): no overlap or clipped labels at 390 and 1366. At the extreme 320 px with 24 px root, labels break mid-word inside the dialog (accepted).

## Carried v2 tests
- QA-800 PASS (ci). QA-801 PASS (no router package). QA-802 PASS (`dist`: index, experience, projects, about, 404.html, robots.txt, sitemap.xml). QA-803 PASS (route HTML identical to Home apart from head tags). QA-804 PASS (see QA-1053).
- QA-810 PASS (URL, no reload, aria-current in header and footer). QA-811 PASS (see QA-1014). QA-812 PASS (Back restores y=200). QA-813 PASS (meta-click opens a new tab, current tab stays). QA-814 PASS (`/experience` and `/experience/index.html` render and show `/experience/`). QA-815 PASS (`/nope/`, `/experience/foo/`: not found, noindex, no canonical, no current link). QA-816 PASS (history length unchanged, scroll to 0, focus page-heading). QA-817 PASS (see QA-1016, QA-1065). QA-818 PASS (resume, GitHub, LinkedIn open with `_blank` and `noopener noreferrer`; mailto untouched). QA-819 PASS (see QA-1018).
- QA-823 PASS (4 entries as h2, no location text). QA-824 PARTIAL: one NFL card, no star line, language shown; the add-a-second-project and stars edits were not run. QA-825 PASS (GPA, mailto, Copy email, resume, section h2s with aria-labelledby). QA-826 PASS by screenshot (header not sticky; footer nav, links, Back to top).
- QA-830 PASS (4th page: Egg in the party, header link, `/skills/` h1 and groups, About loses Skills, `dist/skills/index.html` and the sitemap entry exist; scratch copy). QA-831 PASS (reorder; `visible:false` removes links and `/projects/` shows Not found). QA-832 PASS ("About me" in nav, h1, title, party label). QA-833 PASS (a to e exit 1 with the v2 messages; f exits 0 with a warning only). QA-834 NOT RUN (v1 QA-100 to QA-104 entry add/edit/feature; covered by unit tests only).
- QA-840 PASS (title, description, canonical, og and twitter per page; JSON-LD only on Home, no TODO). QA-841 PASS (one of each tag after client navigation; not-found adds noindex and removes canonical; Home restores). QA-842 PASS (sitemap lists Home plus 3 pages). QA-843 PASS (curl). QA-844 PASS (see QA-1017). QA-845 PASS (static server: status 404 with the Not found page). QA-846 PASS (dev curl: About title; `/zzz/` not-found with noindex).
- QA-860 PASS (first Tab is the skip link, Enter focuses `#main`). QA-861 PARTIAL PASS (Enter on a nav link: title set, then focus on page-heading, viewport at top, no ring; `#contact` heading focus and Back focus not re-tested). QA-864 PASS (one h1, no skipped levels on all 5 routes). QA-865 PASS (mobile header two rows, 44 px links, no menu button; no overflow per QA-1040). QA-866 PASS (check:size). QA-867 PASS (see QA-1033). QA-868 PASS (see QA-1064). QA-869 PASS (see QA-1090). QA-870 PASS (only the preview origin on all 5 routes). QA-871 NOT RUN (VoiceOver; for Andrew).
- QA-880 PARTIAL: no git history to audit ownership (one commit; v2 and v3 uncommitted); changed paths are in the expected areas. QA-881 PASS (components, pages and router import content only through `lib/content/index.js`; no `__dev__`). QA-882 PASS (`useActiveSection.js` and `scrollToSection.js` deleted, no references, no `public/404.html`). QA-883 PASS (new strings are the section 9 UI copy or TODO placeholders; no phone, CS131 or gmail on any page). QA-890 PENDING DEPLOY.

## Gaps QA did not close
- QA-834, the extra edits in QA-824, and the `#contact` and Back focus parts of QA-861 were not run. QA-880 is only a path check.
- All browser testing is headless Chrome. Safari, Firefox and VoiceOver were not tested.
