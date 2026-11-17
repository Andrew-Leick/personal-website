import DateRange from '../DateRange/DateRange.jsx'
import ExternalLink from '../ExternalLink/ExternalLink.jsx'
import TagList from '../Tag/Tag.jsx'
import styles from '../Timeline/Timeline.module.css'

function ExperienceEntry({ job, headingLevel }) {
  const Title = `h${headingLevel}`
  const date = <DateRange label={job.dateLabel} start={job.start} end={job.end} />
  // Locations are never shown on the site (CONTENT-FACTS decision), even if data has one.
  const rest = [job.employmentType].filter(Boolean)

  return (
    <li className={styles.entry} data-print="avoid-break">
      <p className={styles.dateColumn}>{date}</p>
      <div className={styles.body}>
        <div className={styles.header}>
          {/* The dot stays glued to the title (no-break space), so a wrap never starts a line with it. */}
          <Title className={styles.title}>
            {job.role}
            <span className={styles.separator} aria-hidden="true">
              {'\u00a0·'}
            </span>
          </Title>
          <p className={styles.org}>
            {job.organizationUrl ? (
              <ExternalLink href={job.organizationUrl}>{job.organization}</ExternalLink>
            ) : (
              job.organization
            )}
          </p>
        </div>

        {/* Below 1024px the date sits in this line; at 1024px+ it moves to the date column. */}
        <p className={rest.length === 0 ? `${styles.meta} ${styles.dateInline}` : styles.meta}>
          <span className={styles.dateInline}>
            {date}
            {rest.length > 0 && ' · '}
          </span>
          {rest.join(' · ')}
        </p>

        {job.summary && <p className={styles.prose}>{job.summary}</p>}

        {job.highlights.length > 0 && (
          <ul className={styles.highlights}>
            {job.highlights.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        )}

        <TagList items={job.technologies} label="Technologies" />
      </div>
    </li>
  )
}

/**
 * Experience list, newest first (order comes from getExperience()).
 * `headingLevel` (2 or 3) sets the entry title tag (SPEC-v2 5.6).
 */
export default function Experience({ experience, headingLevel = 3 }) {
  if (!experience || experience.length === 0) return null
  return (
    <ol className={styles.list}>
      {experience.map((job) => (
        <ExperienceEntry key={job.id} job={job} headingLevel={headingLevel} />
      ))}
    </ol>
  )
}

