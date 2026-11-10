import { closeBall, OPEN_HANDOFF, openBall } from '../../lib/journey/openBall.js'
import { openedFromHero } from '../../lib/journey/intros.js'
import { getBall, onNextGlideEnd } from '../../lib/journey/state.js'
import Link from '../../router/Link.jsx'
import MenuCursor from '../MenuCursor/MenuCursor.jsx'
import PixelSprite from '../PixelSprite/PixelSprite.jsx'
import { BALL_SPRITE, GUIDE_TYPES } from '../PixelSprite/sprites.js'
import styles from './BallLink.module.css'

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

/**
 * v4 hero slot: "▶ Label" over the square the rail's Poké Ball sits on while the hero is in
 * view (useJourneyScroll). A faint ghost ball and the label dim as the ball leaves (--leave).
 * A plain click opens that ball and hands over to the page glide at the flash, so the rest
 * of the opening plays while the page moves. On arrival the Pokémon is shown in the section
 * header instead (src/lib/journey/intros.js).
 */
export default function BallLink({ page, fanArt }) {
  const guide = fanArt && page.guide ? page.guide : null
  const type = guide ? GUIDE_TYPES[guide] : 'normal'

  function beforeNavigate() {
    if (!guide) return undefined
    const ball = getBall(page.id)
    if (!ball || ball.closest('[data-docked]')) return undefined
    openedFromHero(page.id)
    const opened = openBall(ball)
    // On arrival the Pokémon moves to the section header and the ball is out (its rail slot
    // becomes a dot), so the ball stays hidden. A cancelled glide brings the ball back.
    onNextGlideEnd(({ cancelled }) => opened.then(() => closeBall(ball, { keepBallHidden: !cancelled })))
    return wait(OPEN_HANDOFF)
  }

  const hover = (on) => () => getBall(page.id)?.toggleAttribute('data-hover', on)

  return (
    <Link
      href={page.href}
      className={styles.link}
      data-type={type}
      beforeNavigate={beforeNavigate}
      onMouseEnter={hover(true)}
      onMouseLeave={hover(false)}
      onFocus={hover(true)}
      onBlur={hover(false)}
    >
      <span className={styles.slot} data-ball-slot={page.id} aria-hidden="true">
        <PixelSprite name={fanArt ? BALL_SPRITE : 'egg'} className={styles.ghost} />
      </span>
      <span className={styles.label}>
        <MenuCursor className={styles.cursor} />
        <span className={styles.labelText}>{page.label}</span>
      </span>
    </Link>
  )
}
