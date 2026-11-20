import { useRef } from 'react'
import BallLink from '../components/BallLink/BallLink.jsx'
import BallRail from '../components/BallRail/BallRail.jsx'
import DialogBox from '../components/DialogBox/DialogBox.jsx'
import { LinkList } from '../components/LinkButton/LinkButton.jsx'
import linkStyles from '../components/LinkButton/LinkButton.module.css'
import PageSections from '../components/PageSections/PageSections.jsx'
import PixelSprite from '../components/PixelSprite/PixelSprite.jsx'
import { GUIDE_TYPES } from '../components/PixelSprite/sprites.js'
import PokeBall from '../components/PokeBall/PokeBall.jsx'
import ResumeLink from '../components/ResumeLink/ResumeLink.jsx'
import useJourneyScroll from '../hooks/useJourneyScroll.js'
import useSectionReveal from '../hooks/useSectionReveal.js'
import { getHomeHref, getKartHref } from '../lib/content/index.js'
import homeStyles from './HomePage.module.css'
import pageStyles from './Page.module.css'
import styles from './JourneyPage.module.css'

/**
 * Section title with its intro (useSectionReveal): an empty dashed slot that the rail throws
 * a Poké Ball into; it opens to reveal the page's Pokémon while the underline draws across.
 * At rest, and without JS, the Pokémon and the full underline are simply shown.
 */
function JourneySection({ page, content }) {
  const guide = content.site.fanArt && page.guide ? page.guide : null
  const headingId = `${page.id}-heading`
  return (
    <section
      id={page.id}
      aria-labelledby={headingId}
      className={`container ${pageStyles.page} ${styles.section}`}
      data-type={guide ? GUIDE_TYPES[guide] : 'normal'}
      data-journey-section=""
    >
      <h2 id={headingId} tabIndex={-1} className={`${pageStyles.title} ${styles.title}`}>
        {guide && (
          <span className={styles.intro} data-intro={page.id} aria-hidden="true">
            <span className={styles.slotRing} />
            <PokeBall className={styles.introBall} />
            <span className={styles.flash} data-part="flash" />
            <span className={styles.pokemon} data-part="pokemon">
              <PixelSprite name={guide} className={styles.pokemonImg} />
            </span>
          </span>
        )}
        <span className={styles.label} data-part="label">
          {page.label}
        </span>
        <span className={styles.underline} data-part="underline" aria-hidden="true" />
      </h2>
      <PageSections page={page} content={content} level={3} leadId={false} />
    </section>
  )
}

/**
 * v4 journey (site.layout "journey"): Home and every page as one scrolling document.
 * Every route renders this; the router scrolls to the route's section. One h1 (the name),
 * one h2 per page, then h3/h4 inside.
 */
export default function JourneyPage({ content }) {
  const { site, profile, links, pages } = content
  const railRef = useRef(null)
  useJourneyScroll({ pages, homeHref: getHomeHref(), railRef })
  useSectionReveal({ enabled: site.fanArt, pages })
  const heroLinks = links.filter((link) => link.showInHero)

  return (
    <div className={styles.journey}>
      <section aria-labelledby="hero-name" className={`${homeStyles.home} ${styles.hero}`}>
        <div className={`container ${homeStyles.inner}`}>
          <h1 id="hero-name" tabIndex={-1} className={homeStyles.name}>
            {profile.name}
          </h1>
          {profile.headline && <p className={homeStyles.role}>{profile.headline}</p>}
          {pages.length > 0 && (
            <DialogBox as="nav" aria-labelledby="party-heading" className={homeStyles.party} more>
              <h2 id="party-heading" className={homeStyles.prompt}>
                Choose your starter
              </h2>
              <ul className={homeStyles.partyList}>
                {pages.map((page) => (
                  <li key={page.id}>
                    <BallLink page={page} fanArt={site.fanArt} />
                  </li>
                ))}
              </ul>
            </DialogBox>
          )}
          <div className={homeStyles.actions}>
            <ResumeLink href={profile.resumeUrl} />
            <LinkList links={heroLinks} variant="outline" compact label="Profiles" />
            <a href={getKartHref()} className={`pixel-button ${linkStyles.link} ${linkStyles.outline}`}>
              Take the scenic route
            </a>
          </div>
        </div>
      </section>

      {pages.map((page) => (
        <JourneySection key={page.id} page={page} content={content} />
      ))}

      <BallRail ref={railRef} pages={pages} fanArt={site.fanArt} />
    </div>
  )
}
