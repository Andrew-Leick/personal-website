import { SvgSprite } from '../PixelSprite/PixelSprite.jsx'
import { toPaths } from '../PixelSprite/sprites.js'
import { TRAINER } from '../PixelSprite/trainer.js'

const SPRITE = { width: TRAINER.grid[0].length, height: TRAINER.grid.length, paths: toPaths(TRAINER) }

/** The owner's trainer, in its own chunk: About loads it with React.lazy (trainer.js explains why). */
export default function TrainerSprite({ className }) {
  return <SvgSprite name="trainer" sprite={SPRITE} className={className} />
}
