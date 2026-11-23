# Animation plans

Written by `improve-animations` on 2026-11-16 (commit 3ff96a2, plus the uncommitted working tree at that time).
Each plan is self-contained and can be given to any agent as-is. When a plan is finished, set its
**Status** to `DONE` here and in the plan file.

| # | Plan | Severity | Category | Status |
| --- | --- | --- | --- | --- |
| 001 | [Make the Pokédex lid reverse from where it is when Close interrupts Open](001-pokedex-lid-interruptible.md) | MEDIUM | Interruptibility | DONE |
| 002 | [Give Pokédex tiles the same press feedback as the Pokédex keys](002-pokedex-tile-press.md) | LOW | Physicality & origin | DONE |
| 003 | [Write the per-scroll-frame custom properties on the elements that use them](003-scroll-vars-on-leaf-elements.md) | LOW | Performance | DONE |
| 004 | [Pokédex screen refresh when the view changes](004-pokedex-screen-refresh.md) | MEDIUM | Missed opportunity | DONE |
| 005 | [Cross-fade the theme toggle's moon and sun](005-theme-icon-crossfade.md) | LOW | Missed opportunity | DONE |
| 006 | [Cross-fade the copy icon to a check mark when the email is copied](006-copy-email-check-crossfade.md) | LOW | Missed opportunity | DONE |
| 007 | [Type in the "Choose your starter" prompt like a Pokémon text box](007-starter-prompt-typewriter.md) | LOW | Missed opportunity | DONE |
| 008 | ["A wild 404 appeared!": the egg wobbles once](008-404-wild-wobble.md) | LOW | Missed opportunity | DONE |

## Recommended order

1. **001** first. It's the only one that fixes something users can see go wrong (the lid jumping when Close interrupts Open).
2. **002** next. It's a one-rule change.
3. **003** last. It's invisible by design (same pixels, cheaper style work), so verify it carefully against the feel check.

## Second batch (004–008, from find-animation-opportunities)

Order by leverage: 004, then 005/006, then 007, then 008. They touch disjoint files, so they can run in parallel:
004 → Pokedex.jsx/.module.css; 005 → ThemeToggle.*, useTheme.js; 006 → Icon.jsx, Contact.*;
007 → HomePage.module.css, DialogBox.module.css; 008 → Page.module.css.

## Dependencies

- **001 and 002** both edit `src/components/Pokedex/Pokedex.module.css`, but in different rules (`.lid` vs `.tile`). Run them one after the other, not in parallel, so the second executor sees the first one's result.
- **003** is independent: it touches only the rail, hero ball link and scroll hook.

## Deliberately not planned

These were reviewed and left alone as documented design decisions (see `docs/spec/SPEC-v4.md` and `SPEC-v5.md`):
- The page glide timing and in-out curve (V4-17).
- Section intros replaying on every visit (V4-31).
- The 700ms `--ease-standard` lid (V5-24).
- `scale(0)` for Pokémon entering or leaving a Poké Ball.
- The hover wiggle (V4-40).
- Reduced motion making transitions instant.

Missed opportunities from the first audit: the theme-icon and "Copied" cross-fades became 005 and 006.
A reduced-motion cross-fade for the Pokédex cover and screen is still unplanned.
