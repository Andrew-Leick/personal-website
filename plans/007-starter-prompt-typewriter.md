# 007 — Type in the "Choose your starter" prompt like a Pokémon text box

- **Status**: DONE (implemented by workers, approved by an independent reviewer on 2026-11-16)
- **Commit**: c645d72
- **Severity**: LOW (missed opportunity, delight)
- **Category**: Missed opportunities (rare, first-load delight)
- **Estimated scope**: 2 files (`src/pages/HomePage.module.css`, `src/components/DialogBox/DialogBox.module.css`), ~20 lines

## Problem

The hero's dialog box reads "Choose your starter", the moment a Pokémon game types out letter by
letter. Here it is static, while the "▼ more" arrow bobs from the first frame.

```jsx
/* src/pages/JourneyPage.jsx:76-79 — current (NOT edited by this plan) */
            <DialogBox as="nav" aria-labelledby="party-heading" className={homeStyles.party} more>
              <h2 id="party-heading" className={homeStyles.prompt}>
                Choose your starter
              </h2>
```

```css
/* src/pages/HomePage.module.css:32-40 — current */
.prompt {
  margin-block-end: var(--space-3);
  padding-inline: var(--space-3);
  font-family: var(--font-display);
  font-size: var(--text-display-sm);
  font-weight: var(--weight-regular);
  line-height: var(--leading-display);
  letter-spacing: 0;
}
```

```css
/* src/components/DialogBox/DialogBox.module.css:5-13 — current */
.more {
  position: absolute;
  inset-inline-end: var(--space-4);
  inset-block-end: var(--space-3);
  width: calc(7 * var(--cursor-px));
  height: calc(4 * var(--cursor-px));
  color: var(--color-cursor);
  animation: more-bob var(--sprite-bob-duration) steps(1, end) 0ms var(--sprite-bob-iterations) both;
}
```


## Target

On load, the prompt is revealed left to right with a `clip-path` wipe in **19 steps** (one per
character of "Choose your starter") over **600ms**, and then the ▼ starts bobbing (delay **600ms**).
`clip-path` doesn't affect layout, so the hero ball slots measured by the scroll engine don't move.
The text is always in the DOM, so screen readers read it immediately. The starter links below work
at once. The prompt shrinks to its text width (`fit-content`, centered as today) so the wipe tracks
the text, not the full dialog width. Skip it all under reduced motion.

```css
/* target — HomePage.module.css .prompt (two declarations added) and new rules after it */
.prompt {
  inline-size: fit-content;
  margin-block-end: var(--space-3);
  margin-inline: auto;
  padding-inline: var(--space-3);
  font-family: var(--font-display);
  font-size: var(--text-display-sm);
  font-weight: var(--weight-regular);
  line-height: var(--leading-display);
  letter-spacing: 0;
}

/* First load: the prompt types itself out like a Pokémon text box, one step per character of
   "Choose your starter" (19). Clip-path only, so nothing shifts and the text is always readable
   by screen readers. The ▼ in DialogBox waits for it (600ms delay). */
@media (prefers-reduced-motion: no-preference) {
  .prompt {
    animation: prompt-type 600ms steps(19, end) both;
  }
}

@keyframes prompt-type {
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0 0 0 0); }
}
```

```css
/* target — DialogBox.module.css .more animation line (delay 0ms → 600ms) and a comment above it */
  /* Starts once the hero prompt has typed itself out (HomePage.module.css .prompt, 600ms). */
  animation: more-bob var(--sprite-bob-duration) steps(1, end) 600ms var(--sprite-bob-iterations) both;
```

## Repo conventions to follow

- Motion goes inside `@media (prefers-reduced-motion: no-preference)`. Exemplar: the idle animations in `src/pages/JourneyPage.module.css`.
- Pixel motion uses `steps(n, end)`.
- CSS Modules rename keyframes only when used inside `animation`. Define `@keyframes prompt-type` in the same module as the rule using it (see the comment in `JourneyPage.module.css` about this).

## Steps

1. In `src/pages/HomePage.module.css`, add `inline-size: fit-content;` as the first declaration of `.prompt`, and `margin-inline: auto;` after `margin-block-end`. Then insert the commented `@media` block and the `@keyframes prompt-type` block directly after the `.prompt` rule.
2. In `src/components/DialogBox/DialogBox.module.css`, change `0ms` to `600ms` in the `.more` `animation:` line and add the comment above it. Leave the reduced-motion rule (`.more { animation: none; }`) as it is.
3. Do not edit `JourneyPage.jsx`.

## Boundaries

- Only these two files. The only other `DialogBox` with `more` is the hero (`NotFoundPage` has none), so the delay change affects only the hero.
- Do NOT split the text into per-character spans, and do NOT use JS.
- If an excerpt does not match the code, STOP and report.

## Verification

- **Mechanical**: `npm run lint` (0 warnings), `npm test`, `npm run build`.
- **Feel check** (load `/` fresh):
  - "Choose your starter" types out left to right in pixel steps over ~0.6s, centered where it was before. Then the ▼ starts bobbing.
  - The starter balls sit exactly over their slots (no offset), and scrolling still glides them into the rail.
  - At 320px the prompt wraps to two lines and both lines reveal together. That's acceptable; just confirm nothing is clipped at rest.
  - With reduced motion: the text is fully visible at once and the ▼ doesn't bob.
- **Done when**: over CDP, the prompt's computed `clip-path` changes over ~600ms after load and ends at `inset(0px)`, the `.more` element's `animation-delay` is `0.6s`, and the prompt's bounding box is centered within the dialog.
