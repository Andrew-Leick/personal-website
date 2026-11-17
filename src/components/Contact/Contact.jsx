import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../../lib/motion.js'
import DialogBox from '../DialogBox/DialogBox.jsx'
import Icon from '../Icon/Icon.jsx'
import { LinkList } from '../LinkButton/LinkButton.jsx'
import ResumeLink from '../ResumeLink/ResumeLink.jsx'
import styles from './Contact.module.css'

const RESET_MS = 2000

/**
 * Types a line out the first time it scrolls into view (SPEC-v6 P-09): the element is clipped
 * ([data-type="wait"]) before the first paint, and revealed one step per character once at least
 * 60% of its box is on screen ([data-type="run"]). Without IntersectionObserver, or with reduced motion,
 * it is simply shown. The text is always in the DOM; only the clip changes.
 */
function useTypeOnView() {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver !== 'function' || prefersReducedMotion()) return undefined
    el.dataset.type = 'wait'
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        el.dataset.type = 'run'
        observer.disconnect()
      },
      { threshold: 0.6 },
    )
    // Watch the box around it: Chrome counts the line's own clip, so the clipped line never "intersects".
    observer.observe(el.parentElement ?? el)
    return () => {
      observer.disconnect()
      delete el.dataset.type
    }
  }, [])
  return ref
}

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
  const blurbRef = useTypeOnView()

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
      {profile.contactBlurb && (
        <DialogBox className={styles.blurbBox}>
          <p ref={blurbRef} className={styles.blurb} style={{ '--chars': profile.contactBlurb.length }}>
            {profile.contactBlurb}
          </p>
        </DialogBox>
      )}

      {profile.email && (
        <div className={styles.emailRow}>
          <a className={styles.email} href={`mailto:${profile.email}`}>
            {profile.email}
          </a>
          <button type="button" className={`pixel-button ${styles.copy}`} onClick={handleCopy} data-print="hide">
            {/* Copy and check share one cell and cross-fade (Contact.module.css .copyIcon). */}
            <span className={styles.copyIcons} aria-hidden="true">
              <span className={styles.copyIcon} data-shown={status === 'copied' ? undefined : ''}>
                <Icon name="copy" />
              </span>
              <span className={styles.copyIcon} data-shown={status === 'copied' ? '' : undefined}>
                <Icon name="check" />
              </span>
            </span>
            <span>{buttonText}</span>
          </button>
          {status === 'failed' && (
            <p className={styles.copyError} data-print="hide">
              Copy failed. Use the email link instead.
            </p>
          )}
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
