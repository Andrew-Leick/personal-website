import ExternalLink from '../ExternalLink/ExternalLink.jsx'
import Icon from '../Icon/Icon.jsx'
import TagList from '../Tag/Tag.jsx'
import styles from './Projects.module.css'

const MAX_CARD_HIGHLIGHTS = 4

const LINK_LABELS = [
  ['repo', 'Code', 'github'],
  ['demo', 'Live demo', 'external'],
  ['writeup', 'Write-up', 'file'],
]

/** Context line: backend contextLabel plus GitHub stars/language when present. */
function ContextLine({ project }) {
  const stats = project.githubStats
  const parts = []
  if (project.contextLabel) parts.push(<span key="context">{project.contextLabel}</span>)
  if (stats && stats.stars > 0) {
    parts.push(
      <span key="stars">
        <span aria-hidden="true">★</span>
        <span className="visually-hidden">GitHub stars:</span> {stats.stars}
      </span>,
    )
  }
  if (stats?.language) parts.push(<span key="lang">{stats.language}</span>)
  if (parts.length === 0) return null
  return (
    <p className={styles.context}>
      {parts.map((part, i) => (
        <span key={part.key}>
          {i > 0 && ' · '}
          {part}
        </span>
      ))}
    </p>
  )
}

/**
 * One project. The card itself is not a link: the title and each link in the
 * link row are separate anchors (no nesting).
 */
export default function ProjectCard({ project, headingLevel = 3 }) {
  const Title = `h${headingLevel}`
  const highlights = project.highlights.slice(0, MAX_CARD_HIGHLIGHTS)
  const linkItems = LINK_LABELS.filter(([key]) => project.links[key])
  const hasBadges = project.featured || project.statusLabel

  return (
    <article className={`pixel-dialog ${styles.card}`} aria-labelledby={`project-${project.id}-title`}>
      {project.image && (
        <img
          className={styles.image}
          src={project.image.src}
          alt={project.image.alt}
          width="1200"
          height="675"
          loading="lazy"
          decoding="async"
        />
      )}

      <Title id={`project-${project.id}-title`} className={styles.title}>
        {project.primaryUrl ? (
          <ExternalLink href={project.primaryUrl}>{project.title}</ExternalLink>
        ) : (
          project.title
        )}
      </Title>

      {hasBadges && (
        <p className={styles.badges}>
          {project.featured && <span className={styles.featured}>Featured</span>}
          {project.statusLabel && <span className={styles.status}>{project.statusLabel}</span>}
        </p>
      )}

      <ContextLine project={project} />

      <p className={styles.summary}>{project.summary}</p>

      {project.role && (
        <p className={styles.role}>
          <span className={styles.roleLabel}>Role</span> {project.role}
        </p>
      )}

      {highlights.length > 0 && (
        <ul className={styles.highlights}>
          {highlights.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}

      <TagList items={project.technologies} label="Technologies" />

      {linkItems.length > 0 && (
        <ul className={styles.links} aria-label={`${project.title} links`}>
          {linkItems.map(([key, label, icon]) => (
            <li key={key}>
              <ExternalLink href={project.links[key]} className={styles.link} showIcon={false}>
                <Icon name={icon} />
                <span>
                  {label}
                  <span className="visually-hidden"> for {project.title}</span>
                </span>
              </ExternalLink>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
