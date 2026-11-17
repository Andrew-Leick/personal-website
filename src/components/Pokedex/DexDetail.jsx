import { formatDexNumber } from '../../lib/content/index.js'
import DateRange from '../DateRange/DateRange.jsx'
import ExternalLink from '../ExternalLink/ExternalLink.jsx'
import Icon from '../Icon/Icon.jsx'
import { ContextLine, LINK_LABELS } from '../Projects/ProjectCard.jsx'
import p from '../Projects/Projects.module.css'
import TagList from '../Tag/Tag.jsx'
import styles from './Pokedex.module.css'

/**
 * One Pokédex entry's details (V5-16): the showcase, and each entry in print. `headingId`
 * makes the name a focus target (the showcase moves focus there on every step).
 */
export default function DexDetail({ entry, headingLevel = 3, headingId }) {
  const Title = `h${headingLevel}`
  const linkItems = LINK_LABELS.filter(([key]) => entry.links?.[key])

  return (
    <div className={styles.detail} data-print="avoid-break">
      <p className={styles.number}>{formatDexNumber(entry.number)}</p>
      <Title id={headingId} tabIndex={headingId ? -1 : undefined} className={p.title}>
        {entry.name}
      </Title>

      {entry.kind === 'work' ? (
        entry.subtitle && (
          <p className={styles.sub}>
            {entry.subtitleUrl ? <ExternalLink href={entry.subtitleUrl}>{entry.subtitle}</ExternalLink> : entry.subtitle}
          </p>
        )
      ) : (
        <ContextLine project={{ contextLabel: entry.subtitle, githubStats: entry.githubStats }} />
      )}

      {entry.dateLabel && (
        <p className={styles.sub}>
          <DateRange label={entry.dateLabel} start={entry.start} end={entry.end} />
        </p>
      )}

      <p className={p.badges}>
        <span className={`${p.status} ${styles.type}`} data-kind={entry.kind}>
          {entry.typeLabel}
        </span>
        {entry.tagLabel && <span className={p.status}>{entry.tagLabel}</span>}
        {entry.featured && <span className={p.featured}>Featured</span>}
      </p>

      {/* The Pokédex description (SPEC-v6 P-06): one flavor line in the games' voice. */}
      {entry.dexText && <p className={styles.flavor}>{entry.dexText}</p>}

      {entry.summary && <p className={p.summary}>{entry.summary}</p>}

      {entry.role && (
        <p className={p.role}>
          <span className={p.roleLabel}>Role</span> {entry.role}
        </p>
      )}

      {entry.highlights.length > 0 && (
        <ul className={p.highlights}>
          {entry.highlights.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}

      <TagList items={entry.technologies} label="Technologies" />

      {linkItems.length > 0 && (
        <ul className={p.links} aria-label={`${entry.name} links`}>
          {linkItems.map(([key, label, icon]) => (
            <li key={key}>
              <ExternalLink href={entry.links[key]} className={p.link} showIcon={false}>
                <Icon name={icon} />
                <span>
                  {label}
                  <span className="visually-hidden"> for {entry.name}</span>
                </span>
              </ExternalLink>
            </li>
          ))}
        </ul>
      )}

      {entry.image && (
        <img
          className={p.image}
          src={entry.image.src}
          alt={entry.image.alt}
          width="1200"
          height="675"
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  )
}
