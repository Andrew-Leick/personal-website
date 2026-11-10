import PixelSprite from '../components/PixelSprite/PixelSprite.jsx'
import { GUIDE_TYPES } from '../components/PixelSprite/sprites.js'
import Section from '../components/Section/Section.jsx'
import { SECTION_BODIES } from './sectionBodies.jsx'
import styles from './Page.module.css'

/**
 * Generic subpage built from a Page (SPEC-v2 5.3 to 5.6):
 * - h1 is page.label (#page-heading, focus target after navigation);
 * - the lead section (id === page id) renders first with no heading of its
 *   own, wrapped in an element with its id; its entry titles are h2;
 * - every other section gets <section aria-labelledby> + h2; entries are h3.
 */
export default function ContentPage({ page, content }) {
  const { site } = content
  const showGuide = site.fanArt && page.guide
  const type = showGuide ? GUIDE_TYPES[page.guide] : 'normal'
  const lead = page.sections.filter((section) => section.lead)
  const rest = page.sections.filter((section) => !section.lead)

  return (
    <article aria-labelledby="page-heading" className={`container ${styles.page}`} data-type={type}>
      <h1 id="page-heading" tabIndex={-1} className={styles.title}>
        {showGuide && <PixelSprite name={page.guide} className={styles.titleSprite} />}
        <span>{page.label}</span>
      </h1>

      {lead.map((section) => {
        const render = SECTION_BODIES[section.id]
        if (!render) return null
        return (
          <div key={section.id} id={section.id} className={styles.lead}>
            {render(content, 2)}
          </div>
        )
      })}

      {rest.map((section) => {
        const render = SECTION_BODIES[section.id]
        if (!render) return null
        return (
          <Section key={section.id} id={section.id} label={section.label}>
            {render(content, 3)}
          </Section>
        )
      })}
    </article>
  )
}
