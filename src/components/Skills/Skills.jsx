import TagList from '../Tag/Tag.jsx'
import styles from './Skills.module.css'

/** One block per skill group: group name (h3), then items as tags. No ratings. */
export default function Skills({ skills }) {
  if (!skills || skills.length === 0) return null
  return (
    <div className={styles.groups}>
      {skills.map((group) => (
        <div key={group.id} className={styles.group}>
          <h3 className={styles.name}>{group.name}</h3>
          <TagList items={group.items} label={group.name} />
        </div>
      ))}
    </div>
  )
}
