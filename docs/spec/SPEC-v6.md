# SPEC v6: Personality pass

Amends SPEC-v5 and SPEC-v4. Owner request (2026-11-16): "Do 1-5 and do a sprite for 5. Make the about more personal based on your understanding and I can fill in more later. My sprite can start as a generic white guy with brown hair and glasses and I will customize later. Then, implement 6-11." Items 1–11 come from the personality review earlier in this session. Constraint: add personality without crowding the page.

**Baseline.** HEAD `501df6d`, plus the uncommitted intro-ring correction (SPEC-v4 §14, V4-57..V4-61). That correction is outside this spec. A copy of `src/`, `public/`, `docs/` and `index.html` taken before this work is at `/tmp/v6-baseline/` for the review diff.

**Principles for every item.**
- Personality goes into words, data and hidden or rare moments, not into more moving parts on the page.
- Navigation labels stay plain (Experience, Education, About), so recruiters can always find things.
- Every animation follows the site's style (pixel `steps()`, `--ease-standard`) and is skipped or reduced to opacity under `prefers-reduced-motion`.
- Every text pair passes WCAG AA (4.5:1, or 3:1 for large text) in every theme, including the new Game Boy theme.
- Budgets hold without raising limits (`npm run check:size`: JS ≤ 95 KB gzip, CSS ≤ 15 KB).
- Content changes go through the existing validator (`npm run validate:strict` stays clean).

---

## 1. Requirements (the review verifies each ID)

### Part A: replace generic pieces (items 1–5)

| ID | Requirement | Acceptance |
| :- | :- | :- |
| P-01 | **Favicon.** `public/favicon.svg` is a pixel Poké Ball: a 16×16 grid drawn with `shape-rendering="crispEdges"`. It has a dark outline, a red top, a dark band, a white bottom and a white button with an outline. The plain "AL" text in a system font is gone. | The file is a valid SVG, 16×16 viewBox, with no text element. It renders crisply at 16, 32 and 64px. |
| P-02 | **Link preview image.** `public/og-image.png` (1200×630) is re-rendered in the site's style: cream paper background (`--pk-paper`), "Andrew Leick" in Press Start 2P, the headline in VT323, and the hero dialog box (thick border, inner line) reading "Choose your starter" with the ▼ cursor. Inside it sit Charmander, Bulbasaur and Squirtle at 2× (pixelated), with the trainer sprite (P-05) beside the name. `scripts/render-og-image.mjs` (run with `npm run og-image`) regenerates it from the real fonts and sprites with headless Chrome. It isn't part of `ci`. `site.json` `ogImageAlt` describes the new image. | 1200×630 PNG, under 300 KB. The script runs end to end. The alt text matches what's shown. |
| P-03 | **About copy.** `profile.about` is rewritten in a first-person, personal voice. It covers how engineering started (FIRST Robotics), what kind of work is enjoyable (tools that make other engineers' days easier, from the Amazon log platform and MCP server), and a nod to the site's Pokémon theme. It doesn't repeat the Pokédex's résumé details, and it doesn't invent specific anecdotes or hobbies; the owner fills those in later. It's at most 4 paragraphs of at most 700 characters each (validator). | Reads as personal, makes no unverifiable claims, and the validator passes. |
| P-04 | **Currently and Availability.** `profile.currently` = "Taking Operating Systems Principles at Stanford, and adding personality to this site." (≤ 160). `profile.availability` = "Open to software engineering internships for summer 2027." (≤ 80). Both render in the About section through the existing component. | Both lines are visible under About in both themes. |
| P-05 | **Trainer sprite.** A new inline-SVG pixel sprite, `trainer`, in `src/components/PixelSprite/sprites.js`. Revised 2026-11-17 at the owner's request ("less nerdy and taller", based on a Gen 4 sprite): it is based on the HeartGold/SoulSilver trainer sprite of Ethan, 36×65 cells (traced from the owner's reference screenshot, palette-reduced, with a Gen 4 dark outline), in Stanford colors at the owner's request (cardinal cap with a white block "S", not Stanford's trademarked tree logo; cardinal jacket; Stanford black and cool grey), with brown hair and a hand-drawn face whose eyes read clearly (dark pupils with a white glint). It is fan art like the Pokémon, so it only shows with `site.fanArt` on, and the footer disclaimer covers trainer sprites. Its colors are new theme-independent `--sprite-trainer-*` tokens in `tokens.css`. `profile.avatar` (new optional field, enum `["trainer"]`, validated, normalized) makes About show the sprite at an integer scale (3× = 108×195px) when there is no `photo`. A photo still wins when set. The sprite is decorative (`aria-hidden`). The grid is documented as owner-customizable. | The sprite renders crisply in light, dark and Game Boy. The sprite tests cover its size and palette keys. A content test covers `avatar`. |

### Part B: themed touches (items 6–10)

| ID | Requirement | Acceptance |
| :- | :- | :- |
| P-06 | **Pokédex flavor text.** Experience and project entries get an optional `dexText` (≤ 160 characters, validated, normalized, passed into the dex entries). The showcase renders it below the name and badges as a Pokédex description: a pixel-bordered box in the theme's subtle surface, body font. All 5 current entries get a line in the games' voice, built from facts already in the data. | Each entry shows its line. Entries without `dexText` render as before. It's in print too. |
| P-07 | **Seen / Caught.** The Pokédex tracks progress in `localStorage` (`pokedex-progress`, with an in-memory fallback when storage is blocked). An entry is *seen* once its tile is shown in a list and *caught* once its showcase is opened. The start screen shows `SEEN n · CAUGHT n` out of the total in tabular figures. Catching the last uncaught entry announces "Pokédex complete! You caught all N." once, in a polite live region inside the screen, and shows the same line as a banner above the showcase of that entry only. From then on the start screen shows "★ Complete". | Persisted across reloads. Completion is announced once. Unit tests cover it. |
| P-08 | **404 battle menu.** `NotFoundPage` replaces the plain link list with a game battle menu: a second dialog box, a `<nav aria-label="Where to?">` holding a 2×2 grid of links: **FIGHT** (Experience), **BAG** (Education), **POKéMON** (About), **RUN** (Home), written in capitals in the source (no text-transform, so POKéMON keeps its lowercase é; one step smaller below 400px so it fits on one line). Each link shows its game word large and the real destination small beneath it, so the accessible name contains both ("FIGHT Experience"). The ▶ cursor shows on hover and focus. Unknown page ids fall back to their own label. At least 44px targets. | Every link works and has a visible focus ring. No horizontal overflow at 320px. |
| P-09 | **Contact dialog.** The contact blurb renders inside a `DialogBox` (no ▼). When it first scrolls into view, it types out left to right with a `clip-path` wipe, one step per character, 30ms per character, run once. The text is always in the DOM; the wipe only clips it. With no JS, no `IntersectionObserver`, or reduced motion, the text is simply shown. | The wipe runs once when it's seen. Reduced motion shows it at once. |
| P-10 | **Pokémon emote.** Clicking a section header's Pokémon once it's out (the header isn't `data-pending`) gives a happy hop (`hop()`, 12px, 4 pixel steps, skipped under reduced motion) and a pixel speech bubble with "!" that pops in and out in 900ms steps. Under reduced motion the bubble shows statically for 900ms with no movement. It's decorative and pointer-only on purpose: it conveys no information and starts nothing, and the Pokémon stays `aria-hidden`. The cursor becomes a pointer over a hatched Pokémon. | The bubble shows on click and clears itself. Nothing happens while the header is pending. No layout shift. |

### Part C: hidden easter egg (item 11)

| ID | Requirement | Acceptance |
| :- | :- | :- |
| P-11 | **Game Boy theme.** A third theme, `gameboy`: `src/styles/themes/gameboy.css`, `:root[data-theme="gameboy"]`, added to `THEMES` and imported in `index.css`. It uses the four-green BGB emulator palette: darkest `#081820`, dark `#346856`, light `#88C070`, lightest `#E0F8D0`, plus two tints: `#C0E0A0` (tags) and `#C8E8B0` (the subtle surface, chosen because muted `#346856` on `#C0E0A0` is only 4.42:1). It defines every semantic token the other themes define, overrides the device (`--dex-*`) and sprite tokens to greens on screen only (print keeps their normal colors), and tints raster sprites and the Poké Ball art green with a CSS filter. Typing the Konami code (↑ ↑ ↓ ↓ ← → ← → B A) anywhere except form fields switches to `gameboy`; typing it again returns to the theme in use before (remembered across reloads in `theme-before-gameboy`, else the system theme). The choice is saved like the other themes, and the header toggle still switches light/dark (from Game Boy it goes to dark). A polite live region announces "Game Boy mode on" or "Game Boy mode off"; it empties when the theme changes another way, so every Konami switch is announced. Every text pair passes AA. Print still uses the light tokens. | Unit tests cover the code sequence (including wrong keys and form fields). Contrast is measured in the browser. |

---

## 2. Data contract changes

| File | Field | Schema (validate.js) | Normalize | Consumers |
| :- | :- | :- | :- | :- |
| `profile.json` | `avatar` | `nul({ type: 'enum', values: ['trainer'] })` | `avatar: ['trainer'].includes(p.avatar) ? p.avatar : null` | `About` |
| `experience.json`, `projects.json` | `dexText` | `nul(s(160))` | `dexText: str(x.dexText)` | `buildDex` → `DexEntry.dexText` → `DexDetail` |

Update `types.js` JSDoc, `CONTENT-GUIDE.md` (both fields) and any test that pins key lists (`api.test.js`).

## 3. Files

- **New:** `docs/spec/SPEC-v6.md`, `scripts/render-og-image.mjs`, `src/styles/themes/gameboy.css`, `src/hooks/useKonami.js` (+ test), Pokédex progress helper `src/components/Pokedex/progress.js` (+ test).
- **Also changed (doc drift fixed on the way):** `docs/CONTENT-GUIDE.md` now names the cover button **View experience and projects** (it still said "Open Pokédex").
- **Changed:**
  - Assets: `public/favicon.svg`, `public/og-image.png`.
  - Data: `src/data/profile.json`, `experience.json`, `projects.json`, `site.json` (ogImageAlt).
  - Content library: `validate.js`, `normalize.js`, `types.js`.
  - Components: `PixelSprite/sprites.js` (+ test), `About.jsx` + css, `Pokedex.jsx` + css, `DexDetail.jsx`, `NotFoundPage.jsx` + `Page.module.css`, `Contact.jsx` + css, `JourneyPage.jsx` + css.
  - Theming: `ThemeToggle/themes.js`, `useTheme.js`, `App.jsx`, `styles/index.css`, `tokens.css`.
  - Docs and config: `package.json` (`og-image` script), `docs/CONTENT-GUIDE.md`.

## 4. Testing as we go

After each item: `npm run lint` (0 warnings), `npm test`, `npm run build`. The visual items also get a headless Chrome check (screenshots and computed styles).

Final pass:
- `npm run ci` and `npm run validate:strict`;
- contrast measured in the browser in light, dark and gameboy;
- no horizontal overflow at 320px on `/`, `/experience/` and the 404;
- the intro-ring invariant still holds (the ring is never visible while its ball rests in the rail).

## 5. Final review

An independent reviewer (a separate agent that didn't write the code) checks every P-ID's acceptance against the diff from `/tmp/v6-baseline/` and in the browser. It also flags anything out of scope. If it rejects anything, that gets fixed and re-reviewed until it approves.

## 6. Out of scope

- Real photos or personal anecdotes: the owner adds these later.
- Sound.
- A boot screen.
- Custom cursors.
- Renaming navigation.
- The SPEC-v4 intro-ring correction (already done, uncommitted).
