# 005 — Cross-fade the theme toggle's moon and sun

- **Status**: DONE (implemented by workers, approved by an independent reviewer on 2026-11-16)
- **Commit**: c645d72
- **Severity**: LOW (missed opportunity)
- **Category**: Missed opportunities (state indication)
- **Estimated scope**: 3 files (`ThemeToggle.jsx`, `ThemeToggle.module.css`, `src/hooks/useTheme.js`), ~35 lines

## Problem

The theme toggle swaps its icon instantly: moon in light mode, sun in dark mode.

```jsx
/* src/components/ThemeToggle/ThemeToggle.jsx:14-25 — current */
  return (
    <button
      type="button"
      className={`pixel-button ${styles.toggle}`}
      onClick={onToggle}
      aria-label={label}
      title={label}
      data-print="hide"
    >
      <Icon name={isDark ? 'sun' : 'moon'} />
    </button>
  )
```

Any transition added to the icon would be swallowed by the theme switch itself.
`applyTheme` disables every transition for one frame so the page's colors snap together:

```js
/* src/hooks/useTheme.js:51-62 — current */
function applyTheme(theme) {
  // Suppress transitions during the swap so controls do not cross-fade while
  // the rest of the page snaps to the new colors.
  const style = document.createElement('style')
  style.textContent = '*, *::before, *::after { transition: none !important; }'
  document.head.appendChild(style)
  document.documentElement.dataset.theme = theme
  // Force a style flush so the new colors apply with transitions disabled.
  void getComputedStyle(document.body).opacity
  syncThemeColorMeta()
  requestAnimationFrame(() => style.remove())
}
```

## Target

Both icons stay mounted, stacked in one grid cell. The shown one is at rest. The hidden one sits at
`opacity: 0; scale: 0.25; filter: blur(4px)`. Switching cross-fades them over **300ms** with the
repo's curve `var(--ease-standard)` (`cubic-bezier(0.2, 0, 0, 1)`). The two icon wrappers carry
`data-theme-icon` and are exempt from the switch's transition suppression.

```jsx
/* target — ThemeToggle.jsx return */
  return (
    <button
      type="button"
      className={`pixel-button ${styles.toggle}`}
      onClick={onToggle}
      aria-label={label}
      title={label}
      data-print="hide"
    >
      {/* Both icons stay mounted and cross-fade; data-theme-icon exempts them from the
          transition suppression in useTheme's applyTheme. */}
      <span className={styles.icons} aria-hidden="true">
        <span className={styles.icon} data-theme-icon="" data-shown={isDark ? undefined : ''}>
          <Icon name="moon" />
        </span>
        <span className={styles.icon} data-theme-icon="" data-shown={isDark ? '' : undefined}>
          <Icon name="sun" />
        </span>
      </span>
    </button>
  )
```

```css
/* target — appended to ThemeToggle.module.css */

/* The moon and sun share one cell and cross-fade: the incoming icon grows in from a quarter
   size out of a slight blur, the outgoing one shrinks away into it. */
.icons {
  display: grid;
}

.icon {
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

.icon[data-shown] {
  opacity: 1;
  scale: 1;
  filter: blur(0);
}

/* Reduced motion: no scale or blur; only the opacity changes. */
@media (prefers-reduced-motion: reduce) {
  .icon {
    scale: 1;
    filter: none;
  }
}
```

```js
/* target — useTheme.js, the one changed line in applyTheme */
  style.textContent = '*:not([data-theme-icon]), *::before, *::after { transition: none !important; }'
```

Also extend that function's comment with one sentence: "The theme toggle's icons (data-theme-icon) are exempt so they can cross-fade."

## Repo conventions to follow

- The curve token is `--ease-standard` in `src/styles/tokens.css`. Do not add a new curve.
- Hover-only styling stays inside `@media (hover: hover)` (the existing `.toggle:hover` rule is already gated; leave it).
- Note that `src/styles/base.css` sets `transition-duration: 0ms !important` under reduced motion, so with reduced motion the swap is instant. That is intended.

## Steps

1. Replace the `return (…)` of `ThemeToggle.jsx` with the target. Keep the `isDark` and `label` lines above it as they are.
2. Append the target CSS to `src/components/ThemeToggle/ThemeToggle.module.css`. Do not change the existing `.toggle` rules.
3. In `src/hooks/useTheme.js` `applyTheme`, change only the `style.textContent` line to the target and add the comment sentence.

## Boundaries

- Only these three files. Keep the button's size (44×44), `aria-label`, `title` and `pixel-button` class.
- Do NOT change the suppression for anything other than `[data-theme-icon]`.
- If an excerpt does not match the code, STOP and report.

## Verification

- **Mechanical**: `npm run lint` (0 warnings), `npm test`, `npm run build`.
- **Feel check**: click the toggle (header, top right) several times.
  - The outgoing icon shrinks and blurs away while the incoming one grows in from small and blurry, over ~300ms. The rest of the page still switches colors instantly, with no smeared fades on links or buttons.
  - Click rapidly: the icons reverse mid-way and never restart from zero.
  - With `prefers-reduced-motion: reduce`: instant swap with no scale or blur.
  - The button is still 44×44 and the icon is centered.
- **Done when**: after a click, sampling over CDP shows the incoming icon wrapper's computed `opacity` and `scale` changing over ~300ms (not jumping), while a header nav link's color changes in the same frame.
