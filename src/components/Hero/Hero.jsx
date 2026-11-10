import ExternalLink from '../ExternalLink/ExternalLink.jsx'
import Icon from '../Icon/Icon.jsx'
import { LinkList } from '../LinkButton/LinkButton.jsx'
import styles from './Hero.module.css'

/**
 * Hero (#top): the page's only <h1>, headline, summary, optional
 * availability line, resume button and hero links, optional photo.
 */
export default function Hero({ profile, links }) {
  const heroLinks = (links ?? []).filter((link) => link.showInHero)
  // Locations are never shown on the site (CONTENT-FACTS decision), even if data has one.
  const metaParts = [profile.availability].filter(Boolean)

  return (
    <section id="top" aria-labelledby="top-heading" className={styles.hero}>
      <div className={`container ${styles.inner}`}>
        {profile.photo && (
          <img
            className={styles.photo}
            src={profile.photo.src}
            alt={profile.photo.alt}
            width="160"
            height="160"
            fetchPriority="high"
            decoding="async"
          />
        )}

        <div className={styles.text}>
          <h1 id="top-heading" className={styles.name}>
            {profile.name}
          </h1>
          {profile.headline && <p className={styles.headline}>{profile.headline}</p>}
          {profile.summary && <p className={styles.summary}>{profile.summary}</p>}
          {metaParts.length > 0 && <p className={styles.meta}>{metaParts.join(' · ')}</p>}

          <div className={styles.actions}>
            {profile.resumeUrl && (
              <ExternalLink
                href={profile.resumeUrl}
                newTab
                className={styles.resume}
                iconClassName={styles.resumeExternal}
              >
                <Icon name="file" />
                <span>Resume (PDF)</span>
              </ExternalLink>
            )}
            <LinkList links={heroLinks} variant="outline" compact label="Profiles" />
          </div>
        </div>
      </div>
    </section>
  )
}
