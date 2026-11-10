# Portfolio Site v3: Pokémon theme, minimal home, sprite guides

| | |
| :- | :- |
| Owner of this spec | Planner (`planner`) |
| Builders | Backend (`backend`), Frontend (`frontend`) |
| Verifier | QA (`qa`) |
| Repo | `/Users/andrewleick/personal-website` (Vite 8 + React 19, Node 24, branch `main`) |
| Date | 2026-11-10 |
| Status | Ready to build |

## 0. Read this first

**State of the tree.**
- The last commit, `66f76bb`, is the v1 single-scroll site.
- The **v2 work is in the working tree, uncommitted**. That is the multi-page site with routing, built by `docs/spec/SPEC-v2.md`. You build v3 **on top of that working tree**. Do not revert anything.
- The v2 hand-offs are `docs/handoff/backend-status-v2.md` and `docs/handoff/frontend-status-v2.md`. Read the one for your role before you start.
- v2 QA never ran, so v3 QA covers v2 behavior too (section 13).

**Spec precedence.** Three specs apply, in layers:
1. `SPEC.md` (v1);
2. `SPEC-v2.md`, which overrides v1 where it says so;
3. this file (v3), which overrides both where it says so.

Section 12.2 lists every requirement that v3 replaces or retires. Anything not listed there still applies. `docs/spec/CONTENT-FACTS.md` still overrides content: no locations, no phone number, no CS131, GPA shown.

**Every value here is a decision.** Use the exact paths, names, copy, hex values and sizes given. If something is ambiguous, message `planner` and keep working on something else. Do not guess. Planner answers, amends this file, and tells all three of you.

**Facts.** Nobody invents facts about Andrew. All new copy in this spec is UI copy, and it is listed verbatim in section 9.

**Out of scope, and it stays open.** v3 does not touch any of these:
- the resume PDF exposes the phone number and cities;
- the `TODO:` placeholders (`profile.availability` and the NFL results highlight);
- confirming the public email;
- the custom domain.

**No git.** Nobody commits or pushes.

---

## Contents
1. Goal and summary of changes
2. Research findings and decisions
3. IP and licensing decision (read before touching sprites)
4. Home page (exact markup, CSS, behavior)
5. Sprite system (exact grids, colors, generation, rendering, animation)
6. Theme: palette, tokens, fonts, motifs (exact files)
7. Site-wide theme carry-through (component by component)
8. Data model and scripts (backend)
9. Copy strings (verbatim)
10. File ownership
11. Ordered tasks with done criteria and tests
12. Requirements (REQ-1000 to REQ-1099) and superseded requirements
13. Holistic QA checklist and visual review rubric
14. Acceptance criteria, open items, sources

---

## 1. Goal and summary of changes

Andrew is a big Pokémon fan and wants the site to show some personality.
1. **Even simpler Home.** Drop the v2 Explore list and its previews. Keep:
   - the name;
   - a one-line role;
   - a small "Where to next?" dialog box with three pixel sprites;
   - one compact row of resume and contact buttons.
2. **Sprite guides.** Charmander leads to Experience, Bulbasaur to Projects, Squirtle to About. Each sprite is part of a labelled, keyboard-accessible link with idle, hover and focus animation. All motion stops under `prefers-reduced-motion: reduce`.
3. **Pokémon theme across the whole site:**
   - a retro pixel font pair (Press Start 2P for display, Pixelify Sans for text);
   - a Pokémon-inspired palette, in light and dark;
   - dialog-box borders and the "▶" menu-cursor motif;
   - type colors (fire, grass, water) as page accents.

   All of it uses the existing swappable token architecture.

What stays the same:
- routing, URLs and per-page head tags (v2);
- content JSON and validation, except two small additions (section 8);
- the light/dark toggle;
- the accessibility targets: axe 0 violations, Lighthouse accessibility 100, AA contrast, 44 px targets;
- no runtime dependencies;
- the JS and CSS budgets.

The font budget is new, and justified in 2.2.

---

## 2. Research findings and decisions

### 2.1 Sprites and IP
- **Official sprites are not available to us.** Pokémon characters and names are copyrighted and trademarked by Nintendo, Creatures Inc. and GAME FREAK inc., managed by The Pokémon Company. There is no public license or fan-content policy that permits using them. [P1][P2]
- **The company enforces.** It has used DMCA notices against fan projects, for example the Relic Castle fan-game site in 2025 [P1] and Pokémon Uranium in 2016 [P2]. Commentary from a former company lawyer says it monitors fan work but does not file takedowns immediately [P1]. Non-commercial use is not a legal exemption, but it lowers the risk.
- **Sprites ripped from the games are copies of the copyrighted game assets themselves.** That includes sprite-rip sites and sprite repositories. This is the highest-risk option. **Rejected.**
- **Decision: original pixel art.** The 16x16 sprites in section 5 were drawn for this project from scratch, in a generic chibi pixel style. Section 3 covers the safeguards.

### 2.2 Fonts
- The official Pokémon logo and game fonts are proprietary. **Not used.**
- **Press Start 2P** (CodeMan38) is under the SIL Open Font License 1.1, with Reserved Font Name "Press Start 2P" [F1][F2]. It is an 8-bit arcade face built on an 8 px grid. It renders crisply only at multiples of 8 px: 8, 16, 24, 32, 48 [F1]. It is very wide (about 1 em per glyph) and has one weight. **Used for display text only.**
- **Pixelify Sans** (Stefie Justprince) is under OFL 1.1 [F3]. It is a readable pixel sans with 400 and 700 static files. **Used for all other text.**
- **VT323** (OFL) [F4] was considered and rejected. Its latin woff2 is the largest at 17.9 KB, and it adds nothing Pixelify Sans does not already cover.
- **Self-hosted files.** These are the exact Fontsource 5.2.7 latin builds, downloaded by planner and staged in `docs/spec/v3-assets/fonts/` with SHA-256 hashes (6.4). Nobody needs network access. **Total: 28,108 bytes** (12,512 + 7,692 + 7,904). woff2 files are already compressed, so they are measured raw.
- **Budget justification.** v1 REQ-403 banned web fonts to protect performance. The fonts are central to the theme Andrew asked for. They are about 28 KB, first-party, preloaded, and use `font-display: optional`, which avoids layout shift. The initial transfer stays far below the 150 KB budget: about 86 KB of HTML, JS and CSS plus 28 KB of fonts is about 114 KB. New budget: fonts at most 32 KB raw (REQ-1060).

### 2.3 Theme UI patterns
The recognizable Pokémon UI motifs are:
- white **dialog boxes** with a thick dark outer border and a thin colored inner line;
- a red **"▶" menu cursor** next to the selected option;
- a **"▼" continue arrow** that bobs in the dialog corner;
- a **party list** of creatures;
- **type colors** (fire orange, grass green, water blue);
- Poké Ball red.

We use all of these as **original CSS and pixel drawings**. There are no logos, no Poké Ball drawing and no game screenshots.

### 2.4 Crisp pixel art and stepped animation
- The sprites are **inline SVG**, one `<path>` per color made of 1x1 cells, in a `viewBox` of grid size with `shape-rendering="crispEdges"`. They are shown only at **integer scales** (2x, 4x, 6x CSS px per sprite pixel), so every sprite pixel is a solid square with no anti-aliasing. For raster images the equivalent is `image-rendering: pixelated`. We ship no raster sprites.
- Inline SVG means no extra requests and no hotlinking. Colors come from CSS custom properties, so the sprites can be recolored through tokens.
- Animation uses CSS `@keyframes` with `steps(1, end)` and moves only in whole sprite-pixel units (`calc(var(--sprite-px) * n)`), so motion stays on the pixel grid and looks retro.
- **WCAG 2.2.2 (Pause, Stop, Hide).** Motion that starts on its own must stop within 5 seconds. The idle bob therefore runs 4 cycles of 1 s, with a stagger of at most 500 ms, and ends by 4.5 s. Hover and focus animation is triggered by the user and stops when the hover or focus ends.

---

## 3. IP and licensing decision

**The risk, stated plainly.** Charmander, Bulbasaur and Squirtle are copyrighted characters, and their names are trademarks. Any drawing of them, including our original pixel art, is fan art: a derivative work made without a license. Being non-commercial does not make it licensed. It only makes enforcement less likely. The realistic worst case is a takedown notice to GitHub Pages, which would take the site offline until the art is removed. That would hurt a job-search site. Andrew requested this, and he should know the risk. Planner is flagging it in the lead summary.

Safeguards. All are required.
1. **Original art only.** Use the grids in 5.2 exactly. They were authored for this project. Do not import, trace or download any sprite, fan sprite or game asset. Do not hotlink anything.
2. **No other franchise marks.** No Pokémon logo, no Poké Ball drawing, no official fonts, no game screenshots, no Pokémon text in the OG image or favicon. Both of those stay as they are now.
3. **Names only identify the characters.** Charmander, Bulbasaur and Squirtle appear only as sprite captions and in the disclaimer. They never appear in `<title>`, meta descriptions, JSON-LD or the sitemap.
4. **Disclaimer** in the footer of every page while fan art is on (copy in section 9).
5. **Kill switch:** `site.fanArt` in `src/data/site.json` (section 8). Setting it to `false` is a single data edit. It:
   - replaces all three sprites with the original **Egg** sprite;
   - removes the character names;
   - removes the subpage title sprites;
   - removes the disclaimer.

   Andrew can comply with a takedown in one line.
6. **Fonts.** Ship the two OFL license texts next to the font files (`public/fonts/OFL-*.txt`). **Do not modify, subset or rename the font files.** Press Start 2P has a Reserved Font Name, and a modified file could not keep that name.

---

## 4. Home page

### 4.1 Layout, top to bottom (inside `<main>`)
1. `<h1>`: the name, in Press Start 2P.
2. One `<p>`: the role (`profile.headline`), in Pixelify Sans.
3. A dialog box (`<nav>`) holding:
   - the `<h2>` "Where to next?";
   - the party list of guide links, one per page from `getPages()`, in order;
   - a decorative "▼" continue arrow.
4. The actions row: "Resume (PDF)" button, then the GitHub, LinkedIn and Email buttons. These are the existing `ResumeLink` and `LinkList` components, re-skinned.

Nothing else renders on Home. There is no summary, no availability line, no photo and no Explore list. The header and footer render as on every page.

### 4.2 `src/pages/HomePage.jsx` (replace the file entirely)
```jsx
import DialogBox from '../components/DialogBox/DialogBox.jsx'
import GuideLink from '../components/GuideLink/GuideLink.jsx'
import { LinkList } from '../components/LinkButton/LinkButton.jsx'
import ResumeLink from '../components/ResumeLink/ResumeLink.jsx'
import styles from './HomePage.module.css'

/** Home (SPEC-v3 section 4): name, role, sprite guides, actions. Nothing else. */
export default function HomePage({ content }) {
  const { site, profile, links, pages } = content
  const heroLinks = links.filter((link) => link.showInHero)
  return (
    <section aria-labelledby="hero-name" className={styles.home}>
      <div className={`container ${styles.inner}`}>
        <h1 id="hero-name" tabIndex={-1} className={styles.name}>
          {profile.name}
        </h1>
        {profile.headline && <p className={styles.role}>{profile.headline}</p>}
        {pages.length > 0 && (
          <DialogBox as="nav" aria-labelledby="party-heading" className={styles.party} more>
            <h2 id="party-heading" className={styles.prompt}>
              Where to next?
            </h2>
            <ul className={styles.partyList}>
              {pages.map((page, index) => (
                <li key={page.id}>
                  <GuideLink page={page} fanArt={site.fanArt} index={index} />
                </li>
              ))}
            </ul>
          </DialogBox>
        )}
        <div className={styles.actions}>
          <ResumeLink href={profile.resumeUrl} />
          <LinkList links={heroLinks} variant="outline" compact label="Profiles" />
        </div>
      </div>
    </section>
  )
}
```

### 4.3 `src/pages/HomePage.module.css` (new)
```css
.home {
  padding-block: var(--space-12) var(--space-16);
}

.inner {
  display: grid;
  justify-items: start;
  gap: var(--space-6);
}

.name {
  font-family: var(--font-display);
  font-size: var(--text-display);
  font-weight: var(--weight-regular);
  line-height: var(--leading-display);
  letter-spacing: 0;
}

.role {
  max-width: var(--measure);
  color: var(--color-text);
  font-size: var(--text-lg);
  line-height: var(--leading-snug);
}

.party {
  width: 100%;
  max-width: 44rem;
  padding: var(--space-4) var(--space-3) var(--space-6);
}

.prompt {
  margin-block-end: var(--space-3);
  padding-inline: var(--space-3);
  font-family: var(--font-display);
  font-size: var(--text-display-sm);
  font-weight: var(--weight-regular);
  line-height: var(--leading-display);
  letter-spacing: 0;
}

.partyList {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-2);
  list-style: none;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}

@media (min-width: 480px) {
  .party {
    padding: var(--space-5) var(--space-5) var(--space-8);
  }

  .partyList {
    grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
    gap: var(--space-4);
  }
}

@media (min-width: 768px) {
  .home {
    padding-block: var(--space-20) var(--space-16);
  }
}
```

### 4.4 Behavior
- Below 480 px the party list is a vertical list. Each row has the sprite on the left and the label and caption on the right, like the in-game party screen.
- At 480 px and up it becomes a row of equal columns, one per page, with the sprite above the label.
- With the default three pages:
  - every guide link points to its page (`page.href`);
  - clicking one navigates client-side through the v2 `Link` component;
  - focus then lands on `#page-heading` (v2 REQ-901, unchanged).
- **Above the fold (REQ-1012).** At 390x844 and 1366x768, in both themes, these are fully inside the viewport without scrolling: the h1, the role line, the "Where to next?" heading, all three sprites with their labels, and the Resume button.

---

## 5. Sprite system

### 5.1 Files (frontend)
| File | Purpose |
| :- | :- |
| `src/components/PixelSprite/sprites.js` | Sprite grids, palettes, `toPaths()`, `SPRITES`, `GUIDE_NAMES`, `GUIDE_TYPES` (exact content in 5.2) |
| `src/components/PixelSprite/PixelSprite.jsx` | Renders one sprite as inline SVG (5.3) |
| `src/components/PixelSprite/__tests__/sprites.test.js` | Unit tests (11.2, F3-3) |
| `src/components/MenuCursor/MenuCursor.jsx` | `▶` cursor: `<PixelSprite name="cursor" …/>` wrapper (5.3) |
| `src/components/DialogBox/DialogBox.jsx` + `.module.css` | Dialog-box container with an optional "▼" (5.3) |
| `src/components/GuideLink/GuideLink.jsx` + `.module.css` | One sprite guide link on Home (5.4, 5.5) |

Reference renders, for visual comparison only (not shipped):
- `docs/spec/v3-assets/sprites-reference-light-6x.png`: Charmander, Bulbasaur, Squirtle and Egg at 6x on the light background;
- `docs/spec/v3-assets/sprites-reference-dark-4x.png`: the same sprites at 4x on the dark background.

### 5.2 `src/components/PixelSprite/sprites.js` (create with exactly this content)
Grid legend: each string is one row, top to bottom. Each character is one sprite pixel. `.` is transparent, and any other letter is a key in that sprite's palette. Palette values are CSS custom properties defined in `tokens.css` (6.2), or `currentColor`.

```js
// Original pixel-art sprites for this site (SPEC-v3 section 5). Drawn for this
// project; not copied or traced from any game asset. The grids are the source
// of truth: do not edit them without a spec change.

const OUTLINE = 'var(--sprite-outline)'
const EYE_WHITE = 'var(--sprite-eye-white)'

const DEFS = {
  charmander: {
    grid: [
      '................',
      '....oooo........',
      '...oaaaao.......',
      '..oaaaaaao...r..',
      '..oaaaaaao..rfr.',
      '..oawaawao..rfr.',
      '..oaeaaeao...r..',
      '..oaaaaaao..oao.',
      '...oaaaao...oao.',
      '...oabbaoo.oao..',
      '..oaobbaoaooao..',
      '..oaobbbaoaao...',
      '...oabbbaaoo....',
      '...oaaaaao......',
      '..oaaooaaao.....',
      '..ooo..ooo......',
    ],
    palette: {
      o: OUTLINE,
      a: 'var(--sprite-char-body)',
      b: 'var(--sprite-char-belly)',
      w: EYE_WHITE,
      e: OUTLINE,
      f: 'var(--sprite-char-flame-inner)',
      r: 'var(--sprite-char-flame-outer)',
    },
  },
  bulbasaur: {
    grid: [
      '................',
      '........oooo....',
      '......oollllo...',
      '.....olkllklo...',
      '....olllkllllo..',
      '..ooolkllllklo..',
      '.ogggolllllloo..',
      'oggdgggoooooggo.',
      'oggggggggggdggo.',
      'ogweggggwegggo..',
      'ogeegggggeeggo..',
      '.oggggggggggdo..',
      '..ogggdgggggo...',
      '..ogoooggooggo..',
      '..oo...oo..ooo..',
      '................',
    ],
    palette: {
      o: OUTLINE,
      g: 'var(--sprite-bulb-body)',
      d: 'var(--sprite-bulb-spot)',
      l: 'var(--sprite-bulb-bulb)',
      k: 'var(--sprite-bulb-bulb-dark)',
      w: EYE_WHITE,
      e: 'var(--sprite-bulb-eye)',
    },
  },
  squirtle: {
    grid: [
      '................',
      '....oooooo......',
      '...oaaaaaao.....',
      '..oaaaaaaaao....',
      '..oawaaaawao....',
      '..oaeaaaaeao....',
      '..oaaaaaaaao....',
      '...oaaooaao.....',
      '..ossoaaosso....',
      '.oaosbbbbsoao...',
      '.oaosbttbsoaoo..',
      '..oosbbbbsoaao..',
      '...osbttbsooao..',
      '...ooaooaoo.oo..',
      '...oaao.oaao....',
      '...ooo...ooo....',
    ],
    palette: {
      o: OUTLINE,
      a: 'var(--sprite-squirt-body)',
      s: 'var(--sprite-squirt-shell)',
      t: 'var(--sprite-squirt-shell-light)',
      b: 'var(--sprite-squirt-belly)',
      w: EYE_WHITE,
      e: 'var(--sprite-squirt-eye)',
    },
  },
  egg: {
    grid: [
      '................',
      '................',
      '......oooo......',
      '.....ohhhho.....',
      '....ohhpphho....',
      '....ohhpphho....',
      '...ohhhhhhhho...',
      '...ophhhhhhpo...',
      '...opphhhhppo...',
      '...ohhhhhhhho...',
      '...ohhhpphhho...',
      '...ohhhpphhho...',
      '....ohhhhhho....',
      '.....oooooo.....',
      '................',
      '................',
    ],
    palette: {
      o: OUTLINE,
      h: 'var(--sprite-egg-shell)',
      p: 'var(--sprite-egg-spot)',
    },
  },
  cursor: {
    grid: ['o...', 'oo..', 'ooo.', 'oooo', 'ooo.', 'oo..', 'o...'],
    palette: { o: 'currentColor' },
  },
  more: {
    grid: ['ooooooo', '.ooooo.', '..ooo..', '...o...'],
    palette: { o: 'currentColor' },
  },
}

/**
 * Grid -> one SVG path per fill color. Each horizontal run of the same key
 * becomes "M{x} {y}h{w}v1h-{w}z". Keys that share a fill share a path.
 * @returns {{ fill: string, d: string }[]}
 */
export function toPaths({ grid, palette }) {
  const byFill = new Map()
  grid.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const key = row[x]
      if (key === '.') {
        x += 1
        continue
      }
      let end = x + 1
      while (end < row.length && row[end] === key) end += 1
      const fill = palette[key]
      if (!fill) throw new Error(`sprite palette has no key "${key}"`)
      const w = end - x
      byFill.set(fill, `${byFill.get(fill) ?? ''}M${x} ${y}h${w}v1h-${w}z`)
      x = end
    }
  })
  return [...byFill].map(([fill, d]) => ({ fill, d }))
}

export const SPRITE_DEFS = DEFS

/** name -> { width, height, paths } */
export const SPRITES = Object.fromEntries(
  Object.entries(DEFS).map(([name, def]) => [
    name,
    { width: def.grid[0].length, height: def.grid.length, paths: toPaths(def) },
  ]),
)

/** Guide id (site.json pages[].guide) -> caption shown under the sprite. */
export const GUIDE_NAMES = { charmander: 'Charmander', bulbasaur: 'Bulbasaur', squirtle: 'Squirtle' }

/** Guide id -> type accent; selects --color-type-{type}. Egg / no guide = "normal". */
export const GUIDE_TYPES = { charmander: 'fire', bulbasaur: 'grass', squirtle: 'water' }
```

Expected filled-cell counts. The unit tests assert these.

| Sprite | Size (w x h) | Filled cells | Per key |
| :- | :- | :- | :- |
| charmander | 16 x 16 | 134 | a 60, b 10, e 2, f 2, o 52, r 6, w 2 |
| bulbasaur | 16 x 16 | 155 | d 4, e 6, g 61, k 5, l 27, o 50, w 2 |
| squirtle | 16 x 16 | 144 | a 53, b 12, e 2, o 59, s 12, t 4, w 2 |
| egg | 16 x 16 | 100 | h 56, o 30, p 14 |
| cursor | 4 x 7 | 16 | o 16 |
| more | 7 x 4 | 16 | o 16 |

### 5.3 Components

**`src/components/PixelSprite/PixelSprite.jsx`**
```jsx
import { SPRITES } from './sprites.js'

/**
 * One pixel sprite as inline SVG. Always decorative (aria-hidden): the
 * accessible name comes from the surrounding link text. Size is set by CSS
 * via the className (width/height = grid size x an integer --*-px token).
 */
export default function PixelSprite({ name, className }) {
  const sprite = SPRITES[name]
  if (!sprite) return null
  return (
    <svg
      className={className}
      viewBox={`0 0 ${sprite.width} ${sprite.height}`}
      width={sprite.width}
      height={sprite.height}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      data-sprite={name}
    >
      {sprite.paths.map((path) => (
        <path key={path.fill} d={path.d} style={{ fill: path.fill }} />
      ))}
    </svg>
  )
}
```
Fills use `style={{ fill }}`, not the `fill` attribute, because `var()` is only reliable in CSS declarations.

**`src/components/MenuCursor/MenuCursor.jsx`**
```jsx
import PixelSprite from '../PixelSprite/PixelSprite.jsx'
import styles from './MenuCursor.module.css'

/** The red "▶" menu cursor. Decorative. Color: --color-cursor. */
export default function MenuCursor({ className }) {
  return <PixelSprite name="cursor" className={className ? `${styles.cursor} ${className}` : styles.cursor} />
}
```
`src/components/MenuCursor/MenuCursor.module.css`:
```css
.cursor {
  flex: none;
  width: calc(4 * var(--cursor-px));
  height: calc(7 * var(--cursor-px));
  color: var(--color-cursor);
}
```

**`src/components/DialogBox/DialogBox.jsx`**
```jsx
import PixelSprite from '../PixelSprite/PixelSprite.jsx'
import styles from './DialogBox.module.css'

/**
 * Pokémon-style dialog box (global .pixel-dialog recipe). `as` picks the
 * element (default "div"); `more` adds the decorative bobbing "▼".
 * Other props (aria-labelledby, id, ...) pass through.
 */
export default function DialogBox({ as: Tag = 'div', more = false, className, children, ...rest }) {
  const cls = ['pixel-dialog', styles.box, className].filter(Boolean).join(' ')
  return (
    <Tag className={cls} {...rest}>
      {children}
      {more && <PixelSprite name="more" className={styles.more} />}
    </Tag>
  )
}
```
`src/components/DialogBox/DialogBox.module.css`:
```css
.box {
  position: relative;
}

.more {
  position: absolute;
  inset-inline-end: var(--space-4);
  inset-block-end: var(--space-3);
  width: calc(7 * var(--cursor-px));
  height: calc(4 * var(--cursor-px));
  color: var(--color-cursor);
  animation: more-bob var(--sprite-bob-duration) steps(1, end) 0ms var(--sprite-bob-iterations) both;
}

@keyframes more-bob {
  0% { transform: translateY(0); }
  50% { transform: translateY(var(--cursor-px)); }
  100% { transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .more { animation: none; }
}
```

### 5.4 `src/components/GuideLink/GuideLink.jsx`
```jsx
import Link from '../../router/Link.jsx'
import MenuCursor from '../MenuCursor/MenuCursor.jsx'
import PixelSprite from '../PixelSprite/PixelSprite.jsx'
import { GUIDE_NAMES, GUIDE_TYPES } from '../PixelSprite/sprites.js'
import styles from './GuideLink.module.css'

/**
 * One Home party slot: sprite + "▶ Label" + caption, all inside ONE link.
 * Accessible name: "Experience, with Charmander" (fan art on) or "Experience".
 * fanArt false or no guide -> Egg sprite, no caption, type "normal".
 */
export default function GuideLink({ page, fanArt, index }) {
  const guide = fanArt && page.guide ? page.guide : null
  const sprite = guide ?? 'egg'
  const caption = guide ? GUIDE_NAMES[guide] : null
  const type = guide ? GUIDE_TYPES[guide] : 'normal'
  return (
    <Link
      href={page.href}
      className={styles.guide}
      data-type={type}
      style={{ '--guide-delay': `calc(${index} * var(--sprite-stagger))` }}
    >
      <PixelSprite name={sprite} className={styles.sprite} />
      <span className={styles.text}>
        <span className={styles.label}>
          <MenuCursor className={styles.cursor} />
          <span className={styles.labelText}>{page.label}</span>
        </span>
        {caption && (
          <span className={styles.caption}>
            <span className="visually-hidden">, with </span>
            {caption}
          </span>
        )}
      </span>
    </Link>
  )
}
```

### 5.5 `src/components/GuideLink/GuideLink.module.css` (rendering and animation)
```css
.guide {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  column-gap: var(--space-4);
  min-height: var(--target-min);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-text);
  text-decoration-line: none;
  transition: background-color var(--duration-fast) var(--ease-standard);
}

.guide:hover,
.guide:focus-visible {
  background-color: var(--color-bg-subtle);
  color: var(--color-text);
}

.sprite {
  width: calc(16 * var(--sprite-px));
  height: calc(16 * var(--sprite-px));
  animation: sprite-bob var(--sprite-bob-duration) steps(1, end) var(--guide-delay, 0ms)
    var(--sprite-bob-iterations) both;
}

.guide:hover .sprite,
.guide:focus-visible .sprite {
  animation: sprite-hop var(--sprite-hop-duration) steps(1, end) 0ms infinite;
}

.text {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}

.label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-base);
  font-weight: var(--weight-bold);
  line-height: var(--leading-snug);
}

.cursor {
  visibility: hidden;
}

.guide:hover .cursor,
.guide:focus-visible .cursor {
  visibility: visible;
}

.guide:hover .labelText,
.guide:focus-visible .labelText {
  text-decoration-line: underline;
  text-decoration-thickness: var(--border-width-pixel);
  text-decoration-color: var(--guide-accent);
  text-underline-offset: 0.25em;
}

.caption {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  line-height: var(--leading-snug);
}

.guide[data-type="fire"] { --guide-accent: var(--color-type-fire); }
.guide[data-type="grass"] { --guide-accent: var(--color-type-grass); }
.guide[data-type="water"] { --guide-accent: var(--color-type-water); }
.guide[data-type="normal"] { --guide-accent: var(--color-type-normal); }

@media (min-width: 480px) {
  .guide {
    grid-template-columns: minmax(0, 1fr);
    justify-items: center;
    row-gap: var(--space-2);
    text-align: center;
  }

  .text {
    justify-items: center;
  }

  /* Amended 2026-11-10: in the centered column layout the cursor sits outside
     the label's box, so label and caption share the same center line. */
  .label {
    position: relative;
  }

  .cursor {
    position: absolute;
    inset-inline-end: 100%;
    margin-inline-end: var(--space-2);
  }
}

@keyframes sprite-bob {
  0% { transform: translateY(0); }
  50% { transform: translateY(calc(var(--sprite-px) * -1)); }
  100% { transform: translateY(0); }
}

@keyframes sprite-hop {
  0% { transform: translateY(0); }
  25% { transform: translateY(calc(var(--sprite-px) * -2)); }
  50% { transform: translateY(0); }
  75% { transform: translateY(calc(var(--sprite-px) * -1)); }
  100% { transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .sprite,
  .guide:hover .sprite,
  .guide:focus-visible .sprite {
    animation: none;
  }
}
```
The focus ring comes from the global `:focus-visible` rule (6.4): a 3 px outline in `--color-focus-ring`, offset 2 px.

**Animation summary.** Values come from tokens (6.2).

| State | What moves | Keyframes | Timing |
| :- | :- | :- | :- |
| Idle (page load) | each sprite bobs up 1 sprite px and back | `sprite-bob` | 1000 ms, `steps(1, end)`, 4 iterations, delay `index × 250ms` (0, 250, 500 ms). All motion ends by 4.5 s |
| Idle | the "▼" in the dialog bobs down 1 cursor px | `more-bob` | 1000 ms, `steps(1, end)`, 4 iterations, delay 0 |
| Hover or keyboard focus | the sprite hops 2 px up, down, 1 px up, down; `▶` appears; label underlined in the type color; tile background `--color-bg-subtle` | `sprite-hop` | 600 ms, `steps(1, end)`, infinite while hovered or focused |
| `prefers-reduced-motion: reduce` | **nothing moves**; `▶`, underline and background still change on hover and focus | none | none |

**Crispness rules:**
- Sprites are only drawn at sizes that are whole multiples of the grid: `--sprite-px` is 4px or 6px, `--sprite-px-title` is 2px, `--cursor-px` is 2px.
- There are no fractional scales, no `transform: scale()` and no `filter`.
- `shape-rendering="crispEdges"` is always set.

---

## 6. Theme: palette, tokens, fonts, motifs

### 6.1 Color palette and contrast (computed with the WCAG 2.x formula)

| Semantic token | Light | Dark | Use |
| :- | :- | :- | :- |
| `--color-bg` | `#FFFDF5` | `#12121C` | page background |
| `--color-bg-subtle` | `#F2EFE2` | `#1E1E2C` | hover fills |
| `--color-text` | `#1C1C28` | `#F4F2E8` | text |
| `--color-text-muted` | `#4A4A5C` | `#B4B2C4` | meta, captions |
| `--color-border` | `#C9C5B5` | `#3A3A50` | decorative rules |
| `--color-border-strong` | `#1C1C28` | `#F4F2E8` | button borders and shadows, header rule |
| `--color-accent` | `#C8102E` | `#FF6B6B` | primary button background |
| `--color-accent-contrast` | `#FFFFFF` | `#12121C` | text on accent |
| `--color-link` | `#1C1C28` | `#F4F2E8` | links (always underlined) |
| `--color-link-hover` | `#A00D25` | `#FF9A9A` | link hover, primary button hover background |
| `--color-focus-ring` | `#2050C8` | `#7AA8FF` | focus outline |
| `--color-tag-bg` | `#E6ECF5` | `#262638` | type badges |
| `--color-tag-text` | `#1C1C28` | `#F4F2E8` | type badges |
| `--color-selection-bg` | `#2050C8` | `#7AA8FF` | `::selection` |
| `--color-selection-text` | `#FFFFFF` | `#12121C` | `::selection` |
| `--color-dialog-bg` **(new)** | `#FFFFFF` | `#1A1A28` | dialog boxes, cards, outline buttons |
| `--color-dialog-border` **(new)** | `#1C1C28` | `#F4F2E8` | dialog outer border |
| `--color-dialog-border-inner` **(new)** | `#6878A8` | `#7A88B8` | dialog inner line |
| `--color-cursor` **(new)** | `#C8102E` | `#FF6B6B` | `▶` and `▼` |
| `--color-type-fire` **(new)** | `#C2410C` | `#FF8C42` | Experience accent |
| `--color-type-grass` **(new)** | `#2E7D32` | `#6CCB5F` | Projects accent |
| `--color-type-water` **(new)** | `#1D63B8` | `#5AA9FF` | About accent |
| `--color-type-normal` **(new)** | `#4A4A5C` | `#B4B2C4` | pages with no guide |
| `--color-scheme` | `light` | `dark` | |

Verified contrast ratios. Requirement: at least 4.5 for text, at least 3 for UI and graphics.

| Pair | Light | Dark |
| :- | :- | :- |
| text / bg | 16.55 | 16.57 |
| text / dialog-bg | 16.85 | 15.31 |
| text / bg-subtle | 14.62 | 14.65 |
| muted / bg | 8.50 | 8.95 |
| muted / dialog-bg | 8.66 | 8.27 |
| muted / bg-subtle | 7.51 | 7.91 |
| accent-contrast / accent | 5.88 | 6.70 |
| accent-contrast / link-hover (button hover) | 8.14 | 9.16 |
| link-hover / bg | 8.00 | 9.16 |
| tag-text / tag-bg | 14.19 | 13.21 |
| selection-text / selection-bg | 6.90 | 7.86 |
| focus-ring / bg | 6.78 | 7.86 |
| focus-ring / dialog-bg | 6.90 | 7.26 |
| cursor / dialog-bg | 5.88 | 6.19 |
| type-fire / bg | 5.08 | 8.04 |
| type-grass / bg | 5.03 | 9.16 |
| type-water / bg | 5.84 | 7.58 |
| dialog-border / bg | 16.55 | 16.57 |
| dialog-border-inner / dialog-bg | 4.34 | 4.94 |

### 6.2 `src/styles/tokens.css`: replace the whole file with this
```css
/*
 * Design tokens (SPEC-v3 section 6).
 * - Palette primitives (--pk-*): used ONLY by themes/*.css.
 * - Sprite art color tokens (--sprite-outline, --sprite-eye-*, --sprite-char-*,
 *   --sprite-bulb-*, --sprite-squirt-*, --sprite-egg-*): theme-independent
 *   pixel-art colors, used
 *   only by src/components/PixelSprite/sprites.js.
 * - Everything else: theme-independent semantic tokens.
 */

:root {
  /* Palette primitives: day */
  --pk-white: #FFFFFF;
  --pk-paper: #FFFDF5;
  --pk-paper-2: #F2EFE2;
  --pk-sky-1: #E6ECF5;
  --pk-sand: #C9C5B5;
  --pk-ink: #1C1C28;
  --pk-ink-2: #4A4A5C;
  --pk-slate: #6878A8;
  --pk-red: #C8102E;
  --pk-red-deep: #A00D25;
  --pk-blue: #2050C8;
  --pk-fire: #C2410C;
  --pk-grass: #2E7D32;
  --pk-water: #1D63B8;

  /* Palette primitives: night */
  --pk-night: #12121C;
  --pk-night-2: #1E1E2C;
  --pk-night-3: #1A1A28;
  --pk-night-4: #262638;
  --pk-night-line: #3A3A50;
  --pk-moon: #F4F2E8;
  --pk-moon-2: #B4B2C4;
  --pk-slate-light: #7A88B8;
  --pk-red-light: #FF6B6B;
  --pk-red-lighter: #FF9A9A;
  --pk-blue-light: #7AA8FF;
  --pk-fire-light: #FF8C42;
  --pk-grass-light: #6CCB5F;
  --pk-water-light: #5AA9FF;

  /* Sprite art (same in every theme) */
  --sprite-outline: #202028;
  --sprite-eye-white: #FFFFFF;
  --sprite-char-body: #F08030;
  --sprite-char-belly: #F8D890;
  --sprite-char-flame-outer: #E03018;
  --sprite-char-flame-inner: #F8D030;
  --sprite-bulb-body: #78C8A0;
  --sprite-bulb-spot: #4A9078;
  --sprite-bulb-bulb: #58B048;
  --sprite-bulb-bulb-dark: #307830;
  --sprite-bulb-eye: #C83030;
  --sprite-squirt-body: #78B8E8;
  --sprite-squirt-shell: #B87838;
  --sprite-squirt-shell-light: #E8B868;
  --sprite-squirt-belly: #F0D890;
  --sprite-squirt-eye: #783018;
  --sprite-egg-shell: #F4F0DC;
  --sprite-egg-spot: #78C850;
}

:root {
  /* Typography: self-hosted, @font-face in index.html (SPEC-v3 6.4) */
  --font-display: "Press Start 2P", ui-monospace, "Courier New", monospace;
  --font-body: "Pixelify Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
  --font-sans: var(--font-body);
  --font-mono: var(--font-body);

  /* Body sizes (Pixelify Sans) */
  --text-xs:   0.875rem;  /* 14px: captions, tags, fine print */
  --text-sm:   1rem;      /* 16px: meta lines, nav */
  --text-base: 1.125rem;  /* 18px: body */
  --text-lg:   1.25rem;   /* 20px: Home role line, lead */
  --text-xl:   1.375rem;  /* 22px: entry titles */
  --text-2xl:  1.5rem;    /* 24px */
  --text-3xl:  1.25rem;   /* 20px (legacy alias) */
  --text-4xl:  1.5rem;    /* 24px (legacy alias) */

  /* Display sizes (Press Start 2P): multiples of 8px at a 16px root only */
  --text-display-sm:  1rem;    /* 16px: header name, section h2, dialog prompt */
  --text-display:     1.5rem;  /* 24px: Home h1 (>=480: 2rem, >=768: 3rem) */
  --text-page-title:  1.5rem;  /* 24px: subpage h1 (>=768: 2rem) */
  --leading-display:  1.5;

  --weight-regular: 400;
  --weight-medium:  700;  /* Pixelify Sans ships 400 and 700 only */
  --weight-bold:    700;

  --leading-tight:  1.2;
  --leading-snug:   1.35;
  --leading-normal: 1.6;

  --tracking-tight: 0;       /* never tighten pixel fonts */
  --tracking-wide:  0.06em;

  /* Spacing (4px base) */
  --space-1: 0.25rem;  --space-2: 0.5rem;  --space-3: 0.75rem; --space-4: 1rem;
  --space-5: 1.25rem;  --space-6: 1.5rem;  --space-8: 2rem;    --space-10: 2.5rem;
  --space-12: 3rem;    --space-16: 4rem;   --space-20: 5rem;   --space-24: 6rem;

  /* Layout */
  --container-max: 64rem;
  --measure: 68ch;
  --gutter: clamp(1rem, 0.5rem + 2.5vw, 2rem);
  --header-height: 3.5rem;
  --section-gap: clamp(4rem, 3rem + 4vw, 6rem);

  /* Shape */
  --border-width: 1px;
  --border-width-pixel: 2px;
  --border-width-thick: 4px;
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-dialog: 6px;
  --radius-full: 9999px;

  /* Focus */
  --focus-ring-width: 3px;
  --focus-ring-offset: 2px;

  /* Pixel scales (integers only) */
  --sprite-px: 4px;        /* Home sprites: 64px; >=768: 6px = 96px */
  --sprite-px-title: 2px;  /* subpage title sprite: 32px */
  --cursor-px: 2px;        /* ▶ 8x14px, ▼ 14x8px */

  /* Motion */
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --sprite-bob-duration: 1000ms;
  --sprite-bob-iterations: 4;
  --sprite-hop-duration: 600ms;
  --sprite-stagger: 250ms;

  /* Layers */
  --z-header: 10;
  --z-menu: 20;
  --z-skip-link: 100;

  /* Hit area */
  --target-min: 44px;

  /* Component sizes */
  --icon-size: 1.125rem;
  --photo-size: 120px;
  --photo-size-md: 160px;
  --date-column: 11rem;
}

@media (min-width: 480px) {
  :root { --text-display: 2rem; }
}

@media (min-width: 768px) {
  :root {
    --text-display: 3rem;
    --text-page-title: 2rem;
    --sprite-px: 6px;
  }
}

@media (prefers-reduced-motion: reduce) {
  :root { --duration-fast: 0ms; --duration-base: 0ms; }
}
```
The v2 tokens `--explore-index-col` and the `--gray-*` primitives are **removed**. Nothing may reference them afterwards (QA checks this with grep).

### 6.3 Theme files

**`src/styles/themes/light.css`**: replace the whole file.
- The selector is `:root, :root[data-theme="light"]`.
- It declares, in this order:
  - `--color-bg: var(--pk-paper)`
  - `--color-bg-subtle: var(--pk-paper-2)`
  - `--color-text: var(--pk-ink)`
  - `--color-text-muted: var(--pk-ink-2)`
  - `--color-border: var(--pk-sand)`
  - `--color-border-strong: var(--pk-ink)`
  - `--color-accent: var(--pk-red)`
  - `--color-accent-contrast: var(--pk-white)`
  - `--color-link: var(--pk-ink)`
  - `--color-link-hover: var(--pk-red-deep)`
  - `--color-focus-ring: var(--pk-blue)`
  - `--color-tag-bg: var(--pk-sky-1)`
  - `--color-tag-text: var(--pk-ink)`
  - `--color-selection-bg: var(--pk-blue)`
  - `--color-selection-text: var(--pk-white)`
  - `--color-dialog-bg: var(--pk-white)`
  - `--color-dialog-border: var(--pk-ink)`
  - `--color-dialog-border-inner: var(--pk-slate)`
  - `--color-cursor: var(--pk-red)`
  - `--color-type-fire: var(--pk-fire)`
  - `--color-type-grass: var(--pk-grass)`
  - `--color-type-water: var(--pk-water)`
  - `--color-type-normal: var(--pk-ink-2)`
  - `--color-scheme: light`
  - `color-scheme: light`
- Keep the existing `@media print { html:root[data-theme] { … } }` block, with exactly the same declarations as the light block above.

**`src/styles/themes/dark.css`**: replace the whole file.
- The selector is `:root[data-theme="dark"]`.
- It declares, in this order:
  - `--color-bg: var(--pk-night)`
  - `--color-bg-subtle: var(--pk-night-2)`
  - `--color-text: var(--pk-moon)`
  - `--color-text-muted: var(--pk-moon-2)`
  - `--color-border: var(--pk-night-line)`
  - `--color-border-strong: var(--pk-moon)`
  - `--color-accent: var(--pk-red-light)`
  - `--color-accent-contrast: var(--pk-night)`
  - `--color-link: var(--pk-moon)`
  - `--color-link-hover: var(--pk-red-lighter)`
  - `--color-focus-ring: var(--pk-blue-light)`
  - `--color-tag-bg: var(--pk-night-4)`
  - `--color-tag-text: var(--pk-moon)`
  - `--color-selection-bg: var(--pk-blue-light)`
  - `--color-selection-text: var(--pk-night)`
  - `--color-dialog-bg: var(--pk-night-3)`
  - `--color-dialog-border: var(--pk-moon)`
  - `--color-dialog-border-inner: var(--pk-slate-light)`
  - `--color-cursor: var(--pk-red-light)`
  - `--color-type-fire: var(--pk-fire-light)`
  - `--color-type-grass: var(--pk-grass-light)`
  - `--color-type-water: var(--pk-water-light)`
  - `--color-type-normal: var(--pk-moon-2)`
  - `--color-scheme: dark`
  - `color-scheme: dark`

**Theme architecture is unchanged** (v1 REQ-203 to REQ-206):
- `THEMES` stays `['light', 'dark']`;
- `useTheme` and the toggle are unchanged;
- adding a theme still means adding a file that defines every semantic token above.

### 6.4 Fonts (self-hosted)

**Files.** Copy these byte for byte from `docs/spec/v3-assets/fonts/` to `public/fonts/`. Do not re-download, rename differently, subset or edit them.

| Destination | Bytes | SHA-256 |
| :- | :- | :- |
| `public/fonts/press-start-2p-latin-400.woff2` | 12512 | `afec86997fdaf54af1f59358fa2c1e2a0f1d04146edad18e5cd141d0384a7548` |
| `public/fonts/pixelify-sans-latin-400.woff2` | 7692 | `d830612ac9131788ebae754b9268f83f7c1d3ffa9bc0f9a5514207a8283fe71e` |
| `public/fonts/pixelify-sans-latin-700.woff2` | 7904 | `c836cfa5c0e9d62ea9b890e0418d52a6004149090a521cd198a8c09f5d5ab893` |
| `public/fonts/OFL-press-start-2p.txt` | 4413 | `705960c3281a5765ecc0b59bd4ed7ca59eed165748076bc2fc3e8fdbfeb944b0` |
| `public/fonts/OFL-pixelify-sans.txt` | 4488 | `b66ba46f511a851ab09998b5a5a9fdbb102545a3864cb993095e1745996873a7` |

Provenance (for the record only; do not fetch):
- `https://cdn.jsdelivr.net/fontsource/fonts/press-start-2p@5.2.7/latin-400-normal.woff2`
- `https://cdn.jsdelivr.net/fontsource/fonts/pixelify-sans@5.2.7/latin-{400,700}-normal.woff2`
- The license texts come from `google/fonts` (`ofl/pressstart2p/OFL.txt` and `ofl/pixelifysans/OFL.txt`).

**`index.html` (frontend).** Make exactly these changes, and leave everything else as it is:
1. Change `<meta name="theme-color" content="#ffffff" />` to `content="#FFFDF5"`.
2. Directly after the theme-color meta, and before the theme bootstrap `<script>`, insert:
```html
    <link rel="preload" href="%BASE_URL%fonts/press-start-2p-latin-400.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="%BASE_URL%fonts/pixelify-sans-latin-400.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="%BASE_URL%fonts/pixelify-sans-latin-700.woff2" as="font" type="font/woff2" crossorigin />
    <style>
      @font-face { font-family: "Press Start 2P"; src: url("%BASE_URL%fonts/press-start-2p-latin-400.woff2") format("woff2"); font-weight: 400; font-style: normal; font-display: optional; }
      @font-face { font-family: "Pixelify Sans"; src: url("%BASE_URL%fonts/pixelify-sans-latin-400.woff2") format("woff2"); font-weight: 400; font-style: normal; font-display: optional; }
      @font-face { font-family: "Pixelify Sans"; src: url("%BASE_URL%fonts/pixelify-sans-latin-700.woff2") format("woff2"); font-weight: 700; font-style: normal; font-display: optional; }
    </style>
```

Why:
- Vite replaces `%BASE_URL%` in `index.html` with the configured base. That keeps project-site deploys (`BASE_PATH=/personal-website/`) working.
- `font-display: optional` together with the preloads means the font is either ready at first paint or skipped for that page view. Text never swaps, so there is no layout shift (CLS budget 0.05).
- The `@font-face` rules live in `index.html`, so the `noscript` page gets the fonts too.

### 6.5 `src/styles/base.css` changes (frontend)
1. In the `body` rule:
   - set `font-family: var(--font-body);`
   - add `font-synthesis: none;`
   - keep `font-size: var(--text-base)`.
2. Replace the `h1, h2, h3` font rules as follows:
   - `h1, h2, h3 { font-family: var(--font-body); font-weight: var(--weight-bold); letter-spacing: 0; }`
   - keep the sizes: h1 `var(--text-4xl)`, h2 `var(--text-2xl)`, h3 `var(--text-xl)`.

   The display font is applied only through the classes listed in section 7.
3. Change the `:focus-visible` rule to:
   ```css
   outline: var(--focus-ring-width) solid var(--color-focus-ring);
   outline-offset: var(--focus-ring-offset);
   ```
   The values come from the new tokens.
4. Add the dialog utility under Utilities:
```css
/* Pokémon-style dialog box: thick outer border, gap, thin inner line. */
.pixel-dialog {
  border: var(--border-width-thick) solid var(--color-dialog-border);
  border-radius: var(--radius-dialog);
  background-color: var(--color-dialog-bg);
  box-shadow:
    inset 0 0 0 var(--border-width-pixel) var(--color-dialog-bg),
    inset 0 0 0 var(--border-width-thick) var(--color-dialog-border-inner);
}
```
5. Add a pixel-button utility under Utilities. `ResumeLink` and `LinkButton` use it (section 7):
```css
/* Chunky pixel button: 2px border + 4px hard drop shadow; presses down 2px. */
.pixel-button {
  border: var(--border-width-pixel) solid var(--color-border-strong);
  border-radius: var(--radius-md);
  box-shadow: 0 var(--border-width-thick) 0 0 var(--color-border-strong);
  margin-block-end: var(--border-width-thick);
  font-weight: var(--weight-bold);
}

.pixel-button:active {
  transform: translateY(var(--border-width-pixel));
  box-shadow: 0 var(--border-width-pixel) 0 0 var(--color-border-strong);
}
```
6. Inside `@media print`, add `svg { display: none !important; }` and `.pixel-dialog { box-shadow: none; }`.
7. Do not change anything else in `base.css`. In particular, keep the reduced-motion block and the `:is(h1, h2)[tabindex="-1"]:focus` rule.

---

## 7. Site-wide theme carry-through (frontend, component by component)

| File | Exact change |
| :- | :- |
| `src/components/SiteHeader/SiteHeader.module.css` | `.header`: `border-block-end: var(--border-width-pixel) solid var(--color-border-strong);`.<br>`.name`: `font-family: var(--font-display); font-size: var(--text-display-sm); font-weight: var(--weight-regular); letter-spacing: 0;`. Keep `line-height: var(--target-min)` and the ellipsis rules. |
| `src/components/Nav/Nav.jsx` | Inside each `Link`, before `{item.label}`, render `{item.id === currentId && <MenuCursor className={styles.cursor} />}`. Import `MenuCursor` from `../MenuCursor/MenuCursor.jsx`. |
| `src/components/Nav/Nav.module.css` | `.link`: add `gap: var(--space-1);`.<br>Add `.cursor { width: calc(4 * var(--cursor-px)); height: calc(7 * var(--cursor-px)); }` (size only; the color comes from MenuCursor).<br>Keep the current-page underline. |
| `src/components/Section/Section.jsx` | Render the h2 as `<h2 id={headingId} tabIndex={-1} className={styles.heading}><MenuCursor /> {label}</h2>`. Import `MenuCursor`. |
| `src/components/Section/Section.module.css` | `.section`: `border-block-start: var(--border-width-pixel) dashed var(--color-border);`.<br>`.heading`: `display: flex; align-items: center; gap: var(--space-3); margin-block-end: var(--space-8); font-family: var(--font-display); font-size: var(--text-display-sm); font-weight: var(--weight-regular); line-height: var(--leading-display); letter-spacing: 0;`. |
| `src/pages/ContentPage.jsx` | The `<article>` gets `data-type={type}`, where `type = site.fanArt && page.guide ? GUIDE_TYPES[page.guide] : 'normal'`. Get `site` from `content.site` and import `GUIDE_TYPES` from `../components/PixelSprite/sprites.js`.<br>The h1 becomes `<h1 id="page-heading" tabIndex={-1} className={styles.title}>{site.fanArt && page.guide && <PixelSprite name={page.guide} className={styles.titleSprite} />}<span>{page.label}</span></h1>`. |
| `src/pages/Page.module.css` | `.title`: `display: flex; align-items: center; gap: var(--space-4); padding-block-end: var(--space-3); border-block-end: var(--border-width-thick) solid var(--page-accent, var(--color-border-strong)); font-family: var(--font-display); font-weight: var(--weight-regular); line-height: var(--leading-display); letter-spacing: 0;`. Keep `font-size: var(--text-page-title)` and the margins.<br>Add `.titleSprite { flex: none; width: calc(16 * var(--sprite-px-title)); height: calc(16 * var(--sprite-px-title)); }`.<br>Add `.page[data-type="fire"] { --page-accent: var(--color-type-fire); }`, plus the same rule for `grass`, `water` and `normal` with the matching `--color-type-*` token.<br>Add `.notice { display: flex; align-items: center; gap: var(--space-4); max-width: var(--measure); padding: var(--space-4) var(--space-5); }` and `.noticeSprite { flex: none; width: calc(16 * var(--sprite-px-title) * 2); height: calc(16 * var(--sprite-px-title) * 2); }` (64 px). |
| `src/pages/NotFoundPage.jsx` | Replace `<p className={styles.text}>There is no page at this address.</p>` with `<DialogBox className={styles.notice}><PixelSprite name="egg" className={styles.noticeSprite} /><p className={styles.text}>A wild 404 appeared! There is no page at this address.</p></DialogBox>`. Import `DialogBox` and `PixelSprite`. The rest is unchanged. The egg here is static (no animation class). |
| `src/components/ResumeLink/ResumeLink.jsx` | The `variant="button"` branch: `className={\`pixel-button ${styles.button}\`}`. |
| `src/components/ResumeLink/ResumeLink.module.css` | `.button`: remove `border`, `border-radius` and `font-weight` (the utility provides them); keep `background-color: var(--color-accent); color: var(--color-accent-contrast);`.<br>`.button:hover`: `background-color: var(--color-link-hover); color: var(--color-accent-contrast);`, and delete the `border-color` line. |
| `src/components/LinkButton/LinkButton.jsx` | For `variant === 'outline'`, add the `pixel-button` class to `className`. |
| `src/components/LinkButton/LinkButton.module.css` | `.outline`: remove `border`, `border-radius` and `font-weight`; add `background-color: var(--color-dialog-bg);`.<br>`.outline:hover`: `background-color: var(--color-bg-subtle); color: var(--color-text);`, and delete the `border-color` line. |
| `src/components/Contact/Contact.jsx` + `.module.css` | Give the "Copy email" `<button>` the `pixel-button` class as well as its module class. In its module class, remove any `border`, `border-radius` and `font-weight` declarations, and set `background-color: var(--color-dialog-bg); color: var(--color-text); min-height: var(--target-min); padding: 0 var(--space-4);`. |
| `src/components/Tag/Tag.module.css` | `.tag`: `border: var(--border-width-pixel) solid var(--color-border-strong); border-radius: var(--radius-sm); background-color: var(--color-tag-bg); color: var(--color-tag-text); font-family: var(--font-body); font-size: var(--text-xs); font-weight: var(--weight-bold); padding: 0 var(--space-2);`. Keep `line-height: var(--leading-snug)`. These are the "type badges". |
| `src/components/Projects/ProjectCard.jsx` | Add the `pixel-dialog` class to the card's root element, next to `styles.card`. |
| `src/components/Projects/Projects.module.css` | `.card`: remove `border`, `border-radius`, `background-color` and `transition`; keep the padding and flex rules.<br>Replace the `.card:hover, .card:focus-within` rule with `{ --color-dialog-border-inner: var(--color-type-grass); }`.<br>`.featured, .status`: `font-family: var(--font-body); font-weight: var(--weight-bold); border-width: var(--border-width-pixel);`. |
| `src/components/About/About.jsx` | After the paragraphs and the `currently` line, add `{profile.availability && <p className={styles.currently}><span className={styles.label}>Availability</span> {profile.availability}</p>}`.<br>Before the paragraphs, add `{profile.photo && <img className={styles.photo} src={profile.photo.src} alt={profile.photo.alt} width="160" height="160" decoding="async" />}`.<br>In `About.module.css`, add `.photo { width: var(--photo-size); height: var(--photo-size); border-radius: var(--radius-full); object-fit: cover; }`. |
| `src/components/SiteFooter/SiteFooter.jsx` | New prop `fanArt` (boolean). Inside `.inner`, after the last `.row`, add<br>`<p className={styles.fine}>Fonts: Press Start 2P and Pixelify Sans (SIL Open Font License).</p>`<br>and `{fanArt && <p className={styles.fine}>{DISCLAIMER}</p>}`, where `DISCLAIMER` is the module constant with the exact section 9 string. |
| `src/components/SiteFooter/SiteFooter.module.css` | The footer's top border becomes `var(--border-width-pixel) solid var(--color-border-strong)`.<br>Add `.fine { max-width: var(--measure); color: var(--color-text-muted); font-size: var(--text-xs); line-height: var(--leading-snug); }`. |
| `src/App.jsx` | Pass `fanArt={site.fanArt}` to `SiteFooter`. Nothing else changes. `HomePage` and `ContentPage` already receive `content`. |
| **Delete** | `src/components/Hero/` (whole folder), `src/components/Explore/` (whole folder). Remove the `arrow-right` icon from `src/components/Icon/Icon.jsx` if `grep -rn "arrow-right" src` shows no other use. |

The experience timeline, education and skills render as in v2. They pick up the new fonts, colors and tag badges through tokens and need no structural changes.

---

## 8. Data model and scripts (backend)

### 8.1 `src/data/site.json`
- Add a top-level `"fanArt": true`. Put it after `"themeToggle"`.
- Add a `"guide"` field to each page:
  - `experience`: `"charmander"`;
  - `projects`: `"bulbasaur"`;
  - `about`: `"squirtle"`.

  Put it after `"label"`.
- Nothing else changes. `blurb` and `teaser` stay in the data and stay validated, but v3 no longer renders them.

### 8.2 Validation (`src/lib/content/validate.js`)
| Field | Rule | Message on failure (v1 6.11 format) |
| :- | :- | :- |
| `fanArt` | optional boolean, default `true` | `✖ src/data/site.json → fanArt: expected true or false, got "yes". Hint: use true to show the sprites or false to hide them.` |
| `pages[i].guide` | optional; `null` or one of `GUIDE_IDS = ['charmander', 'bulbasaur', 'squirtle']` | The standard enum error. For an edit distance of 2 or less, add the suggestion, e.g. `Hint: did you mean "charmander"?` |
| `pages[i].guide` uniqueness | each guide at most once across pages | `✖ src/data/site.json → pages[2] (id "about").guide: duplicate guide "charmander" (also at pages[0]). Hint: each guide can lead only one page.` |

Export `GUIDE_IDS` from `src/lib/content/normalize.js`, next to `SECTION_IDS`.

### 8.3 Normalization and API
- `Site` gains `fanArt: boolean`, defaulting to `true` when omitted.
- `Page` gains `guide: 'charmander'|'bulbasaur'|'squirtle'|null`, defaulting to `null`.
- Update `src/lib/content/types.js` to match.
- `src/lib/content/index.js` also re-exports `GUIDE_IDS`. The frontend test imports it from there, never from `normalize.js` (REQ-701).
- `getHead`, `resolveRoute`, the head tags and JSON-LD do not change. Guide names must never appear in head output (section 3, safeguard 3).

### 8.4 `scripts/check-size.mjs`
- Add `font: 32 * KB` to `BUDGETS`.
- Read every `dist/fonts/*.woff2` and count its **raw** byte size (no gzip). Print it in the table with kind `font`, and add a "Fonts (raw woff2)" budget line.
- Add the font bytes to the "Initial transfer" total. That budget stays at 150 KB.
- If `dist/fonts/` is missing, print `✖ dist/fonts not found` and exit 1.

### 8.5 `scripts/lib/routes-check.mjs` and `scripts/check-routes.mjs`
- Add `checkFonts(distDir)`, exported from `routes-check.mjs` and called by `check-routes.mjs` after the route checks. It checks that:
  - the five files in 6.4 exist under `dist/fonts/`;
  - each `.woff2` SHA-256 equals the 6.4 value, using `node:crypto` `createHash('sha256')`;
  - `dist/index.html` contains `fonts/press-start-2p-latin-400.woff2` exactly twice (one preload and one `@font-face`), with no literal `%BASE_URL%` left anywhere in any `dist/**/*.html`.

  It reports one problem line per failure. `check-routes` exits 1 if there are any problems.

### 8.6 Docs (backend)
- **`docs/CONTENT-GUIDE.md`.** Add a section "Sprite guides and the fan-art switch" covering three things:
  - how to change which sprite leads which page (`pages[].guide`), with a copy-paste example;
  - that each sprite can lead only one page, and pages with no guide show an egg;
  - how to turn all fan art off (`"fanArt": false`) and what that does (section 3, safeguard 5).
- **`README.md`.** Add a line under scripts saying `check:size` now includes a font budget. Add a "Fonts and licenses" note:
  - `public/fonts/` holds Press Start 2P and Pixelify Sans under OFL 1.1;
  - the license texts sit next to the fonts;
  - the files must not be modified.

---

## 9. Copy strings (verbatim)

| Where | String |
| :- | :- |
| Home dialog `<h2>` | `Where to next?` |
| Guide link hidden joiner | `, with ` (inside `.visually-hidden`, with a leading comma and a trailing space) |
| Guide captions | `Charmander`, `Bulbasaur`, `Squirtle` |
| Guide link accessible names (default data) | `Experience, with Charmander`, `Projects, with Bulbasaur`, `About, with Squirtle` |
| Guide link accessible names (`fanArt: false`) | `Experience`, `Projects`, `About` |
| Not found dialog | `A wild 404 appeared! There is no page at this address.` |
| About availability label | `Availability` |
| Footer font credit (always) | `Fonts: Press Start 2P and Pixelify Sans (SIL Open Font License).` |
| Footer disclaimer (only when `fanArt` is true) | `Pokémon, Charmander, Bulbasaur and Squirtle are trademarks of Nintendo, Creatures Inc. and GAME FREAK inc. The pixel sprites here are original fan art made for this non-commercial site, which is not affiliated with or endorsed by them.` |

Everything else is unchanged from v2, including page labels, titles, "Resume (PDF)" and "Page not found".

---

## 10. File ownership (one owner per path)

| Path | Owner | v3 change |
| :- | :- | :- |
| `src/data/**` | backend | `site.json`: `fanArt`, `pages[].guide` |
| `src/lib/content/**` | backend | validate, normalize, types and index (`GUIDE_IDS`), tests |
| `scripts/**` | backend | `check-size.mjs`, `lib/routes-check.mjs`, `check-routes.mjs`, tests |
| `vite.config.js`, `package.json`, `package-lock.json` | backend | none expected. **No new dependencies** of any kind |
| `.github/**`, `.oxlintrc.json`, `.gitignore`, `.nvmrc` | backend | none |
| `README.md`, `docs/CONTENT-GUIDE.md` | backend | 8.6 |
| `public/content/**` | backend | none (resume PDF stays as is) |
| `index.html` | frontend | 6.4 |
| `src/main.jsx`, `src/App.jsx` | frontend | 7 |
| `src/components/**` (including the new `PixelSprite`, `MenuCursor`, `DialogBox`, `GuideLink`, and the sprite test) | frontend | 5, 7 |
| `src/pages/**` | frontend | 4, 7 |
| `src/router/**` | frontend | none |
| `src/styles/**` | frontend | 6 |
| `src/hooks/**` | frontend | none |
| `public/**` except `public/content/**` | frontend | new `public/fonts/` (5 files). Favicon and OG image unchanged |
| `docs/spec/**`, including `docs/spec/v3-assets/**` | planner | staged fonts and sprite reference PNGs (read-only for everyone else) |
| `docs/handoff/backend-status-v3.md` | backend | new |
| `docs/handoff/frontend-status-v3.md` | frontend | new |
| `docs/qa/**` (`docs/qa/REPORT-v3.md`) | qa | new |

Sprite **art lives in code**, in `src/components/PixelSprite/sprites.js` (frontend). Font **binaries** live in `public/fonts/` (frontend). Neither goes in `src/assets/`.

Rules:
- Never edit a path you do not own.
- If you need a change in another owner's file, message that owner directly and list the request in your hand-off.
- The frontend imports content only from `src/lib/content/index.js`.

---

## 11. Ordered tasks

### 11.1 Backend (do B3-1 first and message `frontend` when it lands)

**B3-1. Data and API.**
- Make the 8.1 data edits.
- Make the 8.2 validator rules.
- Make the 8.3 normalization, `types.js` and `index.js` changes, including `GUIDE_IDS`.

Done when:
- `npm run validate` exits 0, with only the 2 known placeholder warnings.
- `getSite().fanArt === true`.
- `getPages().map(p => p.guide)` deep-equals `['charmander', 'bulbasaur', 'squirtle']`.
- `GUIDE_IDS` is exported from `index.js`.

**B3-2. Tests (vitest).** Add these cases:
- `src/lib/content/__tests__/validate.test.js`:
  - (a) `fanArt: "yes"` gives an error with the 8.2 message;
  - (b) `guide: "charmandr"` gives an error with the hint `did you mean "charmander"`;
  - (c) a duplicate guide gives an error naming both indices;
  - (d) `guide: null` is valid;
  - (e) omitting `fanArt` is valid;
  - (f) a page id of `"fonts"` is rejected as a public-folder clash. If v2 does not already reject it, implement that rule.
- `normalize.test.js`:
  - `fanArt` defaults to `true`;
  - `guide` defaults to `null`.
- `api.test.js`: the guides and `fanArt` for the current data (the B3-1 done criteria).

Done when `npm test` passes.

**B3-3. Scripts.**
- 8.4: `check-size`.
- 8.5: `checkFonts`, plus a test in `scripts/__tests__/routes-check.test.js` (create it if it does not exist) using a temp dir. Cover three cases: all fonts present and correct (no problems), one file missing (one problem), and wrong bytes (a hash problem).

Done when `npm test` passes. After the frontend has added `public/fonts/`, `npm run ci` must also exit 0, and `check:size` must print a `font` line of 28,108 bytes (27.45 KB) within the 32 KB budget.

**B3-4. Docs** (8.6). Done when the CONTENT-GUIDE examples work when followed literally: changing a guide, then setting `fanArt: false`.

**B3-5. Hand-off.** Write `docs/handoff/backend-status-v3.md` with:
- the command results;
- a task map (B3-x to files to REQ);
- deviations;
- requests for other owners.

### 11.2 Frontend (in this order)

**F3-1. Fonts.**
- Copy the 5 files (6.4) into `public/fonts/`.
- Make the `index.html` edits (6.4).

Done when:
- `shasum -a 256 public/fonts/*` matches the 6.4 table;
- in `npm run dev`, DevTools Network shows the 3 woff2 files loading from the dev origin with status 200;
- `document.fonts.check('16px "Press Start 2P"')` returns true after `document.fonts.ready`.

**F3-2. Tokens, themes and base.**
- Make the 6.2, 6.3 and 6.5 changes.

Done when:
- `grep -rn -- "--gray-\|--explore-index-col" src` returns nothing;
- `grep -rEn -- "--pk-" src --include=*.css --include=*.jsx --include=*.js` matches only `src/styles/tokens.css` and `src/styles/themes/*.css`;
- the site renders in both themes with the new colors.

**F3-3. Sprite system.**
- Create the 5.1 files exactly as in 5.2 to 5.5.
- Create `src/components/PixelSprite/__tests__/sprites.test.js`, a vitest test in the node environment that imports only `sprites.js` and `GUIDE_IDS` from `src/lib/content/index.js`. It asserts:
  - every grid's rows all have the same length, and the sizes match the 5.2 table;
  - every non-`.` key exists in that sprite's palette;
  - the filled-cell counts and per-key counts equal the 5.2 table;
  - parsing every `d` from `toPaths()` gives a total covered area, the sum of the `h` widths, equal to the filled-cell count;
  - every palette value is `currentColor` or matches `/^var\(--sprite-[a-z-]+\)$/`;
  - `Object.keys(GUIDE_NAMES)` and `Object.keys(GUIDE_TYPES)` both deep-equal `GUIDE_IDS`;
  - `SPRITES.charmander` has `width === 16` and `height === 16`.

Done when `npm test` passes, including this file.

**F3-4. Home.**
- Make the 4.2 and 4.3 changes.
- Delete `Hero` and `Explore` (section 7).
- Move the photo and availability to About (section 7).

Done when:
- Home matches 4.1 in dev at 390 and 1366 widths;
- clicking each guide link navigates to its page;
- `npm run build` passes.

**F3-5. Theme carry-through.** Make every row of the section 7 table.

Done when:
- every route renders with the new fonts and motifs in both themes;
- the v1 QA-203 greps pass over `src/components src/pages src/router src/styles/base.css`. That means no hex, `rgb(` or `hsl(` literals, and no literal `font-size` numbers. **Exception:** `src/components/PixelSprite/sprites.js` holds only `var(--sprite-*)` and `currentColor`, so it passes too.

**F3-6. Self-check.** Run these and record the results in the hand-off:
- `npm run lint` and `npm test`;
- `npm run build`, `npm run check:size` and `npm run check:routes`, once backend's B3-3 has landed;
- axe on all 5 routes (light and dark, at 390 and 1366), with axe-core installed outside the repo as in v2;
- the 13.2 fold checks.

**F3-7. Hand-off.** Write `docs/handoff/frontend-status-v3.md` with:
- the command results;
- a task map (F3-x to files to REQ);
- deviations;
- requests for other owners.

---

## 12. Requirements

### 12.1 v3 requirements
| ID | Requirement |
| :- | :- |
| REQ-1000 | Home renders exactly the 4.1 content in that order. There is no Explore list, summary, availability line or photo on Home. |
| REQ-1001 | Home has one `<h1 id="hero-name">` (the name) in `--font-display` and one role line (`profile.headline`). |
| REQ-1002 | The Home dialog is a `<nav aria-labelledby="party-heading">` with the `<h2>` "Where to next?" and one guide link per `getPages()` entry, in order. |
| REQ-1003 | Each guide link is a single `<a href={page.href}>` with no nested interactive elements. Its accessible name is exactly as in section 9. The sprite SVG is `aria-hidden="true"`. |
| REQ-1004 | Guide mapping comes from data: charmander to experience, bulbasaur to projects, squirtle to about. With `fanArt: false` or no guide, the slot shows the Egg sprite with no caption. |
| REQ-1005 | Clicking or pressing Enter on a guide link navigates client-side to its page, and focus lands on `#page-heading` (v2 REQ-901). |
| REQ-1010 | The sprites are the exact 5.2 grids, rendered as inline SVG with `shape-rendering="crispEdges"`, only at integer scales: 64 px below 768, 96 px at 768 and up on Home; 32 px in subpage titles; 64 px on the 404 page. |
| REQ-1011 | Animation follows the 5.5 table exactly. All automatic motion stops by 5 s after load (WCAG 2.2.2). Hover and focus animation runs only while hovered or focused. Under `prefers-reduced-motion: reduce`, there are zero running animations and no transforms. |
| REQ-1012 | Above the fold at 390x844 and 1366x768, in both themes: h1, role, the "Where to next?" heading, all three sprites with labels, and the Resume button. |
| REQ-1013 | Party layout: a vertical list below 480 px; equal columns at 480 px and up. There is no horizontal scroll at 320 to 2560 px. |
| REQ-1020 | Fonts are self-hosted from `public/fonts/` with the exact files and hashes in 6.4, preloaded with `font-display: optional`. There are no requests to any other origin. |
| REQ-1021 | `--font-display` (Press Start 2P) is used only for: the Home h1, the subpage h1, section h2s, the Home dialog prompt and the header name. It is only ever shown at 16, 24, 32 or 48 px with the default 16 px root. All other text uses `--font-body`. |
| REQ-1022 | OFL license texts ship next to the fonts. Font files are unmodified. |
| REQ-1030 | The palette and semantic tokens are exactly as in 6.1 to 6.3. Both themes define every semantic token, including the 9 new ones. The contrast pairs in 6.1 meet AA. |
| REQ-1031 | Components use semantic tokens only. `--pk-*` appears only in `tokens.css` and the theme files. The sprite **color** tokens (`--sprite-outline`, `--sprite-eye-white`, `--sprite-char-*`, `--sprite-bulb-*`, `--sprite-squirt-*`, `--sprite-egg-*`) appear only in `tokens.css` and `sprites.js`. The sprite **scale and motion** tokens (`--sprite-px`, `--sprite-px-title`, `--sprite-bob-*`, `--sprite-hop-duration`, `--sprite-stagger`) may be used in component CSS. There are no literal colors in components, pages or `base.css`. |
| REQ-1032 | Changing a semantic token in `themes/light.css` recolors every use site-wide. Changing a sprite color token (for example `--sprite-char-body`) recolors that sprite. No component edits are needed (QA-1080). |
| REQ-1040 | Motifs per section 7: dialog boxes (Home party, project cards, 404 notice), the `▶` cursor (guide hover and focus, current nav link, section h2), pixel buttons, type badges, type-colored subpage title rule, and title sprites. |
| REQ-1041 | Footer: the font credit always, and the disclaimer only when `fanArt` is true. Copy is exactly as in section 9. |
| REQ-1050 | `site.fanArt` (boolean, default true) and `pages[].guide` (enum or null, unique) are validated with the 8.2 messages and normalized per 8.3. `GUIDE_IDS` is exported from `index.js`. |
| REQ-1051 | `fanArt: false` removes every Pokémon character sprite and name from the rendered site in one edit: Home shows eggs, there are no title sprites and no disclaimer. |
| REQ-1052 | Guide names never appear in `<title>`, meta tags, JSON-LD or the sitemap. |
| REQ-1060 | Budgets: JS at most 90 KB gzip, CSS at most 15 KB gzip, fonts at most 32 KB raw, initial transfer (HTML + JS + CSS + fonts) at most 150 KB. Enforced by `check:size`. |
| REQ-1061 | `check:routes` verifies the fonts per 8.5. |
| REQ-1070 | Print: sprites and icons are hidden, dialog shadows are removed, and the light tokens are used (v1 REQ-213 otherwise unchanged). |

### 12.2 Superseded or retired requirements
| Earlier | Status in v3 |
| :- | :- |
| v2 REQ-820 to REQ-829 (Home hero and Explore) | **Replaced** by REQ-1000 to REQ-1013. The Explore list, teasers and blurbs are no longer rendered, but the data fields are still validated. |
| v1 REQ-010, REQ-011, REQ-012 (hero) | **Replaced.** Home is defined by REQ-1000 to REQ-1003. The photo moves to About (section 7). The availability line moves to About. |
| v1 4.1 "black and white", 4.3 primitives, 4.5 token values, 4.7 typography | **Replaced** by section 6. The token **architecture** (v1 4.2, 4.6, REQ-200 to REQ-206) is unchanged. |
| v1 4.8 "no transforms, no animation" | **Amended**: transforms are allowed for sprite animation (REQ-1011) and the button press (6.5). Everything else still has no motion. |
| v1 REQ-403 "no web fonts" | **Amended**: first-party self-hosted fonts are allowed (REQ-1020). There are still zero third-party requests. |
| v1 REQ-402 budgets | **Extended** by REQ-1060. |
| v1 REQ-305 focus ring | Unchanged rule. The values are now 3 px wide with a 2 px offset. |
| All v2 routing, head, focus, header, footer and subpage requirements (REQ-800 to REQ-806, REQ-840 to REQ-849, REQ-860 to REQ-877, REQ-880 to REQ-885, REQ-900 to REQ-906, REQ-920 to REQ-962) | **Still in force.** |

---

## 13. Holistic QA checklist

### 13.1 Setup
- Run from the working tree after both builders report done:
  - `npm ci`;
  - `npm run ci`;
  - `npm run preview` (port 4173);
  - `npm run dev` for the dev-only items.
- Use headless Chrome over CDP. Install axe-core and Lighthouse **outside the repo** (in the QA scratch dir).
- Write the report to `docs/qa/REPORT-v3.md`:
  - one line per checkbox below: ID, PASS or FAIL, and evidence (command output, a screenshot path, or a measured number);
  - then a defect table (D-xx, severity, owner, requirement).
- Revert every test edit, and prove the reverts with a baseline diff, as in v1.
- **Fonts before screenshots.** Load the page, `await document.fonts.ready`, then reload once (fonts are now cached) before taking screenshots or measuring layout.
- **Viewports:** 320x568, 390x844, 768x1024, 1366x768, 1440x900, 2560x1440.
- **"Both themes"** means `localStorage.theme = 'light'` and then `'dark'`, with a reload after each.

### 13.2 Functional goals
**Build and tooling**
- [ ] QA-1000: `npm run lint` exits 0 with 0 warnings. `npm test` passes, and the output includes `sprites.test.js` and the new validate, normalize and api cases.
- [ ] QA-1001: `npm run ci` exits 0.
- [ ] QA-1002: `npm run check:size` shows JS at most 90 KB gzip, CSS at most 15 KB gzip, a `font` total of 28,108 bytes (no more than 32 KB), and initial transfer at most 150 KB. Record all four numbers.
- [ ] QA-1003: `npm run check:routes` exits 0. Then corrupt one byte of `dist/fonts/pixelify-sans-latin-700.woff2` and run it again: it exits 1 with a hash problem line. Rebuild afterwards.
- [ ] QA-1004: `package.json` `dependencies` is exactly `react` and `react-dom`. `git diff 66f76bb -- package.json` shows no new dependencies or devDependencies beyond v2's.
- [ ] QA-1005: `shasum -a 256 public/fonts/*.woff2 dist/fonts/*.woff2` matches the 6.4 table. `public/fonts/OFL-press-start-2p.txt` and `public/fonts/OFL-pixelify-sans.txt` exist and are byte-identical to `docs/spec/v3-assets/fonts/`.

**Home and navigation**
- [ ] QA-1010: On `/`, these structural checks all hold:
  - exactly one `h1#hero-name` whose text is the profile name;
  - the next element sibling is a `p` with the headline text;
  - `nav[aria-labelledby="party-heading"]` contains an `h2#party-heading` with the text `Where to next?`;
  - the nav contains exactly 3 `a` elements;
  - Home contains no element with text from `profile.summary` and no `[class*="explore"]`.
- [ ] QA-1011: The accessible names of the three guide links (from the CDP Accessibility tree) are exactly `Experience, with Charmander`, `Projects, with Bulbasaur` and `About, with Squirtle`. Each link contains exactly one `svg[aria-hidden="true"][data-sprite]`, with `data-sprite` values `charmander`, `bulbasaur` and `squirtle`.
- [ ] QA-1012: Click each guide link. The URL becomes `/experience/`, `/projects/` or `/about/`, with no full reload (a `window.__probe` value survives). `document.activeElement.id === 'page-heading'`, and `document.title` equals the v2 page title.
- [ ] QA-1013: Keyboard only on `/`:
  - Tab order is skip link, header name, 3 header nav links, theme toggle, then the 3 guide links, Resume, GitHub, LinkedIn and Email, then the footer.
  - On each guide link, the focus outline is 3 px solid with color equal to the computed `--color-focus-ring`, and the `▶` cursor inside it has `visibility: visible`.
  - Enter navigates per QA-1012.
- [ ] QA-1014: Deep links. Fresh loads of `/experience/`, `/projects/`, `/about/` and `/about/#contact` render the right page with the right `<title>`. `curl -s localhost:4173/projects/ | grep -c '<title>Projects | Andrew Leick</title>'` prints `1`.
- [ ] QA-1015: The 404 page. `/nope/` renders the h1 `Page not found`, a `.pixel-dialog` containing `svg[data-sprite="egg"]`, the text `A wild 404 appeared! There is no page at this address.`, and links to Home and the 3 pages. `dist/404.html` contains `<meta name="robots" content="noindex"`.
- [ ] QA-1016: Back and forward through Home → Projects → About → Back → Back. Content and title follow, and focus lands on the page heading each time. On Home, the theme state is preserved after navigating.
- [ ] QA-1017: Noscript. With JavaScript disabled, `/` shows the noscript block (name, sentence, resume and links). Its computed `font-family` starts with `"Pixelify Sans"` once fonts are cached.
- [ ] QA-1018: No console errors or warnings on any of the 5 routes, in dev or preview, in both themes.

**Data-driven sprites and the kill switch**
- [ ] QA-1020: Swap `guide` values in `site.json` (experience becomes `squirtle`, about becomes `charmander`). On Home, Experience shows Squirtle and About shows Charmander, and the subpage title sprites and accent colors follow (fire on About, water on Experience). `git diff --stat` shows only `site.json`. Revert.
- [ ] QA-1021: Set `"fanArt": false`. Then all of the following hold:
  - Home shows 3 `svg[data-sprite="egg"]`, and its accessible names are `Experience`, `Projects` and `About`;
  - there is no `svg[data-sprite]` with value charmander, bulbasaur or squirtle anywhere on any of the 5 routes;
  - `document.body.innerText` contains none of `Charmander`, `Bulbasaur`, `Squirtle` or `Pokémon` on any route;
  - the footer has no disclaimer, but still shows the font credit;
  - subpage titles have no sprite, and their bottom-border color equals the computed `--color-type-normal`.

  Revert.
- [ ] QA-1022: Validator. One case at a time, then revert each:
  - (a) `"fanArt": "yes"`;
  - (b) `"guide": "charmandr"`;
  - (c) the same guide on two pages.

  Each makes `npm run validate` exit 1 with the 8.2 message, and the dev overlay shows it.
- [ ] QA-1023: `grep -riE "charmander|bulbasaur|squirtle" dist/index.html dist/*/index.html dist/404.html dist/sitemap.xml` prints nothing. Guide names only appear in the JS bundle.

**Motion and reduced motion**
- [ ] QA-1030: On `/` at 1366x768, with no pointer over the page:
  - at t = 2 s, `document.getAnimations().length >= 1`;
  - at t = 5.0 s after `load`, `document.getAnimations().filter(a => a.playState === 'running').length === 0`.
- [ ] QA-1031: Hover Bulbasaur. Within 100 ms its `svg` has a running animation named `sprite-hop` (check with `getAnimations()[i].animationName`), and the computed `transform` alternates between `none`/`translateY(0)` and `matrix(1, 0, 0, 1, 0, -12)`, which is 2 × 6 px at 1366 wide. Move the pointer away: no running animation within 100 ms.
- [ ] QA-1032: Emulate `prefers-reduced-motion: reduce`, then reload `/`. `document.getAnimations().length === 0` at t = 0.5 s and at t = 3 s. While a guide link is hovered and while one is focused, it is still 0 and the sprite's `transform` is `none`. The `▶` still becomes visible and the label is underlined.
- [ ] QA-1033: Under reduced motion, a route change and a hash link both jump with no smooth scroll (v2 QA-867).

**Responsive and layout**
- [ ] QA-1040: At every viewport in 13.1 and both themes, on all 5 routes: `document.documentElement.scrollWidth <= window.innerWidth`.
- [ ] QA-1041: Fold. At 390x844 and 1366x768, in both themes, the bounding-rect `bottom` of each of the following is at most `window.innerHeight` at scroll 0:
  - `#hero-name`;
  - the role `p`;
  - `#party-heading`;
  - all 3 guide link elements;
  - the Resume link.
- [ ] QA-1042: Party layout. At 390 wide, the 3 guide links have different `top` values (stacked) and each sprite is 64x64 CSS px. At 768 and 1366 wide, all 3 have the same `top` (one row) and each sprite is 96x96. At 480 wide they share the same `top` and the sprites are 64x64.
- [ ] QA-1043: At 320x568 with the root font size set to 24 px (DevTools `html { font-size: 24px }` override), and at 200% zoom on 1366: no horizontal scroll, and all guide link labels are fully visible (not clipped: `scrollWidth <= clientWidth` on each `.labelText`'s parent).
- [ ] QA-1044: Targets. Every guide link, header nav link, button and icon link is at least 44x44 CSS px (bounding rect).

**Fonts**
- [ ] QA-1050: After `document.fonts.ready` plus one reload:
  - `document.fonts.check('16px "Press Start 2P"')`, `document.fonts.check('16px "Pixelify Sans"')` and `document.fonts.check('bold 16px "Pixelify Sans"')` all return `true`;
  - Network shows exactly 3 `.woff2` requests, all from the preview origin, with status 200 or 304.
- [ ] QA-1051: Computed `font-family` begins with `"Press Start 2P"` for `#hero-name`, `#page-heading`, `#party-heading`, every About section `h2` and the header name link. It begins with `"Pixelify Sans"` for `body`, guide labels, nav links, experience entry titles and tags.
- [ ] QA-1052: Computed `font-size` of every element from QA-1051 that uses `"Press Start 2P"` is one of `16px`, `24px`, `32px` or `48px` at every viewport in 13.1.
- [ ] QA-1053: Build with `BASE_PATH=/personal-website/` and `siteUrl` set to match (temporary edit; revert afterwards). In `dist/index.html`, both preload `href`s and `@font-face` `url()`s start with `/personal-website/fonts/`. Then `npx vite preview --base /personal-website/` and load `/personal-website/`: the fonts load with status 200.

**Theme and tokens**
- [ ] QA-1060: For both themes, compare the computed values of each semantic token on `document.documentElement` against section 6.1 (case-insensitive hex). All 24 tokens must match.
- [ ] QA-1061: Contrast. Measure with computed colors in both themes and assert each minimum:

  | Pair | Minimum |
  | :- | :- |
  | `body` text on `--color-bg` | 4.5 |
  | the role `p` | 4.5 |
  | guide label on `--color-dialog-bg` | 4.5 |
  | guide caption on `--color-dialog-bg` | 4.5 |
  | guide label on `--color-bg-subtle` (hovered) | 4.5 |
  | Resume button text on its background, normal and hovered | 4.5 |
  | tag text on tag background | 4.5 |
  | footer `.fine` text on `--color-bg` | 4.5 |
  | focus ring against its adjacent background | 3.0 |
  | `▶` cursor on `--color-dialog-bg` | 3.0 |

  Record each ratio.
- [ ] QA-1062: axe-core (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice) on `/`, `/experience/`, `/projects/`, `/about/` and `/nope/`, in light and dark, at 390 and 1366 wide, plus once on `/` while a guide link is focused: **0 violations**.
- [ ] QA-1063: Lighthouse mobile and desktop on `npm run preview` (incognito) for `/`, `/experience/`, `/projects/` and `/about/`: Performance at least 95, Accessibility 100, Best Practices at least 95, SEO 100, LCP at most 2.0 s, CLS at most 0.05, TBT at most 100 ms. Save the JSON in the QA scratch dir.
- [ ] QA-1064: Token discipline:
  - `grep -rEn '#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(' src/components src/pages src/router src/styles/base.css` prints nothing;
  - `grep -rEn 'font-size:\s*[0-9]' src/components src/pages src/styles/base.css` prints nothing;
  - `grep -rn -- '--pk-' src/components src/pages src/router src/styles/base.css` prints nothing;
  - `grep -rlnE -- '--sprite-(outline|eye|char|bulb|squirt|egg)' src` lists only `src/styles/tokens.css` and `src/components/PixelSprite/sprites.js`.
- [ ] QA-1065: Theme toggle. It switches light and dark, the label reads `Switch to dark theme` or `Switch to light theme`, and the choice persists across a reload. With dark saved and the CPU throttled 6x, `data-theme="dark"` is present at first paint (v1 QA-202 method). `meta[name="theme-color"]` equals the computed `--color-bg` after a toggle.

**Recolor via tokens (the swappable-theme promise)**
- [ ] QA-1080: These are test edits; revert each one.
  - (a) In `themes/light.css` set `--color-accent: #0b1f3a;` and `--color-dialog-border: #0b1f3a;`. With no other edits, the Resume button background and every `.pixel-dialog` border on Home, Projects and 404 compute to `rgb(11, 31, 58)`.
  - (b) In `tokens.css` set `--sprite-char-body: #3060f0;`. Charmander's body path computes `fill: rgb(48, 96, 240)`.
  - (c) Add `themes/test.css` with `:root[data-theme="test"]` defining all 24 semantic tokens (copy `light.css`, change `--color-bg` to `#e0f0ff`), import it in `src/styles/index.css`, add `'test'` to `THEMES`, set `site.defaultTheme: "test"` and clear localStorage. The body background computes to `rgb(224, 240, 255)`.

**Print and other**
- [ ] QA-1090: Print emulation on `/` and `/about/`: no `svg` is visible, `.pixel-dialog` has `box-shadow: none`, the light background is used, and URLs are printed after external links.
- [ ] QA-1091: `/about/` shows `Availability` followed by the `profile.availability` text (currently a `TODO:` string, which is expected). The photo is absent because `profile.photo` is null.
- [ ] QA-1092: The footer on every route shows the font credit string exactly. With `fanArt: true`, it shows the disclaimer exactly as in section 9.

**v2 requirements still in force.** v2 QA never ran, so run these v2 tests unchanged and record them in the same report:
- QA-800 to QA-804;
- QA-810 to QA-819;
- QA-823 to QA-826 (QA-820 to QA-822 are replaced by QA-1010 to QA-1042);
- QA-830 to QA-834;
- QA-840 to QA-846;
- QA-860, QA-861 and QA-864 to QA-870 (QA-862 and QA-863 are replaced by QA-1062 and QA-1063);
- QA-880 to QA-883.

QA-871 (VoiceOver) and QA-890 (post-deploy) may be "Not run" or "Pending deploy", with a reason.

### 13.3 Visual goals (objective)
- [ ] QA-1100: **Sprite crispness.** At 1366x768, with DPR 1 and then DPR 2, both themes, after 5 s (idle done) with no hover, take a CDP screenshot clipped to each sprite's bounding rect. Every pixel's color must be one of that sprite's palette hex values from 6.2 (the sprite color tokens) or the `--color-dialog-bg` of the theme, with an exact RGB match and no other colors. The count of distinct colors must be no more than the palette size plus 1.
- [ ] QA-1101: **Sprite pixel grid.** At 1366 wide (96 px sprites), take a DPR 1 screenshot clipped to the sprite's bounding rect expanded by 1 px on every side.
  - Generate the expected 96x96 image from the 5.2 grid scaled 6x, using the 6.2 hex values, with transparent cells filled with `--color-dialog-bg`.
  - Search for the best placement offset (dx, dy), each in {0, 1, 2}.
  - At the best offset there must be **0 mismatched pixels**.

  This allows for sub-pixel placement of the box, but not for blur or wrong cells.
- [ ] QA-1102: **Sprite match with the reference.** In `docs/spec/v3-assets/sprites-reference-light-6x.png`, tiles are 96x96 starting at x = 0, 108, 216 and 324 (y = 0), in the order Charmander, Bulbasaur, Squirtle, Egg. Gray 12 px separators sit between them. After replacing the reference background `#FFFDF5` with `#FFFFFF`, each of the three Home sprite captures from QA-1101 (at the best offset) equals its tile: 0 mismatched pixels.
- [ ] QA-1103: **Dialog box.** On `/`, the dialog's computed `border-top-width` is `4px`, `border-top-color` equals `--color-dialog-border`, `border-radius` is `6px`, and `box-shadow` contains two inset shadows of 2 px and 4 px.
- [ ] QA-1104: **Subpage accents.** The bottom border of `#page-heading` is 4 px, with color `--color-type-fire` on `/experience/`, `--color-type-grass` on `/projects/` and `--color-type-water` on `/about/`. The title sprite is 32x32.

### 13.4 Visual review rubric (short; the only judgment-based items)
Take screenshots at 390x844 and 1366x768, in both themes, of `/`, `/experience/`, `/projects/`, `/about/` and `/nope/`. Answer yes or no to each question. Any "no" is a defect with severity Low, unless it says otherwise.
- [ ] R1: Is each sprite recognizable as the intended character next to the reference PNG (orange lizard with a flame tail; teal creature with a green bulb; blue turtle with a brown shell)?
- [ ] R2: Does Home read as minimal: name, role, one dialog and one button row, with nothing else competing?
- [ ] R3: Is it obvious, without reading instructions, that each sprite is a link to its labelled page? Hover and focus should show ▶ and an underline.
- [ ] R4: Is all body text (Pixelify Sans) comfortably readable at 390 wide, with no squinting at experience bullets? Severity **Medium** if no.
- [ ] R5: Do both themes look intentional? The dark theme should not have muddy sprites, invisible borders or clashing reds.
- [ ] R6: Is the theme consistent across all 5 pages: fonts, dialog boxes, ▶ cursors, buttons and badges?
- [ ] R7: Is there nothing that looks broken: overlapping text, clipped labels, a misaligned ▼, or a doubled focus ring?

---

## 14. Acceptance criteria, open items, sources

### 14.1 Done when
1. `npm run ci` exits 0 on the working tree, including `check:size` with the font budget and `check:routes` with the font checks.
2. Every 13.2 and 13.3 checkbox passes, plus the carried v2 tests. The exceptions are QA-871 and QA-890, which may be "Not run" or "Pending deploy".
3. Every R1 to R7 rubric item is "yes", or the defect it raised is fixed. No open defects of Medium severity or higher.
4. The hand-offs exist: `docs/handoff/backend-status-v3.md`, `docs/handoff/frontend-status-v3.md` and `docs/qa/REPORT-v3.md`.
5. No new dependencies. Nothing committed or pushed.
6. The open items below are still listed as open, and none was silently changed.

### 14.2 Still open (for Andrew; v3 does not resolve these)
- The resume PDF exposes the phone number and cities. It needs a redacted PDF or `resumeUrl: null`.
- `TODO:` placeholders: `profile.availability`, now shown on About, and the NFL results highlight. Deploy stays blocked by `validate:strict`.
- Confirm the public email. Custom domain. Hosting repo and Pages setup.
- **New:** the fan-art IP risk (section 3). The site includes original fan art of trademarked characters. Andrew should accept this knowingly. `fanArt: false` removes it in one edit.

### 14.3 Sources
- [P1] GamesRadar, "After almost 10 years, unofficial Pokémon website known for sharing fan-made games shuts down after reportedly receiving a DMCA takedown notice": https://www.gamesradar.com/after-almost-10-years-unofficial-pokemon-website-known-for-sharing-fan-made-games-shuts-down-after-reportedly-receiving-a-dmca-takedown-notice ; Game8 coverage: https://game8.co/articles/latest/pokemon-fan-made-games-site-relic-castle-taken-down-after-10-years-by-dmca-notice
- [P2] Wikipedia, "Nintendo and fan games" (Pokémon Uranium DMCA, 2016; EFF criticism): https://en.wikipedia.org/wiki/Nintendo_and_fan_games
- [F1] Fontsource, Press Start 2P (OFL-1.1; works best at multiples of 8 px): https://fontsource.org/fonts/press-start-2p/about ; npm: https://npmjs.com/package/@fontsource/press-start-2p
- [F2] Font Library, Press Start 2P: https://fontlibrary.org/en/font/press-start-2p ; license text: google/fonts `ofl/pressstart2p/OFL.txt`
- [F3] Fontsource, Pixelify Sans (OFL-1.1, Stefie Justprince): https://fontsource.org/fonts/pixelify-sans/about ; upstream: https://github.com/eifetx/Pixelify-Sans
- [F4] VT323 (OFL, Peter Hull): https://github.com/phoikoi/VT323
- WCAG 2.2 SC 2.2.2 Pause, Stop, Hide, and SC 2.5.8 Target Size: https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/ ; https://webaim.org/standards/wcag/wcag22
- Vite, HTML env replacement (`%ENV_NAME%`, includes `BASE_URL`): https://vite.dev/guide/env-and-mode
- Earlier sources: SPEC.md section 15 and SPEC-v2.md section 17.2.
