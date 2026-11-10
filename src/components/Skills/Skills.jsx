import TagList from '../Tag/Tag.jsx'
import styles from './Skills.module.css'

/**
 * One block per skill group: group name (h2 or h3 per `headingLevel`), then
 * items as tags. No ratings.
 */
export default function Skills({ skills, headingLevel = 3 }) {
  const Title = `h${headingLevel}`
  if (!skills || skills.length === 0) return null
  return (
    <div className={styles.groups}>
      {skills.map((group) => (
        <div key={group.id} className={styles.group}>
          <Title className={styles.name}>{group.name}</Title>
          <TagList items={group.items} label={group.name} />
        </div>
      ))}
    </div>
  )
}
