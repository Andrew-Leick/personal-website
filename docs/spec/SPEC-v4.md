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

## 7. v4.1: smoother transitions

A review in headless Chrome found 12 flow problems: the click waited on the opening, the ball snapped shut, intros played while passing, the fill ran ahead of the sections, the rail popped in, the active state snapped, the balls bunched, the hero slots looked empty, duplicate balls sat at the headings, the section introduction was small, and the balls trailed the page by a frame. v4.1 changes:

| ID | Requirement |
| :- | :- |
| V4-16 | Hero click hands over to the page glide at the flash (`OPEN_HANDOFF`, 300ms). The rest of the 600ms opening plays while the page moves. When the glide ends, the ball closes with `closeBall`: the Pokémon shrinks back in and the ball fades in over 4 steps. Where the rail's peek shows the Pokémon (≥ 1280px, active), it stays. |
| V4-17 | Journey link glides use `src/lib/journey/glide.js`: an eased rAF scroll lasting `clamp(450 + distance × 0.12, 450, 900)` ms. Wheel, touch or a key cancels it, and it reports a real end (`onNextGlideEnd`). This replaces native smooth scrolling and the 1.5s auto-scroll timeout. |
| V4-18 | During a glide, sections the page only passes keep their intro pending. The destination's intro plays when the glide ends. A destination already opened from the hero gets a landing hop. The rail shows the destination as active for the whole glide. |
| V4-19 | The rail track runs from the first ball's center to the last's (`--track-start`, `--track-length`). Its fill is piecewise (`trackProgress`): it reaches ball *i* exactly when section *i* becomes active. |
| V4-20 | The track and the dock background fade in over the second half of the glide (`--journey-p`). The active ring steps in, the newly active ball hops, and the peeking Pokémon animates both in and out (position via `translate`, a transition rather than a jump). |
| V4-21 | Balls glide on arcs (`arcPoint`, lift = ¼ of the distance, at most 120px) with a stepped tilt of up to 12°. The shortest path leaves first (`staggerOrder`). |
| V4-22 | Hero slots show a grey ghost of the ball and dim their label as the ball leaves (`--leave`, 0 to 1); this reverses on scroll up. |
| V4-23 | Section headings start pending with an empty dashed slot. At 70% of the viewport, a copy of the rail ball is thrown along an arc in quarter turns (`throwBall`, 420ms). It lands, opens, and the underline (now its own element) draws across in 8 steps while the title steps in. The resting, no-JS and reduced-motion state is the finished heading. |
| V4-24 | Where `ScrollTimeline` exists (Chrome, Edge, Safari 26), the glide is a scroll-linked WAAPI animation with 24 sampled keyframes per ball, run by the compositor. Otherwise one rAF writes the transforms, with cached elements, reads before writes, and `will-change` only in flight. |

Verified in headless Chrome:
- the page starts moving 0.38s after a hero click and lands at about 1.15s (was 0.8s / 1.8s);
- the ball opacity changes in 0.25 steps, with no snap;
- Experience stays pending when a glide passes it;
- the fill is at 0.5 as Projects activates and 1 at About;
- 3 scroll-linked animations, one per ball;
- reduced motion leaves 0 animations and nothing pending;
- `fanArt: false` works.

Still to do by hand: a real trackpad in Chrome, Safari and Firefox (Firefox uses the rAF path).

## 8. v4.2: throws that always land, and the dot indicator

| ID | Requirement |
| :- | :- |
| V4-25 | `throwBall` re-measures the heading's slot every frame and bends the arc toward it, so the ball lands exactly on the slot however far the reader keeps scrolling. The real ball appears (`data-landed`) in the same frame the thrown copy is removed. |
| V4-26 | When a ball is thrown to its heading, its rail slot turns into a dot in the section's type color (`data-out`, `src/lib/journey/rail.js`), and the active ring tightens around it. |
| V4-27 | When a different section is entered, every ball that is out returns: the dot grows back into the ball with a small drop (`data-return`). Re-entering an opened section turns its ball into a dot again. A hero click ends with the destination as a dot. |
| V4-28 | Each journey section has an extra 20vh of space after it, so one section's animations finish before the next heading's throw starts. |

## 9. v4.3: one ball out at a time

| ID | Requirement |
| :- | :- |
| V4-29 | The rail no longer shows a Pokémon beside a ball. A ball that is out shows only as the dot (V4-26). |
| V4-30 | Exactly one section's ball is out: the active section's (`src/lib/journey/intros.js`, driven each frame by `useJourneyScroll`). All other headers show the empty dashed slot. |
| V4-31 | Entering a section throws its ball once its header slot is fully on screen. This replays on every visit, including when scrolling back up (the throw waits until the header scrolls into view). |
| V4-32 | Leaving a section recalls its ball. If its header is on screen, the Pokémon shrinks back, the underline retracts, and the ball is thrown back to its rail slot (dot → ball). Off screen, the header just resets and the ball returns. |
| V4-33 | A hero click opens the ball on the way. On arrival the destination header shows the Pokémon with a landing hop (no second throw), and its rail slot is a dot. |
| V4-34 | Async steps carry a per-section generation number, so scrolling quickly back and forth cancels half-finished sequences cleanly. |

This replaces V4-18's rule that an intro plays once per page load.

## 10. v4.4: edge cases and the hero-click Pokémon

I reviewed this in headless Chrome at 1280×800 and 390×844. A scripted suite checks that the page settles consistently after each scenario: only the active section is out, its slot is a dot and its header shows the Pokémon, every other section is a ball with an empty header, nothing is left in the air, and no ball is stuck wiggling. Scenarios: a fast flick to the bottom and back, ping-pong between sections (120ms and 60ms), a hero double click, a hero click cancelled by the wheel, a hero click followed by a header-nav click during the glide, back to top after a hero click, back/forward, the same rail link twice, and reduced motion. All pass. With realistic scrolling (flicks starting at 80px per frame, 40px-per-frame wheel reversals), at most one ball is ever in the air, and no ball vanishes mid-air.

| ID | Requirement |
| :- | :- |
| V4-35 | Hero click (`intros.js` `heroOpen`): the ball opens. At the flash, the Pokémon pops out as a fixed sprite above the ball and bobs while the page glides (`heroBuddy.js`), and the ball's rail slot becomes the dot. When *this click's own* glide ends (glides are numbered, so an earlier glide ending is ignored), the Pokémon flies into the section header's slot as that section's tracked flight: it can turn around if the reader leaves, and it is cleaned up if the journey stops. The header then shows it with a landing hop. A cancelled glide shrinks it away and brings the ball back. Rail balls have no Pokémon of their own. |
| V4-36 | A second plain hero click while one is opening or gliding is ignored (no restarted animation, one history entry). Modified clicks (new tab or window) are left to the browser. The "busy" state lives in the intro controller and clears at the end of that click's glide; there is no timer. A cancelled hero glide puts the section back to `home`, so it gets its normal throw on the next visit. |
| V4-37 | Reversing mid-flight: a send-out or recall still in the air turns around from where it is (the new flight starts from the old copy, which is removed in the same frame). Nothing vanishes or jumps. |
| V4-38 | Flight time grows with distance (`clamp(320 + d × 0.25, 380, 650)` ms), so long desktop throws stay readable. |
| V4-39 | A throw starts once at least half of the header's ball slot is on screen. |
| V4-40 | The hover wiggle is cleared on click and when the rail docks, so no ball keeps wiggling in the rail. |
