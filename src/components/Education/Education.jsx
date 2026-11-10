import DateRange from '../DateRange/DateRange.jsx'
import ExternalLink from '../ExternalLink/ExternalLink.jsx'
import TagList from '../Tag/Tag.jsx'
import styles from '../Timeline/Timeline.module.css'

function EducationEntry({ entry, headingLevel }) {
  const Title = `h${headingLevel}`
  const date = <DateRange label={entry.dateLabel} start={entry.start} end={entry.end} />
  // Locations are never shown on the site (CONTENT-FACTS decision), even if data has one.
  const rest = [entry.gpa ? `GPA ${entry.gpa}` : null].filter(Boolean)

  return (
    <li className={styles.entry} data-print="avoid-break">
      <p className={styles.dateColumn}>{date}</p>
      <div className={styles.body}>
        <div>
          <Title className={styles.title}>
            {entry.institutionUrl ? (
              <ExternalLink href={entry.institutionUrl}>{entry.institution}</ExternalLink>
            ) : (
              entry.institution
            )}
          </Title>
          {entry.degreeLabel && <p className={styles.sub}>{entry.degreeLabel}</p>}
        </div>

        {/* Below 1024px the date sits in this line; at 1024px+ it moves to the date column. */}
        <p className={rest.length === 0 ? `${styles.meta} ${styles.dateInline}` : styles.meta}>
          <span className={styles.dateInline}>
            {date}
            {rest.length > 0 && ' · '}
          </span>
          {rest.join(' · ')}
        </p>

        {entry.honors.length > 0 && (
          <ul className={styles.highlights} aria-label="Honors">
            {entry.honors.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        )}

        <TagList items={entry.coursework} label="Relevant coursework" />
      </div>
    </li>
  )
}

/**
 * Education list, newest first (order comes from getEducation()).
 * `headingLevel` (2 or 3) sets the entry title tag (SPEC-v2 5.6).
 */
export default function Education({ education, headingLevel = 3 }) {
  if (!education || education.length === 0) return null
  return (
    <ol className={styles.list}>
      {education.map((entry) => (
        <EducationEntry key={entry.id} entry={entry} headingLevel={headingLevel} />
      ))}
    </ol>
  )
}

