import Link from '../../router/Link.jsx'
import MenuCursor from '../MenuCursor/MenuCursor.jsx'
import PixelSprite from '../PixelSprite/PixelSprite.jsx'
import { GUIDE_NAMES, GUIDE_TYPES } from '../PixelSprite/sprites.js'
import styles from './GuideLink.module.css'

/**
 * One Home party slot: sprite + "▶ Label" + caption, all inside ONE link.
 * Accessible name: "Experience, with Charmander" (fan art on) or "Experience".
 * fanArt false or no guide -> Egg sprite, no caption, type "normal".
 */
export default function GuideLink({ page, fanArt, index }) {
  const guide = fanArt && page.guide ? page.guide : null
  const sprite = guide ?? 'egg'
  const caption = guide ? GUIDE_NAMES[guide] : null
  const type = guide ? GUIDE_TYPES[guide] : 'normal'
  return (
    <Link
      href={page.href}
      className={styles.guide}
      data-type={type}
      style={{ '--guide-delay': `calc(${index} * var(--sprite-stagger))` }}
    >
      <PixelSprite name={sprite} className={styles.sprite} />
      <span className={styles.text}>
        <span className={styles.label}>
          <MenuCursor className={styles.cursor} />
          <span className={styles.labelText}>
            {page.label}
            {caption && <span className={styles.joiner}>, with </span>}
          </span>
        </span>
        {caption && <span className={styles.caption}>{caption}</span>}
      </span>
    </Link>
  )
}
