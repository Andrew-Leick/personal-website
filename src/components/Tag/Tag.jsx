import styles from './Tag.module.css'

/** A single tag. Render inside a <TagList>, or on its own with `as`. */
export function Tag({ children, as: Element = 'li' }) {
  return <Element className={styles.tag}>{children}</Element>
}

/** A labelled list of tags, e.g. technologies or coursework. Renders nothing when empty. */
export default function TagList({ items, label }) {
  if (!items || items.length === 0) return null
  return (
    <ul className={styles.list} aria-label={label}>
      {items.map((item, i) => (
        <Tag key={`${item}-${i}`}>{item}</Tag>
      ))}
    </ul>
  )
}
