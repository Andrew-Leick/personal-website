import styles from './Section.module.css'

/**
 * Page section wrapper: <section aria-labelledby>, mono eyebrow index
 * (decorative) and an h2 that can receive focus from nav links.
 */
export default function Section({ id, label, index, children }) {
  const headingId = `${id}-heading`
  return (
    <section id={id} aria-labelledby={headingId} className={styles.section}>
      <div className="container">
        <div className={styles.inner}>
          <p className={styles.eyebrow} aria-hidden="true">
            {index}
          </p>
          <h2 id={headingId} tabIndex={-1} className={styles.heading}>
            {label}
          </h2>
          {children}
        </div>
      </div>
    </section>
  )
}
