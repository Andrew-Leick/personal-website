import PixelSprite from '../PixelSprite/PixelSprite.jsx'
import styles from './DialogBox.module.css'

/**
 * Pokémon-style dialog box (global .pixel-dialog recipe). `as` picks the
 * element (default "div"); `more` adds the decorative bobbing "▼".
 * Other props (aria-labelledby, id, ...) pass through.
 */
export default function DialogBox({ as: Tag = 'div', more = false, className, children, ...rest }) {
  const cls = ['pixel-dialog', styles.box, className].filter(Boolean).join(' ')
  return (
    <Tag className={cls} {...rest}>
      {children}
      {more && <PixelSprite name="more" className={styles.more} />}
    </Tag>
  )
}
