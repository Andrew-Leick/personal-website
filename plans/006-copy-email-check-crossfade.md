# 006 — Cross-fade the copy icon to a check mark when the email is copied

- **Status**: DONE (implemented by workers, approved by an independent reviewer on 2026-11-16)
- **Commit**: c645d72
- **Severity**: LOW (missed opportunity)
- **Category**: Missed opportunities (feedback)
- **Estimated scope**: 3 files (`Icon.jsx`, `Contact.jsx`, `Contact.module.css`), ~35 lines

## Problem

The Contact section's **Copy email** button changes its label to "Copied" for 2 seconds, but its
icon stays the copy icon, so the success is easy to miss.

```jsx
/* src/components/Contact/Contact.jsx:50-53 — current */
          <button type="button" className={`pixel-button ${styles.copy}`} onClick={handleCopy} data-print="hide">
            <Icon name="copy" />
            <span>{buttonText}</span>
          </button>
```

`status` is `'idle' | 'copied' | 'failed'` and resets to `'idle'` after `RESET_MS = 2000`.

## Target

A new `check` icon. Both icons stay mounted, stacked. The copy icon shows unless `status === 'copied'`,
in which case the check shows. They cross-fade with the same recipe as the theme toggle:
`opacity 0 → 1`, `scale 0.25 → 1`, `filter: blur(4px) → blur(0)`, **300ms** `var(--ease-standard)`.
The reset back to the copy icon after 2s reverses it.

```jsx
/* target — Icon.jsx, new entry in PATHS, placed directly after `copy` */
  check: (
    <g {...STROKE}>
      <path d="M5 12.5 10 17.5 19 7" />
    </g>
  ),
```

```jsx
/* target — Contact.jsx button contents */
          <button type="button" className={`pixel-button ${styles.copy}`} onClick={handleCopy} data-print="hide">
            {/* Copy and check share one cell and cross-fade (Contact.module.css .copyIcon). */}
            <span className={styles.copyIcons} aria-hidden="true">
              <span className={styles.copyIcon} data-shown={status === 'copied' ? undefined : ''}>
                <Icon name="copy" />
              </span>
              <span className={styles.copyIcon} data-shown={status === 'copied' ? '' : undefined}>
                <Icon name="check" />
              </span>
            </span>
            <span>{buttonText}</span>
          </button>
```

```css
/* target — appended to Contact.module.css */

/* Copied: the copy icon cross-fades to a check mark (the incoming icon grows in from a quarter
   size out of a slight blur), and back when the label resets. */
.copyIcons {
  display: grid;
  flex: none;
}

.copyIcon {
  display: grid;
  grid-area: 1 / 1;
  place-items: center;
  opacity: 0;
  scale: 0.25;
  filter: blur(4px);
  transition:
    opacity 300ms var(--ease-standard),
    scale 300ms var(--ease-standard),
    filter 300ms var(--ease-standard);
}

.copyIcon[data-shown] {
  opacity: 1;
  scale: 1;
  filter: blur(0);
}

/* Reduced motion: no scale or blur; only the opacity changes. */
@media (prefers-reduced-motion: reduce) {
  .copyIcon {
    scale: 1;
    filter: none;
  }
}
```

## Repo conventions to follow

- Icons are inline SVG paths in `src/components/Icon/Icon.jsx` using the shared `STROKE` props. Exemplar: the `copy` entry.
- Curve token: `--ease-standard` (`src/styles/tokens.css`). No new curve.
- The visible label, the live-region announcement and the copy-failure message stay exactly as they are.

## Steps

1. Add the `check` entry to `PATHS` in `src/components/Icon/Icon.jsx`, directly after `copy`.
2. In `src/components/Contact/Contact.jsx`, replace the line `<Icon name="copy" />` inside the copy button with the target `copyIcons` span (comment included). Change nothing else.
3. Append the target CSS to `src/components/Contact/Contact.module.css`.

## Boundaries

- Only these three files. Do NOT change copy text, timing (`RESET_MS`), the live region or the failure message.
- If an excerpt does not match the code, STOP and report.

## Verification

- **Mechanical**: `npm run lint` (0 warnings), `npm test`, `npm run build`.
- **Feel check** (About section → Contact): click **Copy email**. The copy icon shrinks and blurs away while a check mark grows in (~300ms) next to "Copied". After 2s it cross-fades back with "Copy email". With reduced motion it swaps instantly. If the clipboard is blocked, the icon stays the copy icon, and "Copy failed" plus the recovery text show as today.
- **Done when**: over CDP (grant clipboard permission with `Browser.grantPermissions` `clipboardReadWrite`, or stub `navigator.clipboard.writeText` to resolve), after clicking, the check wrapper has `data-shown` and its computed opacity rises over ~300ms. It loses `data-shown` after ~2s.
