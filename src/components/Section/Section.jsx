import MenuCursor from '../MenuCursor/MenuCursor.jsx'
import styles from './Section.module.css'

/**
 * Non-lead page section (SPEC-v2 5.6): <section aria-labelledby> with an h2
 * that can take focus from /page/#id links. No eyebrow number in v2.
 * Renders inside the page container.
 */
export default function Section({ id, label, level = 2, children }) {
  const headingId = `${id}-heading`
  const Heading = `h${level}`
  return (
    <section id={id} aria-labelledby={headingId} className={styles.section}>
      <Heading id={headingId} tabIndex={-1} className={styles.heading}>
        <MenuCursor /> {label}
      </Heading>
      {children}
    </section>
  )
}
