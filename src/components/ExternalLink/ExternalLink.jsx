import Icon from '../Icon/Icon.jsx'
import { isExternalUrl } from './isExternalUrl.js'
import styles from './ExternalLink.module.css'

const NEW_TAB_TEXT = '(opens in new tab)'

/**
 * Link that applies the site link rules (spec 3.5):
 * - external http(s) links (or `newTab`) open in a new tab with
 *   rel="noopener noreferrer", an external icon and hidden "(opens in new tab)";
 * - mailto: and same-origin links stay in the same tab with no icon.
 * `showIcon={false}` hides only the visual arrow (the hidden text stays).
 * If `ariaLabel` is given it replaces the content as the accessible name,
 * so the new-tab note is appended to it.
 */
export default function ExternalLink({
  href,
  children,
  className,
  newTab = false,
  showIcon = true,
  iconClassName,
  ariaLabel,
  ...rest
}) {
  const opensNewTab = newTab || isExternalUrl(href)

  if (!opensNewTab) {
    return (
      <a href={href} className={className} aria-label={ariaLabel} {...rest}>
        {children}
      </a>
    )
  }

  return (
    <a
      href={href}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel ? `${ariaLabel} ${NEW_TAB_TEXT}` : undefined}
      {...rest}
    >
      {children}
      {showIcon && (
        <Icon
          name="external"
          className={iconClassName ? `${styles.icon} ${iconClassName}` : styles.icon}
        />
      )}
      <span className="visually-hidden"> {NEW_TAB_TEXT}</span>
    </a>
  )
}
