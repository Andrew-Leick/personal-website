import Icon from '../Icon/Icon.jsx'
import styles from './ThemeToggle.module.css'

/**
 * 44x44 button that switches between light and dark themes. Its accessible
 * name states the action. Moon icon in light mode, sun icon in dark mode.
 * State lives in `useTheme` (called by App so theme logic runs even when the
 * toggle is turned off in site.json).
 */
export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark'
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme'

  return (
    <button
      type="button"
      className={`pixel-button ${styles.toggle}`}
      onClick={onToggle}
      aria-label={label}
      title={label}
      data-print="hide"
    >
      {/* Both icons stay mounted and cross-fade; data-theme-icon exempts them from the
          transition suppression in useTheme's applyTheme. */}
      <span className={styles.icons} aria-hidden="true">
        <span className={styles.icon} data-theme-icon="" data-shown={isDark ? undefined : ''}>
          <Icon name="moon" />
        </span>
        <span className={styles.icon} data-theme-icon="" data-shown={isDark ? '' : undefined}>
          <Icon name="sun" />
        </span>
      </span>
    </button>
  )
}
