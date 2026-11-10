import ExternalLink from '../ExternalLink/ExternalLink.jsx'
import Icon from '../Icon/Icon.jsx'
import { iconForLinkKind } from '../Icon/iconForLinkKind.js'
import styles from './LinkButton.module.css'

/**
 * A profile link (GitHub, LinkedIn, email, ...) as icon + text.
 * - variant "outline": 44px bordered button (hero, contact);
 * - variant "plain": inline icon + text link (footer).
 * `compact` hides the visible text below 480px (icon only); the accessible
 * name always comes from `aria-label` (the link's label).
 */
export default function LinkButton({ link, variant = 'outline', compact = false }) {
  const className = [styles.link, styles[variant], compact ? styles.compact : null, variant === 'outline' ? 'pixel-button' : null]
    .filter(Boolean)
    .join(' ')

  return (
    <ExternalLink
      href={link.url}
      className={className}
      ariaLabel={link.label}
      iconClassName={styles.externalIcon}
    >
      <Icon name={iconForLinkKind(link.kind)} />
      <span className={styles.label}>{link.label}</span>
    </ExternalLink>
  )
}

/** A list of LinkButtons. Renders nothing when empty. */
export function LinkList({ links, variant, compact, className, label }) {
  if (!links || links.length === 0) return null
  return (
    <ul className={className ? `${styles.list} ${className}` : styles.list} aria-label={label}>
      {links.map((link) => (
        <li key={link.id}>
          <LinkButton link={link} variant={variant} compact={compact} />
        </li>
      ))}
    </ul>
  )
}
