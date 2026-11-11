import { BASE_URL } from '../../lib/content/paths.js'
import { BALL_HINGE, BALL_SEAM, BALL_SPRITE, ballClip } from '../PixelSprite/sprites.js'
import styles from './PokeBall.module.css'

const pct = (v) => `${((v / BALL_SEAM.length) * 100).toFixed(3)}%`

// Built once: the two pieces follow the art's curved seam, column by column.
const TOP_STYLE = { clipPath: ballClip('top') }
const BOTTOM_STYLE = { clipPath: ballClip('bottom') }
// The lid pivots on the right end of the seam (src/lib/journey/openBall.js swings it).
const LID_STYLE = { transformOrigin: `${pct(BALL_HINGE.x)} ${pct(BALL_HINGE.y)}` }

/**
 * Official Poké Ball art (Dream World, 90x90, smooth) drawn as two pieces: the orange top
 * (the lid, with a round bite where the button sits) and the bottom (black band, whole
 * button and white half), cut along the art's curved seam, so the lid can swing open while
 * the bottom stays put (src/lib/journey/openBall.js). Decorative. Size comes from the
 * parent's --ball-size.
 *
 * The lid's rotation goes on a wrapper (data-part="top"), never on the clipped image itself:
 * an element that is both clip-pathed and transform-animated gets a composited layer plus
 * a mask layer, and some browsers (notably Safari, some GPU paths) stop drawing it mid-
 * animation, so the top half vanished. The wrapper is unclipped; the image inside is not
 * animated.
 */
export default function PokeBall({ className }) {
  const src = `${BASE_URL}sprites/${BALL_SPRITE}.png`
  return (
    <span className={className ? `${styles.ball} ${className}` : styles.ball} data-part="ball" aria-hidden="true">
      <img className={styles.half} style={BOTTOM_STYLE} src={src} width={90} height={90} alt="" draggable={false} />
      <span className={styles.lid} style={LID_STYLE} data-part="top">
        <img className={styles.half} style={TOP_STYLE} src={src} width={90} height={90} alt="" draggable={false} />
      </span>
    </span>
  )
}
