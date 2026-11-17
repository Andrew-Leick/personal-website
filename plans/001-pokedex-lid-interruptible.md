# 001 — Make the Pokédex lid reverse from where it is when Close interrupts Open

- **Status**: DONE (implemented by workers, approved by an independent reviewer on 2026-11-16)
- **Commit**: 3ff96a2 (the working tree had uncommitted changes when this was written on 2026-11-16; every excerpt below is from that working tree, so match against the excerpts, not the commit)
- **Severity**: MEDIUM
- **Category**: Interruptibility
- **Estimated scope**: 3 files (`Pokedex.jsx`, `Pokedex.module.css`, `__tests__/Pokedex.test.jsx`), ~60 lines changed

## Problem

The Pokédex lid is animated by two separate CSS **keyframe** animations on two separate
elements: one lid that swings open (700ms) and a different lid that swings shut (600ms).
Keyframes cannot retarget. While the opening lid is mid-swing it has `pointer-events: none`,
so the **Close** key under it can be clicked. When that happens the half-open lid is unmounted
and a *new* lid mounts at the far end of the swing (fully open, invisible) and swings back. The
lid visibly jumps instead of reversing from where it was.

```jsx
/* src/components/Pokedex/Pokedex.jsx:28-29 — current */
  const [lid, setLid] = useState(false) // the lid is swinging open
  const [closing, setClosing] = useState(false) // the lid is swinging shut over the screen
```

```jsx
/* src/components/Pokedex/Pokedex.jsx:51-61 — current */
  function finishClose() {
    setClosing(false)
    go('closed', null, 'pokedex-open')
  }

  function close() {
    setLid(false)
    // Under reduced motion there is no lid, so its animation would never end: close at once.
    if (prefersReducedMotion()) finishClose()
    else setClosing(true)
  }
```

```jsx
/* src/components/Pokedex/Pokedex.jsx:74-79 — current */
  // If the closing animation never reports its end (a background tab, say), close anyway.
  useEffect(() => {
    if (!closing) return undefined
    const timer = setTimeout(finishClose, CLOSE_FALLBACK_MS)
    return () => clearTimeout(timer)
  })
```

```jsx
/* src/components/Pokedex/Pokedex.jsx:169-193 — current (abridged to the lines that change) */
          {key('View experience and projects', () => {
            // No lid at all under reduced motion: its animation would never run to remove it.
            setLid(!prefersReducedMotion())
            go('start')
          }, { id: 'pokedex-open' })}
...
          {lid && <span className={styles.lid} aria-hidden="true" onAnimationEnd={() => setLid(false)} />}
          {closing && (
            <span className={styles.lid} aria-hidden="true" data-closing="" onAnimationEnd={() => closing && finishClose()} />
          )}
          <div className={styles.bar} inert={closing || undefined}>
...
            inert={closing || undefined}
```

```css
/* src/components/Pokedex/Pokedex.module.css:103-137 — current */
.lid {
  display: none;
}

@media (prefers-reduced-motion: no-preference) {
  .lid {
    position: absolute;
    inset: calc(-1 * var(--dex-bezel-width));
    z-index: 1;
    display: block;
    transform-origin: left center;
    pointer-events: none;
    animation: lid-open 700ms var(--ease-standard) both;
  }

  /* Closing: the same swing in reverse, and it blocks clicks while it covers the screen. */
  .lid[data-closing] {
    pointer-events: auto;
    animation: lid-close 600ms var(--ease-standard) both;
  }
}

/* Swings open on its left hinge, toward the reader, and fades as it passes the edge. */
@keyframes lid-open {
  from { transform: perspective(80rem) rotateY(0deg); }
  70% { opacity: 1; }
  to { transform: perspective(80rem) rotateY(-120deg); opacity: 0; }
}

/* Swings shut: back in from the edge, appearing as it comes round, and lands flat. */
@keyframes lid-close {
  from { transform: perspective(80rem) rotateY(-120deg); opacity: 0; }
  30% { opacity: 1; }
  to { transform: perspective(80rem) rotateY(0deg); opacity: 1; }
}
```

## Target

**One** lid element whose state is a data attribute, animated with CSS **transitions** so a
state change mid-swing retargets from the current angle. `@starting-style` supplies where
each swing begins when the lid first mounts. Durations, curve and look stay exactly as they
are today: open 700ms, close 600ms, `var(--ease-standard)` (= `cubic-bezier(0.2, 0, 0, 1)`).
Do not change them.

```css
/* target — replaces everything in the "current" CSS excerpt above */
.lid {
  display: none;
}

@media (prefers-reduced-motion: no-preference) {
  /* Resting (open) end of the swing: turned away on its left hinge and faded out. Opening
     transitions here: the turn takes 700ms, and the fade waits until 70% of it (490ms). */
  .lid {
    position: absolute;
    inset: calc(-1 * var(--dex-bezel-width));
    z-index: 1;
    display: block;
    transform-origin: left center;
    pointer-events: none;
    transform: perspective(80rem) rotateY(-120deg);
    opacity: 0;
    transition:
      transform 700ms var(--ease-standard),
      opacity 210ms var(--ease-standard) 490ms;
  }

  /* Opening starts flat over the screen. */
  @starting-style {
    .lid[data-state="open"] {
      transform: perspective(80rem) rotateY(0deg);
      opacity: 1;
    }
  }

  /* Closing: swings back flat over the screen (600ms), visible within the first 180ms, and
     blocks clicks while it covers the screen. A transition, so a Close pressed mid-opening
     turns the lid around from wherever it is. */
  .lid[data-state="closing"] {
    pointer-events: auto;
    transform: perspective(80rem) rotateY(0deg);
    opacity: 1;
    transition:
      transform 600ms var(--ease-standard),
      opacity 180ms var(--ease-standard);
  }

  /* Closing from fully open (no lid mounted yet) starts at the open end. */
  @starting-style {
    .lid[data-state="closing"] {
      transform: perspective(80rem) rotateY(-120deg);
      opacity: 0;
    }
  }
}
```

(The `@keyframes lid-open` and `@keyframes lid-close` blocks are deleted.)

```jsx
/* target state and handlers (Pokedex.jsx) */
  const [lid, setLid] = useState(null) // null | 'open' (swinging away) | 'closing' (swinging shut)

  function finishClose() {
    setLid(null)
    go('closed', null, 'pokedex-open')
  }

  function close() {
    // Under reduced motion there is no lid, so it would never report an end: close at once.
    if (prefersReducedMotion()) finishClose()
    else setLid('closing') // a lid still opening keeps its element and turns around
  }

  /** The lid's swing ended (its transform transition; ignore the opacity one and children). */
  function onLidEnd(event) {
    if (event.target !== event.currentTarget || event.propertyName !== 'transform') return
    if (lid === 'closing') finishClose()
    else setLid(null)
  }

  // If a swing never reports its end (a background tab, no @starting-style support), finish anyway.
  useEffect(() => {
    if (lid === null) return undefined
    const timer = setTimeout(lid === 'closing' ? finishClose : () => setLid(null), LID_FALLBACK_MS)
    return () => clearTimeout(timer)
  })
```

```jsx
/* target render (Pokedex.jsx) */
          {key('View experience and projects', () => {
            // No lid at all under reduced motion: it would never report an end.
            setLid(prefersReducedMotion() ? null : 'open')
            go('start')
          }, { id: 'pokedex-open' })}
...
          {lid && <span className={styles.lid} aria-hidden="true" data-state={lid} onTransitionEnd={onLidEnd} />}
          <div className={styles.bar} inert={lid === 'closing' || undefined}>
...
            inert={lid === 'closing' || undefined}
```

## Repo conventions to follow

- Motion tokens live in `src/styles/tokens.css` (`--ease-standard: cubic-bezier(0.2, 0, 0, 1)`). Reuse it; add no new curve.
- Motion that moves anything is defined **only** inside `@media (prefers-reduced-motion: no-preference)`. The lid is `display: none` outside it, and `prefersReducedMotion()` from `src/lib/motion.js` keeps it from mounting. Exemplar: the current `.lid` block quoted above.
- Interactive state is driven by transitions, not keyframes. Exemplar: `src/components/BallRail/BallRail.module.css` `.slot::after` / `.link[data-active] .slot::after` (an opacity/scale transition between two attribute states).
- Comments are plain English sentences explaining *why*, like the existing ones.

## Steps

1. **`src/components/Pokedex/Pokedex.jsx`, constant.** Replace
   ```js
   /** How long the closing lid may take before the cover shows anyway (its animation is 600ms). */
   const CLOSE_FALLBACK_MS = 900
   ```
   with
   ```js
   /** How long a lid swing may take before it finishes anyway (the swings are 700ms and 600ms). */
   const LID_FALLBACK_MS = 1000
   ```
2. **State.** Replace the two lines `const [lid, setLid] = useState(false) …` and `const [closing, setClosing] = useState(false) …` with the single line
   `const [lid, setLid] = useState(null) // null | 'open' (swinging away) | 'closing' (swinging shut)`.
3. **Handlers.** Replace the current `finishClose` and `close` functions with the target `finishClose`, `close` and `onLidEnd` functions from **Target**, in that order and in the same place (directly after `go`).
4. **Fallback effect.** Replace the effect commented `// If the closing animation never reports its end …` with the target effect commented `// If a swing never reports its end …`.
5. **Open key.** In the cover's `key('View experience and projects', …)` callback, replace `setLid(!prefersReducedMotion())` with `setLid(prefersReducedMotion() ? null : 'open')`, and update its comment to the target comment.
6. **Render.** Replace the two lid elements (`{lid && <span … onAnimationEnd={() => setLid(false)} />}` and the `{closing && (…data-closing…)}` block) with the single line
   `{lid && <span className={styles.lid} aria-hidden="true" data-state={lid} onTransitionEnd={onLidEnd} />}`.
   Replace both `inert={closing || undefined}` with `inert={lid === 'closing' || undefined}`.
7. **Check for leftovers.** `grep -n "closing\|CLOSE_FALLBACK\|onAnimationEnd" src/components/Pokedex/Pokedex.jsx` must only show `lid === 'closing'`, `'closing'` string literals and comments. There must be no `setClosing` and no `onAnimationEnd`.
8. **`src/components/Pokedex/Pokedex.module.css`.** Replace the whole block quoted in **Problem** (from `.lid {\n  display: none;\n}` through the end of `@keyframes lid-close { … }`) with the target CSS block. Keep the comment above `.cover, .lid` and the `.cover` rule untouched.
9. **`src/components/Pokedex/__tests__/Pokedex.test.jsx`.** Update only what the new mechanism makes obsolete:
   - In the test `'Menu goes back to the start screen; Close swings the lid shut, then shows the cover'`, replace
     ```js
     const closingLid = $('[data-closing]')
     ```
     with `const closingLid = $('[data-state="closing"]')`, and replace
     ```js
     act(() => closingLid.dispatchEvent(new Event('animationend', { bubbles: true })))
     expect($('[data-closing]')).toBeNull()
     ```
     with
     ```js
     const end = new Event('transitionend', { bubbles: true })
     Object.defineProperty(end, 'propertyName', { value: 'transform' })
     act(() => closingLid.dispatchEvent(end))
     expect($('[data-state="closing"]')).toBeNull()
     ```
   - Add this test right after that one:
     ```js
     it('Close during the opening swing turns the same lid around instead of replacing it', () => {
       render(makeDex(1, 1))
       click($('#pokedex-open'))
       const lid = $('[data-state="open"]')
       expect(lid).not.toBeNull()
       click(button('Close'))
       expect($('[data-state="closing"]')).toBe(lid) // same element: the transition retargets
       expect($$('[class*="lid"]')).toHaveLength(1)
     })
     ```
   - The test `'closes even if the closing animation never reports its end'`: change `vi.advanceTimersByTime(1000)` to `vi.advanceTimersByTime(1100)` (the fallback is now 1000ms). Leave the rest unchanged.

## Boundaries

- Do NOT change durations (700ms / 600ms), the curve (`--ease-standard`), the transform values or the lid's look.
- Do NOT touch any file other than the three listed. Do NOT edit `tokens.css`.
- Do NOT change markup other than the lid element and the two `inert` props.
- Do NOT add dependencies.
- If any "current" excerpt does not match the code you find, STOP and report instead of improvising.

## Verification

- **Mechanical**: `npm run lint` (0 warnings), `npm test` (all pass, including the new test), `npm run build` (succeeds).
- **Feel check**: run `npm run build && npx vite preview`, open `/experience/`, scroll to the Pokédex.
  - Click **View experience and projects**, then within ~300ms click **Close** where it appears under the swinging lid. The lid must turn around **from its current angle** and swing back flat. It must never vanish and reappear from the far edge.
  - Let an Open finish, then Close: the lid swings in from the right edge (fully open and invisible at first), becomes visible within the first ~180ms and lands flat over the screen. Then the cover with **View experience and projects** appears, with focus on that key.
  - Open from the cover: identical to before. The lid swings away on its left hinge over 700ms and fades out only in the last 30%.
  - In DevTools, open the Animations panel, set playback to 10%, and repeat the interrupted Close: the transform curve reverses smoothly with no discontinuity.
  - Toggle `prefers-reduced-motion: reduce` (Rendering panel): Open and Close swap instantly with no lid element (`document.querySelector('[class*="lid"][data-state]')` stays `null`).
- **Done when**: interrupting Open with Close reverses the same lid element in place, all checks above pass, and `grep -n "@keyframes lid" src/components/Pokedex/Pokedex.module.css` returns nothing.
