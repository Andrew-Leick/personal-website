import { openBall, resetBall } from '../../lib/journey/openBall.js'
import { getBall, markRevealed } from '../../lib/journey/state.js'
import Link from '../../router/Link.jsx'
import MenuCursor from '../MenuCursor/MenuCursor.jsx'
import { GUIDE_TYPES } from '../PixelSprite/sprites.js'
import styles from './BallLink.module.css'

/** How long the opened ball stays open while the page glides to its section. */
const SETTLE_AFTER = 1400

/**
 * v4 hero slot: "▶ Label" with an empty square the rail's Poké Ball sits on while the
 * hero is in view (useJourneyScroll). A plain click opens that ball, then navigates; the
 * section's own intro is marked as played so it does not open a second time.
 */
export default function BallLink({ page, fanArt }) {
  const guide = fanArt && page.guide ? page.guide : null
  const type = guide ? GUIDE_TYPES[guide] : 'normal'

  function beforeNavigate() {
    if (!guide) return undefined
    markRevealed(page.id)
    const ball = getBall(page.id)
    if (!ball || ball.closest('[data-docked]')) return undefined
    return openBall(ball).then(() => {
      window.setTimeout(() => resetBall(ball), SETTLE_AFTER)
    })
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
      <span className={styles.slot} data-ball-slot={page.id} aria-hidden="true" />
      <span className={styles.label}>
        <MenuCursor className={styles.cursor} />
        <span className={styles.labelText}>{page.label}</span>
      </span>
    </Link>
  )
}
