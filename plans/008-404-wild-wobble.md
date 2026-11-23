# 008 — "A wild 404 appeared!": the egg wobbles once

- **Status**: DONE (implemented by workers, approved by an independent reviewer on 2026-11-16)
- **Commit**: c645d72
- **Severity**: LOW (missed opportunity, delight)
- **Category**: Missed opportunities (rare delight)
- **Estimated scope**: 1 file (`src/pages/Page.module.css`), ~15 lines

## Problem

The 404 page says "A wild 404 appeared!" next to a still egg sprite. A wild encounter is the moment
something shakes, and the page is rare enough to have room for that one beat.

```jsx
/* src/pages/NotFoundPage.jsx:13-15 — current (NOT edited by this plan) */
      <DialogBox className={styles.notice}>
        <PixelSprite name="egg" className={styles.noticeSprite} />
        <p className={styles.text}>A wild 404 appeared! There is no page at this address.</p>
```

```css
/* src/pages/Page.module.css:34-38 — current */
.noticeSprite {
  flex: none;
  width: calc(16 * var(--sprite-px-title) * 2);
  height: calc(16 * var(--sprite-px-title) * 2);
}
```

## Target

On load, after **200ms**, the egg wobbles **once** on its base: rotate 0 → −10° → 10° → 0 over
**600ms** in 6 pixel steps (the same values as the rail's hover wiggle,
`BallRail.module.css` `@keyframes ball-wiggle`), then rests. Skip it under reduced motion.

```css
/* target — appended to Page.module.css after the .noticeSprite rule */

/* 404: the egg wobbles once on its base, a wild encounter (the rail wiggle's values, 1 time). */
@media (prefers-reduced-motion: no-preference) {
  .noticeSprite {
    transform-origin: 50% 85%;
    animation: wild-wobble 600ms steps(6, end) 200ms 1;
  }
}

@keyframes wild-wobble {
  0%,
  100% { rotate: 0deg; }
  25% { rotate: -10deg; }
  75% { rotate: 10deg; }
}
```

## Repo conventions to follow

- Motion is defined only inside `@media (prefers-reduced-motion: no-preference)`. Pixel motion uses `steps(n, end)`.
- Keyframes live in the same CSS module as the rule using them (CSS Modules rename keyframes inside `animation`).
- Use the individual `rotate` property (as `JourneyPage.module.css`'s idle animations do), not `transform`.

## Steps

1. Append the target CSS (comment, `@media` block and `@keyframes wild-wobble`) to `src/pages/Page.module.css`, directly after the `.noticeSprite` rule.

## Boundaries

- Only this file. Do NOT change `NotFoundPage.jsx`, the sprite, the text or the existing `.noticeSprite` declarations.
- Finite: exactly 1 iteration.
- If an excerpt does not match the code, STOP and report.

## Verification

- **Mechanical**: `npm run lint` (0 warnings), `npm test`, `npm run build`.
- **Feel check**: open any missing URL (e.g. `/nope/` in `vite preview`, which serves the 404 page). The egg rocks left, then right, once, about 0.2s after the page appears, pivoting near its base, then stays still. With reduced motion it never moves.
- **Done when**: over CDP, the egg's `getAnimations()` shows one animation with `iterations: 1`, `duration: 600`, `delay: 200` (none under emulated reduced motion), and its computed `rotate` is `none`/`0deg` after 1s.
