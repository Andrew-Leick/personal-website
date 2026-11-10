# Frontend status, v3 (Pokemon theme, minimal home)

Owner: frontend. Date: 2026-11-10. Spec: `docs/spec/SPEC-v3.md`. Nothing committed or pushed.

## Command results
- `npm run lint`: 0 warnings, 0 errors.
- `npm test`: 188 tests pass (includes `src/components/PixelSprite/__tests__/sprites.test.js`, 33 tests).
- `npm run build`: passes (only the 2 known TODO placeholder warnings).
- `npm run check:size`: JS 81.59 KB gzip (90), CSS 5.52 KB (15), fonts 27.45 KB raw (32), initial 116.16 KB (150). OK.
- `npm run check:routes`: OK, including 5 font files.
- Greps over `src/components src/pages src/router src/styles/base.css`: no hex/rgb/hsl literals, no literal `font-size` numbers. `--gray-*` and `--explore-index-col` appear nowhere. `--pk-*` only in tokens.css and themes.
- `shasum -a 256 public/fonts/*` matches the spec 6.4 table.

## Browser verification (headless Chrome over CDP, vite preview)
- Widths 390, 1366 on all 5 routes, 320, 768, 1440 on Home and Projects, light and dark: no horizontal scroll, both fonts load (`document.fonts.check` true), sprites render at 64 px (below 768), 96 px (768 and up), 32 px in titles, 64 px on 404, all crisp.
- Fold: Resume button bottom at 724 (390x844), 751 (320x844), 628 (1366x768, 768 wide, 1440). All inside the viewport.
- axe-core (wcag2a/aa, 21, 22aa, best-practice): 0 violations on 5 routes x 2 themes x 390 and 1366.
- Motion: 3 sprite bobs plus the dialog arrow at load, all `finished` by 5.2 s; zero animations under `prefers-reduced-motion: reduce`; focus on a guide link adds `sprite-hop`, shows the cursor; Enter navigates client-side and focus lands on `#page-heading`.
- Not run: Lighthouse, VoiceOver, a `fanArt: false` render (data file belongs to backend; the code path is the spec's GuideLink/ContentPage logic).

## Task map
| Task | Files | REQ |
| :- | :- | :- |
| F3-1 | `public/fonts/*` (5 files), `index.html` | 1020-1022 |
| F3-2 | `src/styles/tokens.css`, `themes/light.css`, `themes/dark.css`, `base.css` | 1030-1032, 1070 |
| F3-3 | `components/PixelSprite/*`, `MenuCursor`, `DialogBox`, `GuideLink`, sprite test | 1003, 1010, 1011 |
| F3-4 | `pages/HomePage.jsx`, `HomePage.module.css`; deleted `Hero/`, `Explore/`, `arrow-right` icon | 1000-1005, 1012, 1013 |
| F3-5 | Section 7 rows: SiteHeader, Nav, Section, ContentPage, Page.module.css, NotFoundPage, ResumeLink, LinkButton, Contact, Tag, ProjectCard, Projects css, About, SiteFooter, App | 1040, 1041, 1051 |

## Deviations
- None from the spec text. Notes:
  - Planner amendment applied to `GuideLink.module.css` (5.5, at 480 px and up the cursor is absolutely positioned outside the label). Checked at 480, 768 and 1366: label center equals sprite center on every tile, no horizontal scroll.
  - The About photo and availability render only when the data has them. About shows "Availability TODO: ..." because the data holds the known placeholder string; there is no photo in the data.
  - Hero's old photo markup is gone from Home; About uses the spec's `<img>` markup.

## Open items / requests
- None for other owners. Out-of-scope items from spec section 0 remain open.

## QA fixes
- D-01: the hidden ", with " joiner is now `.joiner` (`font-size: 0; clip-path: inset(50%)`, in-flow, inside `.labelText`) instead of the absolutely positioned `.visually-hidden`, because Chrome puts a space before out-of-flow nodes. No `aria-label` (it triggered axe `label-content-name-mismatch`). AX name is exactly "Experience, with Charmander"; axe 0 violations.
- D-02: on hover and focus the idle `sprite-bob` stays first in the animation list with `sprite-hop` added second, so the bob never restarts. No animation runs after pointer leave.
- D-03: guide label has `min-width: 0; max-width: 100%` and `.labelText` has `overflow-wrap: anywhere`, so labels stay inside the dialog at a 24 px root at 320 px.
