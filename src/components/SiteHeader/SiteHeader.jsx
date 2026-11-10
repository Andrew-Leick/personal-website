import Link from '../../router/Link.jsx'
import Nav from '../Nav/Nav.jsx'
import ThemeToggle from '../ThemeToggle/ThemeToggle.jsx'
import styles from './SiteHeader.module.css'

/**
 * Banner (REQ-840 to REQ-842). Not sticky. Name links Home; the primary nav
 * lists every page and is always visible: one row at >= 768px, a second
 * full-width row below that. No menu button.
 */
export default function SiteHeader({
  name,
  homeHref,
  pages,
  currentId,
  showThemeToggle,
  theme,
  onToggleTheme,
}) {
  return (
    <header id="top" className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link
          href={homeHref}
          className={styles.name}
          aria-current={currentId === 'home' ? 'page' : undefined}
        >
          {name}
        </Link>
        <div className={styles.nav}>
          <Nav label="Primary" items={pages} currentId={currentId} variant="header" />
        </div>
        {showThemeToggle && (
          <div className={styles.toggle}>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
        )}
      </div>
    </header>
  )
}
