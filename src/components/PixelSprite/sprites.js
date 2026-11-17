// Original pixel-art sprites (egg, menu cursor, "more" arrow, the owner's trainer). Drawn for this
// project. The three guide Pokémon are PNG files in public/sprites/. The grids are the source
// of truth: do not edit them without a spec change (except the trainer, which is the owner's to customize).

import { DEX_POKEMON } from '../../lib/content/index.js'

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
  // The owner's trainer (SPEC-v6 P-05): based on the Gen 4 (HeartGold/SoulSilver) trainer sprite of
  // Ethan, in Stanford colors (cardinal cap with a white block "S", cardinal jacket, Stanford black and
  // cool grey), with brown hair and a hand-drawn face (rows 0-14) as a starting point to customize. It
  // is fan art like the Pokémon, so it only shows with site.fanArt on. Edit the grid and the
  // --sprite-trainer-* colors in tokens.css freely (36x65; keep every row 36 characters).
  trainer: {
    grid: [
      '.............aaaaaaaa...............',
      '...........aaddnnndddaa.............',
      '..........addddnddddddda............',
      '.........adddddnnndddddda...........',
      '.........adddddddndddddda...........',
      '.........adddddnnndddddda...........',
      '........abbbbbbbbbbbbbbbba..........',
      '........aBEEEmmmmmmmmEEEBa..........',
      '........aBEmmEEmmmmEEmmEBa..........',
      '........aBEmmanmmmmanmmEBa..........',
      '........aBEmmaammmmaammEBa..........',
      '........aBEmmmmmjmmmmmmEBa..........',
      '..........ammmmmmmmmmmma............',
      '...........ajmmmggmmmja.............',
      '............aajmmmmjaa..............',
      '.....aaaa..ajjmmmmmma...............',
      '....agjmha..ajhnhmja................',
      '...ahfhmjmaaaccmjgca................',
      '..ahjjjjjjaabegjjcbba...............',
      '..ajhjmhma.agnihchiia...............',
      '.aechhjaaa.annnijcilnaa.............',
      'afeacca.....ainnbbbgnnia............',
      'afa.abbaaaaaaadinbilniaca...........',
      '.acadddcdddca.adacaaea.adaa.........',
      '.aaaaacaaddda.aacdccba.accca........',
      '.....aa..aaccaaacdddcaadccca........',
      '...........acdceecffffdcddda........',
      '.........aaigdfciiccffdcaddda.......',
      '.........aiigdffciigdfaa.addda......',
      '..........aggcdddbeeaa.aaaaadda.....',
      '...........acdccddba.aaa....affaa...',
      '...........acdddccccaaaa....adfdca..',
      '...........acdddcccccaa.....adfdca..',
      '...........agdddddccdda......afdea..',
      '...........alnidddccddda.....adbegaa',
      '...........aeinnnaaaaaa.......abjjja',
      '...........aeebea......a......ajjjja',
      '..........aeeebeeaaaaaaa.......ammja',
      '..........aeebeeeebbebebaaa....amjca',
      '..........aeebeeeebbbbebbaa....ajga.',
      '..........abbeeeeaeebbbba.......aaa.',
      '..........aeeeeea.aebeeea...........',
      '.........aeeeeeea..aeeeebaa.........',
      '........aeeeeeea...aeeeebba.........',
      '........aeeeeea....aeeeebba.........',
      '.......aeeeeeea.....aeeeebba........',
      '.......aeeeeeea......aeeebba........',
      '.......abaeeeea......aeeebba........',
      '.......aa.aaea.......aeaaaaa........',
      '.......aea..aa........a.............',
      '.....aajbaaaa..........aaaaaa.......',
      '....agmja.aa............abga........',
      '....ajmmma..............ajjma.......',
      '...ajmmmja..............ajmma.......',
      '...ajmmma...............ammma.......',
      '...ajmma................ammma.......',
      '...amma..................ajmma......',
      '..ammja..................agjma......',
      '..addda...................andda.....',
      '..addca...................ailddaaa..',
      '..ajjga...................ailjjjjga.',
      '...alla...................aiinndfja.',
      '...adda...................aaaaiddja.',
      '...ajfda......................aaaaa.',
      '..aaaaaa............................',
    ],
    palette: {
      a: OUTLINE,
      b: 'var(--sprite-trainer-charcoal-dark)',
      e: 'var(--sprite-trainer-charcoal)',
      c: 'var(--sprite-trainer-jacket-shade)',
      d: 'var(--sprite-trainer-jacket)',
      f: 'var(--sprite-trainer-jacket-light)',
      g: 'var(--sprite-trainer-skin-shadow)',
      j: 'var(--sprite-trainer-skin-shade)',
      m: 'var(--sprite-trainer-skin)',
      h: 'var(--sprite-trainer-tan)',
      i: 'var(--sprite-trainer-gray)',
      l: 'var(--sprite-trainer-gray-light)',
      n: 'var(--sprite-trainer-white)',
      B: 'var(--sprite-trainer-hair-shade)',
      E: 'var(--sprite-trainer-hair)',
    },
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

/** Official Poké Ball art (Dream World, 90x90, smooth) for the v4 journey: hero slots, rail, section intros. */
export const BALL_SPRITE = 'poke-ball'

/** Every sprite served as a PNG from public/sprites/{id}.png (the v5.1 Pokédex Pokémon included). */
export const IMAGE_SPRITES = [...GUIDE_SPRITES, BALL_SPRITE, ...DEX_POKEMON]

/**
 * Native pixel size of each PNG sprite. The Pokémon are pixel art: show them at integer
 * multiples only. The Poké Ball is smooth art and scales freely.
 */
export const IMAGE_SIZES = { [BALL_SPRITE]: 90, ...Object.fromEntries([...GUIDE_SPRITES, ...DEX_POKEMON].map((id) => [id, 96])) }

/*
 * Where the Poké Ball art splits into its two pieces (spec v4.8), measured on the 90x90 PNG:
 * for each pixel column, the first row below the orange top (where the black band, the
 * button ring or the white half begins). Above it is the lid. The ball is drawn at a slight
 * angle, so the seam curves (rows 49-60), and it rises around the button on the left: the
 * lid takes a round bite where the button sits, as on the real ball. Edge columns with no
 * orange copy their neighbour.
 */
export const BALL_SEAM = [
  51, 51, 51, 51, 51, 51, 52, 52, 53, 53, 54, 54, 54, 55, 55, 56, 56, 56, 56, 55,
  54, 53, 52, 51, 50, 50, 50, 49, 49, 49, 49, 49, 49, 49, 49, 50, 50, 50, 51, 52,
  53, 54, 55, 57, 59, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 59, 59,
  59, 59, 59, 59, 58, 58, 58, 58, 58, 57, 57, 57, 56, 56, 56, 55, 55, 55, 54, 54,
  53, 53, 52, 52, 51, 50, 50, 50, 50, 50,
]

/**
 * The lid's hinge, in art pixels: the right end of the seam, on the outline. The lid swings
 * up and right around it.
 */
export const BALL_HINGE = { x: 88, y: 50 }

const pct = (v) => `${+((v / BALL_SEAM.length) * 100).toFixed(3)}%`

/** BALL_SEAM smoothed (3-column average): the cut follows the curve, not pixel noise. */
const SMOOTH_SEAM = BALL_SEAM.map((_, x, seam) => {
  const near = [seam[x - 1], seam[x], seam[x + 1]].filter((v) => v !== undefined)
  return near.reduce((a, b) => a + b, 0) / near.length
})

/**
 * clip-path polygon that keeps only the top piece ('top') or the bottom piece ('bottom') of
 * the Poké Ball art. The cut is a polyline through each column's center along the smoothed
 * seam, so both edges are smooth curves, not stair steps.
 * @param {'top'|'bottom'} piece
 */
export function ballClip(piece) {
  const n = SMOOTH_SEAM.length
  const seam = [`0% ${pct(SMOOTH_SEAM[0])}`]
  for (let x = 0; x < n; x += 1) seam.push(`${pct(x + 0.5)} ${pct(SMOOTH_SEAM[x])}`)
  seam.push(`100% ${pct(SMOOTH_SEAM[n - 1])}`)
  return piece === 'top'
    ? `polygon(0% 0%, 100% 0%, ${seam.reverse().join(', ')})`
    : `polygon(${seam.join(', ')}, 100% 100%, 0% 100%)`
}

/** Guide id (site.json pages[].guide) -> caption shown under the sprite. */
export const GUIDE_NAMES = { charmander: 'Charmander', bulbasaur: 'Bulbasaur', squirtle: 'Squirtle' }

/** Guide id -> type accent; selects --color-type-{type}. Egg / no guide = "normal". */
export const GUIDE_TYPES = { charmander: 'fire', bulbasaur: 'grass', squirtle: 'water' }
