import ExternalLink from '../ExternalLink/ExternalLink.jsx'
import Icon from '../Icon/Icon.jsx'
import styles from './ResumeLink.module.css'

/**
 * "Resume (PDF)" link, opening the PDF in a new tab (v1 REQ-011, REQ-090).
 * variant "button": primary 44px button (Home hero, About contact);
 * variant "text": plain text link (footer). Renders nothing without a URL.
 */
export default function ResumeLink({ href, variant = 'button' }) {
  if (!href) return null
  if (variant === 'text') {
    return (
      <ExternalLink href={href} newTab className={styles.text}>
        Resume (PDF)
      </ExternalLink>
    )
  }
  return (
    <ExternalLink href={href} newTab className={`pixel-button ${styles.button}`} iconClassName={styles.external}>
      <Icon name="file" />
      <span>Resume (PDF)</span>
    </ExternalLink>
  )
}
