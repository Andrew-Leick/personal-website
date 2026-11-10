import PixelSprite from '../PixelSprite/PixelSprite.jsx'
import styles from './MenuCursor.module.css'

/** The red "▶" menu cursor. Decorative. Color: --color-cursor. */
export default function MenuCursor({ className }) {
  return <PixelSprite name="cursor" className={className ? `${styles.cursor} ${className}` : styles.cursor} />
}
