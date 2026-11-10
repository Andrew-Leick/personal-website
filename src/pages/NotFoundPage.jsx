import DialogBox from '../components/DialogBox/DialogBox.jsx'
import PixelSprite from '../components/PixelSprite/PixelSprite.jsx'
import Link from '../router/Link.jsx'
import styles from './Page.module.css'

/** Not found (REQ-875): h1, one sentence, links to Home and every page. */
export default function NotFoundPage({ navItems }) {
  return (
    <article aria-labelledby="page-heading" className={`container ${styles.page}`}>
      <h1 id="page-heading" tabIndex={-1} className={styles.title}>
        Page not found
      </h1>
      <DialogBox className={styles.notice}>
        <PixelSprite name="egg" className={styles.noticeSprite} />
        <p className={styles.text}>A wild 404 appeared! There is no page at this address.</p>
      </DialogBox>
      <ul className={styles.links} aria-label="Pages on this site">
        {navItems.map((item) => (
          <li key={item.id}>
            <Link href={item.href}>{item.label}</Link>
          </li>
        ))}
      </ul>
    </article>
  )
}
