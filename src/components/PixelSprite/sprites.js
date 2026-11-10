// Original pixel-art UI sprites (egg, menu cursor, "more" arrow). Drawn for this
// project. The three guide Pokémon are PNG files in public/sprites/. The grids are the source
// of truth: do not edit them without a spec change.

const OUTLINE = 'var(--sprite-outline)'

const DEFS = {
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

/** Guide Pokémon rendered from PNG files in public/sprites/{id}.png (96x96, Black/White style). */
export const GUIDE_SPRITES = ['charmander', 'bulbasaur', 'squirtle']

/** Official item sprite (30x30) used for the v4 journey: hero slots, rail and section intros. */
export const BALL_SPRITE = 'poke-ball'

/** Every sprite served as a PNG from public/sprites/{id}.png. */
export const IMAGE_SPRITES = [...GUIDE_SPRITES, BALL_SPRITE]

/** Native pixel size of each PNG sprite. Show them at integer multiples only. */
export const IMAGE_SIZES = { charmander: 96, bulbasaur: 96, squirtle: 96, [BALL_SPRITE]: 30 }

/** Guide id (site.json pages[].guide) -> caption shown under the sprite. */
export const GUIDE_NAMES = { charmander: 'Charmander', bulbasaur: 'Bulbasaur', squirtle: 'Squirtle' }

/** Guide id -> type accent; selects --color-type-{type}. Egg / no guide = "normal". */
export const GUIDE_TYPES = { charmander: 'fire', bulbasaur: 'grass', squirtle: 'water' }
