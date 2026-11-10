# Portfolio Site v4: Poké Ball scroll journey

| | |
| :- | :- |
| Repo | `/Users/andrewleick/personal-website` (Vite 8 + React 19, Node 24, branch `main`) |
| Date | 2026-11-10 |
| Status | Built (uncommitted) |

## 0. Precedence

v4 builds on `SPEC.md`, `SPEC-v2.md` and `SPEC-v3.md`. This file overrides them where section 6 says so; everything else still applies. `CONTENT-FACTS.md` still governs content. v4 adds no new facts and no new copy beyond the rail's "Sections" label.

## 1. Goal

Make the site feel alive, modelled on https://jld2nd.dev/: one continuous page whose side rail of markers tracks your place and doubles as navigation. In this site the markers are Poké Balls.

## 2. Behavior

| ID | Requirement |
| :- | :- |
| V4-01 | `site.layout: "journey"` (default) renders Home and every page in one document: the hero, then one `<section id="{pageId}">` per page, then the footer. `"pages"` keeps the v3 layout. |
| V4-02 | Each hero menu slot shows the official Poké Ball sprite (`public/sprites/poke-ball.png`, 30px, shown at 60px below 768px and 90px from 768px). |
| V4-03 | Scrolling glides the balls from their hero slots into a fixed rail on the right (≥ 768px, 60px balls) or a bottom dock (< 768px, 60px balls, 72px dock plus the safe-area inset). The glide is scroll-scrubbed and reverses on scroll up. The balls leave one after another (stagger). |
| V4-04 | The rail is `inert` and ignores pointers until the balls arrive (`data-docked`). Before that, the hero links are the only section links in the tab order. |
| V4-05 | Plain click on a hero slot: the ball wobbles, its top half flips open, a white flash bursts, and the page's Pokémon pops out (~760ms). Then the router navigates and the page glides to the section. Modified clicks behave as normal links. |
| V4-06 | Each section heading has a ball that opens to reveal the page's Pokémon the first time the heading passes 60% of the viewport. It plays once per page load. A section opened from the hero does not play it again. |
| V4-07 | Resting, no-JS and reduced-motion state of a section heading: the Pokémon is shown and there is no ball. Only `useSectionReveal` adds the pending state. Section content is never hidden. |
| V4-08 | The rail marks the active section (the last one whose top is above 40% of the viewport, or the last one at the page bottom). It gets a type-colored ring, `aria-current="location"`, and its Pokémon peeks out (≥ 1280px only). A track fills with page progress. |
| V4-09 | Scroll spy: when the active section changes, the URL path is replaced in place (`replaceFromScroll`, snapshot type `'scroll'`) and the head is synced. No history entries are added, and nothing scrolls or moves focus. The spy pauses while a link-triggered glide runs. |
| V4-10 | Deep links: `/experience/`, `/projects/`, `/about/` (and `#section` hashes) load the journey and jump instantly to the section. Build output (per-route HTML, heads, sitemap) is unchanged. |
| V4-11 | Link navigation inside the journey glides smoothly to the target section (instant with reduced motion) and focuses its heading with `preventScroll`. |
| V4-12 | Headings: one `h1` (the name). Each page title is an `h2` (`#{pageId}-heading`). Lead-section entries and other sections' headings are `h3`; their entries are `h4`. |
| V4-13 | `prefers-reduced-motion: reduce`: no glide (balls switch between hero and rail at 50% progress), no opening, no wiggle, instant scrolling. |
| V4-14 | `site.fanArt: false`: the rail and hero use the original egg sprite, with no opening and no Pokémon. |
| V4-15 | No animation libraries. JS stays within the 90 KB gzip budget (84.3 KB at build time). |

## 3. Content model

- `site.layout`: enum `journey | pages`, optional, default `journey` (`src/lib/content/{validate,normalize,types}.js`).
- `BALL_SPRITE = 'poke-ball'` and `IMAGE_SIZES` in `src/components/PixelSprite/sprites.js`.

## 4. Implementation map

| Concern | Files |
| :- | :- |
| Journey document | `src/pages/JourneyPage.jsx`, `JourneyPage.module.css`; `src/components/PageSections/PageSections.jsx` (shared with `ContentPage`) |
| Hero slots | `src/components/BallLink/*` |
| Rail / dock | `src/components/BallRail/*` |
| Ball sprite halves | `src/components/PokeBall/*` |
| Opening sequence (WAAPI) | `src/lib/journey/openBall.js` |
| Glide math, spy picking | `src/lib/journey/geometry.js` (+ tests) |
| Shared state (revealed, ball registry, auto-scroll flag) | `src/lib/journey/state.js` |
| Scroll handler (one rAF) | `src/hooks/useJourneyScroll.js` |
| Section intros | `src/hooks/useSectionReveal.js` |
| Router | `src/router/history.js` (`replaceFromScroll`), `useRouteEffects.js` (journey branch), `Link.jsx` (`beforeNavigate`) |
| App switch | `src/App.jsx` (`<main>` keyed by layout in the journey) |
| Tokens | `src/styles/tokens.css` (`--hero-ball-size`, `--rail-ball-size`, `--dock-ball-size`, `--dock-height`, `--rail-pokemon`, `--rail-track-height`, `--z-rail`) |

## 5. Verification

- `npm run ci` passes.
- Headless Chrome at 1280×800, 1440×900 and 390×844: glide, docking, active ring, URL/title spy, hero click → open → glide → focus on `#projects-heading`, deep link `/about/`, reduced motion, `fanArt: false`, and `layout: "pages"`.
- Still to do by hand: Safari and Firefox passes, a VoiceOver rotor check, and a real-device phone check of the dock and safe-area inset.

## 6. Requirements overridden

- **REQ-905** (push navigation never smooth): in the journey, push navigation glides (V4-11). Unchanged in `"pages"`.
- **REQ-901** focus target: in the journey, focus goes to the section `h2`, not a page `h1`.
- **Per-page `h1`** (SPEC-v2 5.3): in the journey, one `h1` per document (V4-12).
- **`<main>` remount per route** (SPEC-v2 5.1): in the journey, `<main>` stays mounted across journey routes.
- **v3 Home guide sprites** (SPEC-v3 8.2): in the journey, Poké Balls replace the Pokémon in the hero. `GuideLink` remains for `"pages"`.
