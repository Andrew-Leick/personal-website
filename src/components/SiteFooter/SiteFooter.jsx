import { LinkList } from '../LinkButton/LinkButton.jsx'
import Nav from '../Nav/Nav.jsx'
import ResumeLink from '../ResumeLink/ResumeLink.jsx'
import styles from './SiteFooter.module.css'

// Evaluated once at load: the year cannot change during a page view that matters.
const YEAR = new Date().getFullYear()

const DISCLAIMER =
  'Pokémon, Charmander, Bulbasaur and Squirtle are trademarks of Nintendo, Creatures Inc. and GAME FREAK inc. The pixel sprites here are original fan art made for this non-commercial site, which is not affiliated with or endorsed by them.'

/**
 * Footer on every page (REQ-843): footer nav (Home + pages), contact links,
 * resume text link, copyright, back to top.
 */
export default function SiteFooter({ name, navItems, currentId, links, resumeUrl, fanArt }) {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <Nav label="Footer" items={navItems} currentId={currentId} variant="footer" />
        <div className={styles.row}>
          <LinkList links={links} variant="plain" label="Contact links" />
          <ResumeLink href={resumeUrl} variant="text" />
        </div>
        <div className={styles.row}>
          <p className={styles.copy}>
            © {YEAR} {name}
          </p>
          <a href="#top" className={styles.top} data-print="hide">
            Back to top
          </a>
        </div>
        <p className={styles.fine}>Fonts: Press Start 2P and Pixelify Sans (SIL Open Font License).</p>
        {fanArt && <p className={styles.fine}>{DISCLAIMER}</p>}
      </div>
    </footer>
  )
}
