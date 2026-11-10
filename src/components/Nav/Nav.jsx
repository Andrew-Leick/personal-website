import Link from '../../router/Link.jsx'
import MenuCursor from '../MenuCursor/MenuCursor.jsx'
import styles from './Nav.module.css'

/**
 * A list of page links (REQ-840 to REQ-843). Always visible: there is no menu
 * button. The current page's link gets aria-current="page" and an underline.
 * `variant` "header" spreads the links across the row on mobile; "footer" is
 * a compact wrapping list.
 */
export default function Nav({ label, items, currentId, variant = 'header' }) {
  if (!items || items.length === 0) return null
  return (
    <nav aria-label={label} className={`${styles.nav} ${styles[variant]}`} data-print="hide">
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={styles.link}
              aria-current={item.id === currentId ? 'page' : undefined}
            >
              {item.id === currentId && <MenuCursor className={styles.cursor} />}
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
