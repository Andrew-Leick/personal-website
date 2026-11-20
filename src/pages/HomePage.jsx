import DialogBox from '../components/DialogBox/DialogBox.jsx'
import GuideLink from '../components/GuideLink/GuideLink.jsx'
import { LinkList } from '../components/LinkButton/LinkButton.jsx'
import linkStyles from '../components/LinkButton/LinkButton.module.css'
import ResumeLink from '../components/ResumeLink/ResumeLink.jsx'
import { getKartHref } from '../lib/content/index.js'
import styles from './HomePage.module.css'

/** Home (SPEC-v3 section 4): name, role, sprite guides, actions. Nothing else. */
export default function HomePage({ content }) {
  const { site, profile, links, pages } = content
  const heroLinks = links.filter((link) => link.showInHero)
  return (
    <section aria-labelledby="hero-name" className={styles.home}>
      <div className={`container ${styles.inner}`}>
        <h1 id="hero-name" tabIndex={-1} className={styles.name}>
          {profile.name}
        </h1>
        {profile.headline && <p className={styles.role}>{profile.headline}</p>}
        {pages.length > 0 && (
          <DialogBox as="nav" aria-labelledby="party-heading" className={styles.party} more>
            <h2 id="party-heading" className={styles.prompt}>
              Choose your starter
            </h2>
            <ul className={styles.partyList}>
              {pages.map((page, index) => (
                <li key={page.id}>
                  <GuideLink page={page} fanArt={site.fanArt} index={index} />
                </li>
              ))}
            </ul>
          </DialogBox>
        )}
        <div className={styles.actions}>
          <ResumeLink href={profile.resumeUrl} />
          <LinkList links={heroLinks} variant="outline" compact label="Profiles" />
          <a href={getKartHref()} className={`pixel-button ${linkStyles.link} ${linkStyles.outline}`}>
            Take the scenic route
          </a>
        </div>
      </div>
    </section>
  )
}
