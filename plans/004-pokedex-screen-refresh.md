# 004 — Pokédex screen refresh when the view changes

- **Status**: DONE (implemented by workers, approved by an independent reviewer on 2026-11-16)
- **Commit**: c645d72
- **Severity**: MEDIUM (missed opportunity, highest leverage)
- **Category**: Missed opportunities (prevent a jarring change)
- **Estimated scope**: 2 files (`Pokedex.jsx`, `Pokedex.module.css`), ~25 lines

## Problem

Inside the Pokédex, every step (start menu → Experience/Projects grid → an entry's showcase →
Previous/Next → back) replaces the screen's content instantly. The content teleports; nothing
tells the reader the screen changed except the content itself.

```jsx
/* src/components/Pokedex/Pokedex.jsx:186-195 — current */
          {/* The fixed-height screen's scrolling part: focusable so keyboard users can scroll it. */}
          <div
            className={styles.view}
            role="region"
            aria-labelledby={shown ? 'pokedex-entry-heading' : `pokedex-${screen}-heading`}
            tabIndex={0}
            inert={lid === 'closing' || undefined}
          >
            {body}
          </div>
```

```css
/* src/components/Pokedex/Pokedex.module.css — current .view rule (search for "^.view {") */
.view {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-content: start;
  gap: var(--space-4);
  min-block-size: 0;
  margin: calc(-1 * var(--space-2));
  padding: var(--space-2);
  overflow-y: auto;
  overscroll-behavior: contain;
  background: …(scroll shadows, unchanged)…;
}
```

## Target

Each step mounts a fresh "page" element inside `.view` (React `key` = screen + entry). That
element enters with a Game Boy–style **screen refresh**: opacity only, in 3 pixel steps, over
**150ms**. Nothing moves (the reader is about to read it), and it never blocks interaction.

```jsx
/* target — Pokedex.jsx, the .view children */
            {/* A new page per step, so each screen change gets the refresh (Pokedex.module.css .page). */}
            <div key={`${screen}:${entry ?? ''}`} className={styles.page}>
              {body}
            </div>
```

```css
/* target — Pokedex.module.css, new rule placed directly after the .view rule */

/*
 * One screen's content. A new page mounts on every step, and enters with a quick screen refresh:
 * opacity only, in 3 pixel steps over 150ms (nothing moves; the reader is about to read it).
 */
.page {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-content: start;
  gap: var(--space-4);
  min-width: 0;
  transition: opacity 150ms steps(3, end);
}

@starting-style {
  .page {
    opacity: 0;
  }
}
```

Reduced motion: the site's global rule in `src/styles/base.css` (`@media (prefers-reduced-motion: reduce) { *, … { transition-duration: 0ms !important; } }`) already makes this instant. No extra rule is needed, and that is the intended behavior. Do not add one.

## Repo conventions to follow

- Pixel motion uses `steps(n, end)`. Exemplar: `src/components/BallRail/BallRail.module.css` `.ball { transition: scale 160ms steps(3, end), opacity 160ms steps(3, end); }`.
- Entry without JS uses `@starting-style`. Exemplar: the `.lid` rules in this same file (`@starting-style { .lid[data-state="open"] { … } }`).

## Steps

1. In `src/components/Pokedex/Pokedex.jsx`, inside the `.view` div, replace `{body}` with the target wrapper (the comment plus `<div key={`${screen}:${entry ?? ''}`} className={styles.page}>{body}</div>`). Change nothing else in the JSX.
2. In `src/components/Pokedex/Pokedex.module.css`, insert the target `.page` rule, its comment and the `@starting-style` block directly after the closing `}` of the `.view` rule. Leave `.view` unchanged. Its `gap` now spaces only the single page child, which is harmless.
3. Run the existing tests. They query by ids, roles and text, so they should still pass unchanged. If one fails only because of the new wrapper, report it rather than rewriting the test.

## Boundaries

- Only these two files. Do NOT animate transform, scale or position. Opacity only.
- Do NOT add a reduced-motion rule (see Target).
- Do NOT stagger the grid tiles. That idea was rejected because every Back from an entry would replay it.
- If an excerpt does not match the code, STOP and report.

## Verification

- **Mechanical**: `npm run lint` (0 warnings), `npm test` (all pass), `npm run build`.
- **Feel check** (`npm run build && npx vite preview`, `/experience/`, open the Pokédex):
  - Each step (Experience, a tile, Next, Previous, back to Experience, Menu) briefly refreshes the screen in 3 visible steps over ~150ms. The keys bar above the view does **not** flash.
  - Holding Next/Previous through all entries never feels slow or laggy.
  - Focus still lands on the new heading (or on the tile when going back), and screen readers still announce the region by its heading.
  - With `prefers-reduced-motion: reduce` emulated, the swap is instant.
- **Done when**: a new `.page` element (different DOM node) mounts on every step and its computed opacity goes 0 → 1 within 150ms. Check with CDP by sampling `getComputedStyle(page).opacity` right after a click.
