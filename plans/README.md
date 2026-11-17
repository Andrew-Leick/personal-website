# Animation plans

Written by `improve-animations` on 2026-11-16 (commit 3ff96a2, plus the uncommitted working tree at that time).
Each plan is self-contained and can be given to any agent as-is. When a plan is finished, set its
**Status** to `DONE` here and in the plan file.

| # | Plan | Severity | Category | Status |
| --- | --- | --- | --- | --- |
| 001 | [Make the Pokédex lid reverse from where it is when Close interrupts Open](001-pokedex-lid-interruptible.md) | MEDIUM | Interruptibility | DONE |
| 002 | [Give Pokédex tiles the same press feedback as the Pokédex keys](002-pokedex-tile-press.md) | LOW | Physicality & origin | DONE |
| 003 | [Write the per-scroll-frame custom properties on the elements that use them](003-scroll-vars-on-leaf-elements.md) | LOW | Performance | DONE |

## Recommended order

1. **001** first. It's the only one that fixes something users can see go wrong (the lid jumping when Close interrupts Open).
2. **002** next. It's a one-rule change.
3. **003** last. It's invisible by design (same pixels, cheaper style work), so verify it carefully against the feel check.

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

Missed opportunities noted in the audit but not planned:
- A reduced-motion opacity cross-fade for the Pokédex cover and screen.
- A cross-fade for the theme toggle icon.
- A check-mark icon cross-fade on "Copied".
