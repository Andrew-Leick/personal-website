import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DEX_POKEMON, GUIDE_IDS } from '../../../lib/content/index.js'
import { BALL_HINGE, BALL_SEAM, BALL_SPRITE, ballClip, GUIDE_NAMES, GUIDE_SPRITES, GUIDE_TYPES, IMAGE_SIZES, IMAGE_SPRITES, SPRITE_DEFS, SPRITES, toPaths } from '../sprites.js'

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
    expect(GUIDE_SPRITES).toEqual(GUIDE_IDS)
    for (const id of GUIDE_IDS) expect(SPRITES[id]).toBeUndefined()
  })

  it('the Poké Ball is a 90px PNG and every PNG sprite has a size', () => {
    expect(IMAGE_SPRITES).toEqual([...GUIDE_IDS, BALL_SPRITE, ...DEX_POKEMON])
    for (const id of DEX_POKEMON) expect(IMAGE_SIZES[id]).toBe(96)
    expect(IMAGE_SIZES[BALL_SPRITE]).toBe(90)
    for (const id of IMAGE_SPRITES) expect(IMAGE_SIZES[id]).toBeGreaterThan(0)
  })

  it('every PNG sprite has its file in public/sprites', () => {
    for (const id of IMAGE_SPRITES) expect(existsSync(new URL(`../../../../public/sprites/${id}.png`, import.meta.url))).toBe(true)
  })

  it('the Poké Ball seam covers every column, curves between rows 49 and 60, and rises around the button', () => {
    expect(BALL_SEAM).toHaveLength(IMAGE_SIZES[BALL_SPRITE])
    expect(Math.min(...BALL_SEAM)).toBe(49)
    expect(Math.max(...BALL_SEAM)).toBe(60)
    // The bite: over the button (columns 27-34) the seam sits higher than on either side.
    expect(BALL_SEAM[30]).toBeLessThan(BALL_SEAM[16])
    expect(BALL_SEAM[30]).toBeLessThan(BALL_SEAM[45])
    expect(BALL_HINGE).toEqual({ x: 88, y: 50 })
  })

  it('ballClip cuts the two pieces along the same smooth seam (one point per column)', () => {
    const top = ballClip('top')
    const bottom = ballClip('bottom')
    expect(top.startsWith('polygon(0% 0%, 100% 0%, 100% ')).toBe(true)
    expect(bottom.startsWith('polygon(0% ')).toBe(true)
    expect(bottom.endsWith('100% 100%, 0% 100%)')).toBe(true)
    const points = (clip) => clip.slice(8, -1).split(', ')
    const seamTop = points(top).slice(2)
    const seamBottom = points(bottom).slice(0, -2)
    expect(seamTop).toEqual([...seamBottom].reverse())
    expect(seamBottom).toHaveLength(IMAGE_SIZES[BALL_SPRITE] + 2)
  })
})
