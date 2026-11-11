import { heroBusy, heroOpen } from '../../lib/journey/intros.js'
import { getBall } from '../../lib/journey/state.js'
import Link from '../../router/Link.jsx'
import MenuCursor from '../MenuCursor/MenuCursor.jsx'
import PixelSprite from '../PixelSprite/PixelSprite.jsx'
import { BALL_SPRITE, GUIDE_TYPES } from '../PixelSprite/sprites.js'
import styles from './BallLink.module.css'

const isPlainClick = (event) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey

/**
 * v4 hero slot: "▶ Label" over the square the rail's Poké Ball sits on while the hero is in
 * view (useJourneyScroll). A faint ghost ball and the label dim as the ball leaves (--leave).
 * A plain click opens that ball (src/lib/journey/intros.js heroOpen) and hands over to the
 * page glide at the flash; its Pokémon floats above the page and lands in the section header.
 */
export default function BallLink({ page, fanArt }) {
  const guide = fanArt && page.guide ? page.guide : null
  const type = guide ? GUIDE_TYPES[guide] : 'normal'

  function beforeNavigate() {
    const ball = guide ? getBall(page.id) : null
    if (!ball || ball.closest('[data-docked]')) return undefined
    return heroOpen(page.id, ball, guide)
  }

  // A second plain click (double click, or another ball) while one is opening or gliding
  // would restart it. Modified clicks (new tab or window) keep their native behavior.
  function onClick(event) {
    if (isPlainClick(event) && heroBusy()) event.preventDefault()
  }

  const hover = (on) => () => getBall(page.id)?.toggleAttribute('data-hover', on)

  return (
    <Link
      href={page.href}
      className={styles.link}
      data-type={type}
      beforeNavigate={beforeNavigate}
      onClick={onClick}
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
