# 002 — Give Pokédex tiles the same press feedback as the Pokédex keys

- **Status**: DONE (implemented by workers, approved by an independent reviewer on 2026-11-16)
- **Commit**: 3ff96a2 (the working tree had uncommitted changes when this was written on 2026-11-16; every excerpt below is from that working tree, so match against the excerpts, not the commit)
- **Severity**: LOW
- **Category**: Physicality & origin
- **Estimated scope**: 1 file (`src/components/Pokedex/Pokedex.module.css`), ~6 lines added

## Problem

Every control on the Pokédex device presses in when clicked except the Pokémon tiles. The
blue keys drop 2px on `:active`:

```css
/* src/components/Pokedex/Pokedex.module.css:215-218 — current */
.key:not(:disabled):active {
  transform: translateY(var(--border-width-pixel));
  box-shadow: 0 var(--border-width-pixel) 0 var(--dex-key-dark);
}
```

The tiles (one button per entry in the Experience or Projects grid) only have a hover
background and no `:active` state, so a click or tap gets no physical acknowledgement:

```css
/* src/components/Pokedex/Pokedex.module.css:261-287 — current */
.tile {
  display: grid;
  align-content: start;
  justify-items: center;
  gap: var(--space-1);
  inline-size: 100%;
  block-size: 100%;
  padding: var(--space-2);
  border: var(--border-width-pixel) solid transparent;
  border-radius: var(--radius-md);
  background-color: transparent;
  color: var(--color-text);
  text-align: center;
  transition:
    background-color var(--duration-fast) var(--ease-standard),
    border-color var(--duration-fast) var(--ease-standard);
}

@media (hover: hover) {
  .key:not(:disabled):hover {
    background-color: var(--dex-key-light);
  }

  .tile:hover {
    border-color: var(--color-border);
    background-color: var(--color-bg-subtle);
  }
}
```

## Target

An instant 2px press on the tile, matching the keys and the site-wide `.pixel-button`
(`src/styles/base.css`, `.pixel-button:active { transform: translateY(var(--border-width-pixel)); … }`).
The press is **instant**, with no transform transition, because the site's pixel style
presses snap like a physical button. `transform` is not added to the tile's `transition` list.

```css
/* target — new rule, placed directly after the closing brace of the .tile rule */

/* Pressed: drops 2px, like the device keys (instant, as every press on the site is). */
.tile:active {
  transform: translateY(var(--border-width-pixel));
}
```

## Repo conventions to follow

- Press feedback on this site is an instant `translateY(var(--border-width-pixel))` on `:active`. Exemplars: `.key:not(:disabled):active` in this file (line ~215) and `.pixel-button:active` in `src/styles/base.css`.
- Use the existing token `--border-width-pixel` (2px). Don't hard-code `2px`.

## Steps

1. In `src/components/Pokedex/Pokedex.module.css`, find the `.tile { … }` rule (it ends with the `transition:` declaration listing `background-color` and `border-color`).
2. Directly after its closing `}` and a blank line, insert the target rule and its comment exactly as shown in **Target**.
3. Make no other change.

## Boundaries

- Do NOT add `transform` to `.tile`'s `transition` list. The press stays instant.
- Do NOT use `scale()` for the press. Every press on this site translates down 2px.
- Do NOT touch any other rule or file.
- Do NOT change markup.
- If the `.tile` rule does not match the excerpt, STOP and report.

## Verification

- **Mechanical**: `npm run lint` (0 warnings), `npm test` (all pass), `npm run build` (succeeds).
- **Feel check**: `npm run build && npx vite preview`, open `/experience/#pokedex-experience`.
  - Press and hold a tile: the whole tile (sprite, number, label) drops 2px at once. Release: it snaps back.
  - It matches the feel of pressing the blue **Menu** key in the same device.
  - On a touch device (or DevTools device mode), tapping a tile shows the same brief press with no stuck state.
  - Toggle `prefers-reduced-motion: reduce`: the 2px press still happens. It's instant feedback, not motion, the same as the keys today.
- **Done when**: `grep -n "\.tile:active" src/components/Pokedex/Pokedex.module.css` finds exactly one rule with `transform: translateY(var(--border-width-pixel))`, and the press is visible in the browser.
