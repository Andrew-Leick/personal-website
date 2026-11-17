import { forwardRef } from 'react'
import { registerBall } from '../../lib/journey/state.js'
import Link from '../../router/Link.jsx'
import PixelSprite from '../PixelSprite/PixelSprite.jsx'
import { GUIDE_TYPES } from '../PixelSprite/sprites.js'
import PokeBall from '../PokeBall/PokeBall.jsx'
import styles from './BallRail.module.css'

/**
 * v4 section rail: a fixed column of Poké Balls on the right (>= 768px) or a bottom dock.
 * These are the only ball elements on the page: while the hero is in view,
 * useJourneyScroll moves each one over its hero slot; as the hero scrolls away they glide
 * here. Until then the rail is inert, so keyboard and screen-reader users meet each
 * page link once (in the hero). With fanArt off the balls are the original egg sprite.
 * A ball that is out at its section heading shows as a dot ([data-out], src/lib/journey/rail.js).
 */
const BallRail = forwardRef(function BallRail({ pages, fanArt }, ref) {
  return (
    <nav ref={ref} aria-label="Sections" className={styles.rail} data-print="hide" inert>
      <span className={styles.dock} data-rail-dock="" aria-hidden="true" />
      <div className={styles.track} data-rail-track="" aria-hidden="true">
        <span className={styles.fill} data-rail-fill="" />
      </div>
      <ul className={styles.list}>
        {pages.map((page) => {
          const guide = fanArt && page.guide ? page.guide : null
          return (
            <li key={page.id} className={styles.item} data-type={guide ? GUIDE_TYPES[guide] : 'normal'}>
              <Link href={page.href} className={styles.link} data-rail-link={page.id}>
                <span className={styles.slot} data-rail-slot={page.id}>
                  <span
                    className={styles.mover}
                    data-rail-ball={page.id}
                    ref={(el) => registerBall(page.id, el)}
                  >
                    {fanArt ? (
                      <PokeBall className={styles.ball} />
                    ) : (
                      <span className={styles.ball} data-part="ball" aria-hidden="true">
                        <PixelSprite name="egg" className={styles.egg} />
                      </span>
                    )}
                    {guide && <span className={styles.dot} aria-hidden="true" />}
                  </span>
                </span>
                <span className={styles.tip}>{page.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
})

export default BallRail
