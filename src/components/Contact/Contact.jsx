import { useEffect, useRef, useState } from 'react'
import Icon from '../Icon/Icon.jsx'
import { LinkList } from '../LinkButton/LinkButton.jsx'
import ResumeLink from '../ResumeLink/ResumeLink.jsx'
import styles from './Contact.module.css'

const RESET_MS = 2000

/** Copies `text` to the clipboard; resolves true on success, false otherwise. */
async function copyToClipboard(text) {
  try {
    if (!navigator.clipboard?.writeText) return false
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * Contact blurb, email (mailto + copy button with live announcement), all
 * links, and the resume button (REQ-874).
 */
export default function Contact({ profile, links }) {
  const [status, setStatus] = useState('idle') // idle | copied | failed
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function handleCopy() {
    const ok = await copyToClipboard(profile.email)
    setStatus(ok ? 'copied' : 'failed')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setStatus('idle'), RESET_MS)
  }

  const buttonText = status === 'copied' ? 'Copied' : status === 'failed' ? 'Copy failed' : 'Copy email'
  const announcement =
    status === 'copied' ? 'Email copied' : status === 'failed' ? 'Copy failed. Use the email link instead.' : ''

  return (
    <div className={styles.contact}>
      {profile.contactBlurb && <p className={styles.blurb}>{profile.contactBlurb}</p>}

      {profile.email && (
        <div className={styles.emailRow}>
          <a className={styles.email} href={`mailto:${profile.email}`}>
            {profile.email}
          </a>
          <button type="button" className={`pixel-button ${styles.copy}`} onClick={handleCopy} data-print="hide">
            <Icon name="copy" />
            <span>{buttonText}</span>
          </button>
        </div>
      )}
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      <div className={styles.actions}>
        <ResumeLink href={profile.resumeUrl} />
        <LinkList links={links} variant="outline" label="Profiles and contact links" />
      </div>
    </div>
  )
}
