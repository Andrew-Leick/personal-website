# 003 — Write the per-scroll-frame custom properties on the elements that use them

- **Status**: DONE (implemented by workers, approved by an independent reviewer on 2026-11-16)
- **Commit**: 3ff96a2 (the working tree had uncommitted changes when this was written on 2026-11-16; every excerpt below is from that working tree, so match against the excerpts, not the commit)
- **Severity**: LOW
- **Category**: Performance
- **Estimated scope**: 4 files (`useJourneyScroll.js`, `BallRail.jsx`, `BallRail.module.css`, `BallLink.jsx`), ~40 lines changed

## Problem

The scroll engine writes three custom properties on **parent** elements on scroll frames, and
CSS reads them in **children**:

- `--journey-p` (0–1, how far the hero balls have glided) is set on the rail `<nav>` and read by the rail's `::before` (dock background) and `.track` opacity through `--rail-fade`.
- `--journey-progress` (0–1, the track fill) is set on the rail `<nav>` and read by `.fill`'s `scaleX()` / `scaleY()`.
- `--leave` (0–1 per hero ball) is set on each hero `<a>` link and read by its `.ghost` and `.label` opacity.

Custom properties inherit. Changing one on a parent makes the browser recompute styles for the
parent's **entire subtree**, the whole rail (three list items, links, slots, movers, Poké Ball
images, dots, tips) and each whole hero link, on every scroll frame where a value changes.
The fix is the same visual result with each variable written on the leaf that uses it, so a
change restyles one element. Impact today is small (the rail is ~25 elements and writes are
de-duplicated to 3 decimals), so this is a LOW cleanup.

```js
/* src/hooks/useJourneyScroll.js:52-60 — current */
    // Rail custom properties are only written when they change (3 decimals is sub-pixel),
    // so a scroll frame with nothing new does not restyle the rail.
    const written = new Map()
    const writeVar = (name, value) => {
      const text = value.toFixed(3)
      if (written.get(name) === text) return
      written.set(name, text)
      rail.style.setProperty(name, text)
    }
```

```js
/* src/hooks/useJourneyScroll.js:83-98 — current (inside measure()) */
      const balls = ids.map((id) => {
        const heroSlot = query('data-ball-slot', id)
        const railSlot = query('data-rail-slot', id)
        const heroRect = heroSlot?.getBoundingClientRect()
        return {
          id,
          mover: query('data-rail-ball', id),
          railSlot,
          railRect: railSlot?.getBoundingClientRect() ?? null,
          heroLink: heroSlot?.closest('a') ?? null,
          heroDoc: heroRect ? { x: heroRect.left, y: heroRect.top + scrollY, width: heroRect.width } : null,
          link: rail.querySelector(`[data-rail-link="${id}"]`),
          section: document.getElementById(id),
          lastT: -1,
        }
      })
```

```js
/* src/hooks/useJourneyScroll.js:182 — current (inside update(), in the per-ball loop) */
        b.heroLink?.style.setProperty('--leave', String(t))
```

```js
/* src/hooks/useJourneyScroll.js:193 and :198 — current (inside update()) */
      writeVar('--journey-p', p)
...
      writeVar('--journey-progress', clamp(fill))
```

```jsx
/* src/components/BallRail/BallRail.jsx:19-22 — current */
    <nav ref={ref} aria-label="Sections" className={styles.rail} data-print="hide" inert>
      <div className={styles.track} aria-hidden="true">
        <span className={styles.fill} />
      </div>
```

```css
/* src/components/BallRail/BallRail.module.css:1-56 — current (abridged) */
/*
 * v4 rail. Mobile (< 768px): bottom dock. >= 768px: column on the right edge.
 * Balls use integer multiples of the 30px sprite (60px in both).
 *
 * Variables written by useJourneyScroll:
 *   --journey-p         0 to 1, how far the balls have glided from the hero (fades the rail in)
 *   --journey-progress  0 to 1, track fill: reaches ball i as section i becomes active
 *   --track-start       px from the rail's top (rail) or left (dock) to the first ball's center
 *   --track-length      px from the first ball's center to the last's
 */
.rail {
  --rail-ball: var(--dock-ball-size);
  --rail-fade: clamp(0, calc((var(--journey-p, 0) - 0.5) * 2), 1);
  position: fixed;
  …
}

/* Dock background: forms while the balls arrive (second half of the glide). */
.rail::before {
  position: absolute;
  inset: 0;
  border-block-start: var(--border-width-pixel) solid var(--color-border-strong);
  background-color: var(--color-bg);
  content: "";
  opacity: var(--rail-fade);
}
…
.track {
  …
  background-color: var(--color-border);
  opacity: var(--rail-fade);
}

.fill {
  …
  transform: scaleX(var(--journey-progress, 0));
  transform-origin: left center;
}
```

```css
/* src/components/BallRail/BallRail.module.css:~233-235 — current (inside @media (min-width: 768px)) */
  .rail::before {
    display: none;
  }
```

```jsx
/* src/components/BallLink/BallLink.jsx:44-47 — current */
      <span className={styles.label}>
        <MenuCursor className={styles.cursor} />
        <span className={styles.labelText}>{page.label}</span>
      </span>
```

(`src/components/BallLink/BallLink.module.css` reads `var(--leave, 0)` in `.ghost` and `.label`. It stays unchanged: the variable will now be set on those same elements instead of inherited from the link.)

## Target

Same pixels, same timing. Each variable is written on the element whose own style reads it:

| Variable | Written on (target) | Read by |
| --- | --- | --- |
| `--journey-p` | the new dock span `[data-rail-dock]` and the track `[data-rail-track]` | their own `opacity` |
| `--journey-progress` | the fill `[data-rail-fill]` | its own `transform` |
| `--leave` | the hero ghost (the hero slot's first child) and the hero label `[data-leave-label]` | their own `opacity` |

The rail's `::before` becomes a real element (`<span data-rail-dock>`), because JS cannot
write a property on a pseudo-element without writing it on its parent.

```jsx
/* target — BallRail.jsx */
    <nav ref={ref} aria-label="Sections" className={styles.rail} data-print="hide" inert>
      <span className={styles.dock} data-rail-dock="" aria-hidden="true" />
      <div className={styles.track} data-rail-track="" aria-hidden="true">
        <span className={styles.fill} data-rail-fill="" />
      </div>
```

```css
/* target — BallRail.module.css */
.rail {
  --rail-ball: var(--dock-ball-size);
  position: fixed;
  …unchanged…
}

/* Dock background: forms while the balls arrive (second half of the glide). */
.dock {
  position: absolute;
  inset: 0;
  border-block-start: var(--border-width-pixel) solid var(--color-border-strong);
  background-color: var(--color-bg);
  opacity: clamp(0, calc((var(--journey-p, 0) - 0.5) * 2), 1);
}
…
.track {
  …unchanged…
  opacity: clamp(0, calc((var(--journey-p, 0) - 0.5) * 2), 1);
}
/* .fill unchanged: it already reads var(--journey-progress, 0), now set on itself. */

@media (min-width: 768px) {
  …
  .dock {
    display: none;
  }
  …
}
```

```js
/* target — useJourneyScroll.js writeVar: per element */
    // Scroll-driven custom properties are written on the element that reads them (so a change
    // restyles that element only, not a whole subtree), and only when they change (3 decimals
    // is sub-pixel).
    const written = new WeakMap()
    const writeVar = (el, name, value) => {
      if (!el) return
      const text = value.toFixed(3)
      const seen = written.get(el) ?? new Map()
      if (seen.get(name) === text) return
      seen.set(name, text)
      written.set(el, seen)
      el.style.setProperty(name, text)
    }
    const dock = rail.querySelector('[data-rail-dock]')
    const track = rail.querySelector('[data-rail-track]')
    const fillEl = rail.querySelector('[data-rail-fill]')
```

## Repo conventions to follow

- The scroll engine (`src/hooks/useJourneyScroll.js`) does reads before writes in `update()` and caches elements in `measure()`. Keep both. New element lookups for rails go next to the existing `const rail = railRef.current` setup (once per effect). Per-ball lookups go in the object returned by `ids.map` in `measure()`.
- Components mark JS hooks with `data-*` attributes (e.g. `data-rail-ball`, `data-rail-slot`, `data-ball-slot`). Use the same style: `data-rail-dock`, `data-rail-track`, `data-rail-fill`, `data-leave-label`.
- CSS comments explain *why*. Update the header comment of `BallRail.module.css` so it says where each variable is written.

## Steps

1. **`src/components/BallRail/BallRail.jsx`**: replace the current `<nav …>` opening and track markup (excerpt above) with the target markup: add the dock span as the nav's first child, and add `data-rail-track=""` and `data-rail-fill=""`. Change nothing else.
2. **`src/components/BallRail/BallRail.module.css`**:
   a. In `.rail`, delete the line `--rail-fade: clamp(0, calc((var(--journey-p, 0) - 0.5) * 2), 1);`.
   b. Rename the selector `.rail::before` (the dock background rule) to `.dock`, delete its `content: "";` line, and replace `opacity: var(--rail-fade);` with `opacity: clamp(0, calc((var(--journey-p, 0) - 0.5) * 2), 1);`.
   c. In `.track`, replace `opacity: var(--rail-fade);` with `opacity: clamp(0, calc((var(--journey-p, 0) - 0.5) * 2), 1);`.
   d. Inside `@media (min-width: 768px)`, rename `.rail::before { display: none; }` to `.dock { display: none; }`.
   e. Update the header comment's variable list to say: `--journey-p` is written on `.dock` and `.track`; `--journey-progress` on `.fill`; `--track-start` / `--track-length` on the rail (measured once per layout, not per frame).
   f. Run `grep -n "rail-fade\|::before" src/components/BallRail/BallRail.module.css`. It must return nothing.
3. **`src/components/BallLink/BallLink.jsx`**: on the label span, add `data-leave-label=""`:
   `<span className={styles.label} data-leave-label="">`. Change nothing else.
4. **`src/hooks/useJourneyScroll.js`**:
   a. Replace the `written` / `writeVar` block (excerpt above) with the target per-element `writeVar` block, including the three `const dock / track / fillEl` lookups.
   b. In `measure()`, in the object returned for each ball, add two properties after `heroLink`:
      ```js
          heroGhost: heroSlot?.firstElementChild ?? null,
          heroLabel: heroSlot?.closest('a')?.querySelector('[data-leave-label]') ?? null,
      ```
   c. In `update()`, replace `b.heroLink?.style.setProperty('--leave', String(t))` with
      ```js
          writeVar(b.heroGhost, '--leave', t)
          writeVar(b.heroLabel, '--leave', t)
      ```
   d. Replace `writeVar('--journey-p', p)` with
      ```js
      writeVar(dock, '--journey-p', p)
      writeVar(track, '--journey-p', p)
      ```
   e. Replace `writeVar('--journey-progress', clamp(fill))` with `writeVar(fillEl, '--journey-progress', clamp(fill))`.
   f. Update the doc comment at the top of the hook (lines ~33-35: "fades the hero slot's ghost in and its label down … (--leave)", "writes --journey-p … and --journey-progress …") so it says these are written on the ghost/label, dock/track and fill elements.
   g. Run `grep -n "writeVar(\|--leave\|style.setProperty" src/hooks/useJourneyScroll.js`. Every `writeVar(` call must pass an element first. The only remaining `style.setProperty` calls must be inside `writeVar` and the two `--track-start` / `--track-length` writes in `measure()`.

## Boundaries

- Do NOT change any timing, easing, opacity formula or transform. The rendered result must be pixel-identical at every scroll position.
- Do NOT touch `--track-start` / `--track-length` (they are written once per measure, not per frame).
- Do NOT change `BallLink.module.css` or any file not listed.
- Do NOT change the compositor (`ScrollTimeline`) glide or the rAF transform path for the balls.
- Do NOT add dependencies.
- If an excerpt does not match the code you find, STOP and report.

## Verification

- **Mechanical**: `npm run lint` (0 warnings), `npm test` (all pass), `npm run build` (succeeds), `npm run check:size` (passes without raising limits).
- **Feel check** (`npm run build && npx vite preview`, open `/`):
  - Scroll slowly from the hero down: as the balls leave, each hero slot's faint ghost ball fades in (to 20%) and its label dims (to 70%). Hovering or focusing a hero link still brings its label back to full opacity.
  - At 390px wide (bottom dock): the dock background and track fade in during the second half of the glide, exactly as before. At ≥ 768px there is no dock background, only the vertical rail track.
  - Keep scrolling through Experience → Education → About: the red track fill grows to each ball as its section becomes active (horizontal on the dock, vertical on the rail).
  - Scroll back to the top: everything reverses (fill empties, dock and track fade out, ghosts fade out, labels return to full opacity).
  - Compare side by side with a build of the previous commit if possible: no visible difference at any scroll position.
- **Performance check**: in Chrome DevTools, open the Performance panel, record a 3-second scroll through the page, and inspect a few "Recalculate Style" events during scrolling. The number of elements affected per frame should drop from roughly the whole rail subtree (~20+) to a handful (the dock, track, fill and, near the hero, ghost and label elements).
- **Done when**: no custom property that changes per scroll frame is written on `.rail` or a hero `<a>`, the grep checks in steps 2f and 4g pass, and the feel check shows no visual change.
