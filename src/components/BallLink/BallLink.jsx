import { hop } from '../../lib/journey/openBall.js'
import { getBall } from '../../lib/journey/state.js'
import Link from '../../router/Link.jsx'
import MenuCursor from '../MenuCursor/MenuCursor.jsx'
import PixelSprite from '../PixelSprite/PixelSprite.jsx'
import { GUIDE_TYPES } from '../PixelSprite/sprites.js'
import PokeBall from '../PokeBall/PokeBall.jsx'
import styles from './BallLink.module.css'

/**
 * v4 hero slot: "▶ Label" over the square the rail's Poké Ball sits on while the hero is in
 * view (useJourneyScroll). A faint ghost ball and the label dim as the ball leaves (--leave).
 *
 * With fan art on, the starter stands out of its ball at the top of the page: the slot holds
 * the Pokémon and the flash, and the rail ball over it stays hidden ([data-in] on the slot is
 * set once it has gone back in). As the page scrolls, useJourneyScroll plays the opening in
 * reverse (closeBall) and the closed ball glides to the rail; back at the top it opens again.
 *
 * A click is an ordinary journey link (v4.5): the starter, or its ball, hops to acknowledge
 * it, then the ball rides into the rail with the page glide, and on arrival the section's
 * regular intro throws it from the rail to the header and opens it (src/lib/journey/intros.js).
 */
export default function BallLink({ page, fanArt }) {
  const guide = fanArt && page.guide ? page.guide : null
  const type = guide ? GUIDE_TYPES[guide] : 'normal'

  const hover = (on) => () => getBall(page.id)?.toggleAttribute('data-hover', on)

  function onClick(event) {
    const ball = getBall(page.id)
    ball?.removeAttribute('data-hover')
    const slot = event.currentTarget.querySelector('[data-ball-slot]')
    const starterOut = guide && !slot?.hasAttribute('data-in')
    hop(starterOut ? slot.querySelector('[data-part="pokemon"]') : ball?.querySelector('[data-part="ball"]'), 10)
  }

  return (
    <Link
      href={page.href}
      className={styles.link}
      data-type={type}
      onClick={onClick}
      onMouseEnter={hover(true)}
      onMouseLeave={hover(false)}
      onFocus={hover(true)}
      onBlur={hover(false)}
    >
      <span className={styles.slot} data-ball-slot={page.id} aria-hidden="true">
        {fanArt ? <PokeBall className={styles.ghost} /> : <PixelSprite name="egg" className={styles.ghost} />}
        {guide && (
          <>
            <span className={styles.flash} data-part="flash" />
            <span className={styles.pokemon} data-part="pokemon">
              <PixelSprite name={guide} className={styles.pokemonImg} />
            </span>
          </>
        )}
      </span>
      <span className={styles.label} data-leave-label="">
        <MenuCursor className={styles.cursor} />
        <span className={styles.labelText}>{page.label}</span>
      </span>
    </Link>
  )
}
