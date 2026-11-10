import { BASE_URL } from '../../lib/content/paths.js'
import { BALL_SPRITE } from '../PixelSprite/sprites.js'
import styles from './PokeBall.module.css'

/**
 * Official Poké Ball sprite drawn as two clipped halves, so the top half can flip open
 * (see src/lib/journey/openBall.js). Decorative. Size comes from the parent's
 * --ball-size (an integer multiple of 30px keeps the pixels crisp).
 */
export default function PokeBall({ className }) {
  const src = `${BASE_URL}sprites/${BALL_SPRITE}.png`
  return (
    <span className={className ? `${styles.ball} ${className}` : styles.ball} data-part="ball" aria-hidden="true">
      <img className={`${styles.half} ${styles.bottom}`} src={src} width={30} height={30} alt="" draggable={false} />
      <img className={`${styles.half} ${styles.top}`} src={src} width={30} height={30} alt="" draggable={false} data-part="top" />
    </span>
  )
}
