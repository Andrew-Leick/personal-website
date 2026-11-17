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
      <Icon name={isDark ? 'sun' : 'moon'} />
    </button>
  )
}
