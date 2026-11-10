// Original pixel-art sprites for this site (SPEC-v3 section 5). Drawn for this
// project; not copied or traced from any game asset. The grids are the source
// of truth: do not edit them without a spec change.

const OUTLINE = 'var(--sprite-outline)'
const EYE_WHITE = 'var(--sprite-eye-white)'

const DEFS = {
  charmander: {
    grid: [
      '................',
      '....oooo........',
      '...oaaaao.......',
      '..oaaaaaao...r..',
      '..oaaaaaao..rfr.',
      '..oawaawao..rfr.',
      '..oaeaaeao...r..',
      '..oaaaaaao..oao.',
      '...oaaaao...oao.',
      '...oabbaoo.oao..',
      '..oaobbaoaooao..',
      '..oaobbbaoaao...',
      '...oabbbaaoo....',
      '...oaaaaao......',
      '..oaaooaaao.....',
      '..ooo..ooo......',
    ],
    palette: {
      o: OUTLINE,
      a: 'var(--sprite-char-body)',
      b: 'var(--sprite-char-belly)',
      w: EYE_WHITE,
      e: OUTLINE,
      f: 'var(--sprite-char-flame-inner)',
      r: 'var(--sprite-char-flame-outer)',
    },
  },
  bulbasaur: {
    grid: [
      '................',
      '........oooo....',
      '......oollllo...',
      '.....olkllklo...',
      '....olllkllllo..',
      '..ooolkllllklo..',
      '.ogggolllllloo..',
      'oggdgggoooooggo.',
      'oggggggggggdggo.',
      'ogweggggwegggo..',
      'ogeegggggeeggo..',
      '.oggggggggggdo..',
      '..ogggdgggggo...',
      '..ogoooggooggo..',
      '..oo...oo..ooo..',
      '................',
    ],
    palette: {
      o: OUTLINE,
      g: 'var(--sprite-bulb-body)',
      d: 'var(--sprite-bulb-spot)',
      l: 'var(--sprite-bulb-bulb)',
      k: 'var(--sprite-bulb-bulb-dark)',
      w: EYE_WHITE,
      e: 'var(--sprite-bulb-eye)',
    },
  },
  squirtle: {
    grid: [
      '................',
      '....oooooo......',
      '...oaaaaaao.....',
      '..oaaaaaaaao....',
      '..oawaaaawao....',
      '..oaeaaaaeao....',
      '..oaaaaaaaao....',
      '...oaaooaao.....',
      '..ossoaaosso....',
      '.oaosbbbbsoao...',
      '.oaosbttbsoaoo..',
      '..oosbbbbsoaao..',
      '...osbttbsooao..',
      '...ooaooaoo.oo..',
      '...oaao.oaao....',
      '...ooo...ooo....',
    ],
    palette: {
      o: OUTLINE,
      a: 'var(--sprite-squirt-body)',
      s: 'var(--sprite-squirt-shell)',
      t: 'var(--sprite-squirt-shell-light)',
      b: 'var(--sprite-squirt-belly)',
      w: EYE_WHITE,
      e: 'var(--sprite-squirt-eye)',
    },
  },
  egg: {
    grid: [
      '................',
      '................',
      '......oooo......',
      '.....ohhhho.....',
      '....ohhpphho....',
      '....ohhpphho....',
      '...ohhhhhhhho...',
      '...ophhhhhhpo...',
      '...opphhhhppo...',
      '...ohhhhhhhho...',
      '...ohhhpphhho...',
      '...ohhhpphhho...',
      '....ohhhhhho....',
      '.....oooooo.....',
      '................',
      '................',
    ],
    palette: {
      o: OUTLINE,
      h: 'var(--sprite-egg-shell)',
      p: 'var(--sprite-egg-spot)',
    },
  },
  cursor: {
    grid: ['o...', 'oo..', 'ooo.', 'oooo', 'ooo.', 'oo..', 'o...'],
    palette: { o: 'currentColor' },
  },
  more: {
    grid: ['ooooooo', '.ooooo.', '..ooo..', '...o...'],
    palette: { o: 'currentColor' },
  },
}

/**
 * Grid -> one SVG path per fill color. Each horizontal run of the same key
 * becomes "M{x} {y}h{w}v1h-{w}z". Keys that share a fill share a path.
 * @returns {{ fill: string, d: string }[]}
 */
export function toPaths({ grid, palette }) {
  const byFill = new Map()
  grid.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const key = row[x]
      if (key === '.') {
        x += 1
        continue
      }
      let end = x + 1
      while (end < row.length && row[end] === key) end += 1
      const fill = palette[key]
      if (!fill) throw new Error(`sprite palette has no key "${key}"`)
      const w = end - x
      byFill.set(fill, `${byFill.get(fill) ?? ''}M${x} ${y}h${w}v1h-${w}z`)
      x = end
    }
  })
  return [...byFill].map(([fill, d]) => ({ fill, d }))
}

export const SPRITE_DEFS = DEFS

/** name -> { width, height, paths } */
export const SPRITES = Object.fromEntries(
  Object.entries(DEFS).map(([name, def]) => [
    name,
    { width: def.grid[0].length, height: def.grid.length, paths: toPaths(def) },
  ]),
)

/** Guide id (site.json pages[].guide) -> caption shown under the sprite. */
export const GUIDE_NAMES = { charmander: 'Charmander', bulbasaur: 'Bulbasaur', squirtle: 'Squirtle' }

/** Guide id -> type accent; selects --color-type-{type}. Egg / no guide = "normal". */
export const GUIDE_TYPES = { charmander: 'fire', bulbasaur: 'grass', squirtle: 'water' }
