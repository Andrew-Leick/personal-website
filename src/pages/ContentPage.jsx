import PageSections from '../components/PageSections/PageSections.jsx'
import PixelSprite from '../components/PixelSprite/PixelSprite.jsx'
import { GUIDE_TYPES } from '../components/PixelSprite/sprites.js'
import styles from './Page.module.css'

/**
 * Generic subpage built from a Page (SPEC-v2 5.3 to 5.6), used when site.layout is "pages":
 * - h1 is page.label (#page-heading, focus target after navigation);
 * - sections render through PageSections (lead first, then the rest with h2 headings).
 */
export default function ContentPage({ page, content }) {
  const { site } = content
  const showGuide = site.fanArt && page.guide
  const type = showGuide ? GUIDE_TYPES[page.guide] : 'normal'

  return (
    <article aria-labelledby="page-heading" className={`container ${styles.page}`} data-type={type}>
      <h1 id="page-heading" tabIndex={-1} className={styles.title}>
        {showGuide && <PixelSprite name={page.guide} className={styles.titleSprite} />}
        <span>{page.label}</span>
      </h1>
      <PageSections page={page} content={content} level={2} />
    </article>
  )
}
