import MenuCursor from '../MenuCursor/MenuCursor.jsx'
import styles from './Section.module.css'

/**
 * Non-lead page section (SPEC-v2 5.6): <section aria-labelledby> with an h2
 * that can take focus from /page/#id links. No eyebrow number in v2.
 * Renders inside the page container.
 */
export default function Section({ id, label, children }) {
  const headingId = `${id}-heading`
  return (
    <section id={id} aria-labelledby={headingId} className={styles.section}>
      <h2 id={headingId} tabIndex={-1} className={styles.heading}>
        <MenuCursor /> {label}
      </h2>
      {children}
    </section>
  )
}
