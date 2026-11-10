import Nav from '../Nav/Nav.jsx'
import ThemeToggle from '../ThemeToggle/ThemeToggle.jsx'
import styles from './SiteHeader.module.css'

/** Sticky banner: name (link to #top), primary nav, optional theme toggle. */
export default function SiteHeader({ name, sections, activeId, showThemeToggle, theme, onToggleTheme }) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <a href="#top" className={styles.name}>
          {name}
        </a>
        <div className={styles.actions}>
          <Nav sections={sections} activeId={activeId} />
          {showThemeToggle && <ThemeToggle theme={theme} onToggle={onToggleTheme} />}
        </div>
      </div>
    </header>
  )
}
