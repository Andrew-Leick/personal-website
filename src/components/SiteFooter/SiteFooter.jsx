import { LinkList } from '../LinkButton/LinkButton.jsx'
import styles from './SiteFooter.module.css'

// Evaluated once at load: the year cannot change during a page view that matters.
const YEAR = new Date().getFullYear()

/** Footer: copyright, links, back to top. */
export default function SiteFooter({ name, links }) {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.row}>
          <p className={styles.copy}>
            © {YEAR} {name}
          </p>
          <LinkList links={links} variant="plain" label="Footer links" />
        </div>
        <div className={styles.row}>
          <p className={styles.built}>Built with React and Vite</p>
          <a href="#top" className={styles.top} data-print="hide">
            Back to top
          </a>
        </div>
      </div>
    </footer>
  )
}
