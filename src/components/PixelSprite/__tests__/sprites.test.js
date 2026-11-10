import { describe, expect, it } from 'vitest'
import { GUIDE_IDS } from '../../../lib/content/index.js'
import { GUIDE_NAMES, GUIDE_TYPES, IMAGE_SPRITES, SPRITE_DEFS, SPRITES, toPaths } from '../sprites.js'

// SPEC-v3 5.2 expected table.
const EXPECTED = {
  egg: { w: 16, h: 16, cells: 100, keys: { h: 56, o: 30, p: 14 } },
  cursor: { w: 4, h: 7, cells: 16, keys: { o: 16 } },
  more: { w: 7, h: 4, cells: 16, keys: { o: 16 } },
}

function countKeys(grid) {
  const counts = {}
  for (const row of grid) {
    for (const ch of row) if (ch !== '.') counts[ch] = (counts[ch] ?? 0) + 1
  }
  return counts
}

describe('sprites', () => {
  it('defines exactly the expected sprites', () => {
    expect(Object.keys(SPRITE_DEFS).sort()).toEqual(Object.keys(EXPECTED).sort())
  })

  for (const [name, exp] of Object.entries(EXPECTED)) {
    describe(name, () => {
      const def = SPRITE_DEFS[name]

      it('has uniform rows and the expected size', () => {
        for (const row of def.grid) expect(row.length).toBe(exp.w)
        expect(def.grid.length).toBe(exp.h)
        expect(SPRITES[name].width).toBe(exp.w)
        expect(SPRITES[name].height).toBe(exp.h)
      })

      it('uses only palette keys', () => {
        for (const key of Object.keys(countKeys(def.grid))) expect(def.palette).toHaveProperty(key)
      })

      it('has the expected filled-cell counts', () => {
        const counts = countKeys(def.grid)
        expect(counts).toEqual(exp.keys)
        expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(exp.cells)
      })

      it('toPaths covers exactly the filled cells', () => {
        let area = 0
        for (const { d } of toPaths(def)) {
          for (const m of d.matchAll(/h(\d+)v1/g)) area += Number(m[1])
        }
        expect(area).toBe(exp.cells)
      })

      it('uses only sprite tokens or currentColor', () => {
        for (const value of Object.values(def.palette)) {
          expect(value === 'currentColor' || /^var\(--sprite-[a-z-]+\)$/.test(value)).toBe(true)
        }
      })
    })
  }

  it('guide maps cover GUIDE_IDS', () => {
    expect(Object.keys(GUIDE_NAMES)).toEqual(GUIDE_IDS)
    expect(Object.keys(GUIDE_TYPES)).toEqual(GUIDE_IDS)
  })

  it('guide Pokémon are PNG images, not SVG grids', () => {
    expect(IMAGE_SPRITES).toEqual(GUIDE_IDS)
    for (const id of GUIDE_IDS) expect(SPRITES[id]).toBeUndefined()
  })
})
