import Section from '../Section/Section.jsx'
import { SECTION_BODIES } from '../../pages/sectionBodies.jsx'
import styles from '../../pages/Page.module.css'

/**
 * The sections of one page (SPEC-v2 5.3 to 5.6), shared by ContentPage and the v4 journey.
 * - The lead section (id === page id) renders first, without a heading; its entry titles
 *   are one level below the page title (`level`).
 * - Every other section gets a heading at `level` and entries one below.
 * `level` is the page title's level + 1: 2 on a v3 subpage (h1 title), 3 in the journey (h2).
 * `leadId`: false when the parent element already carries the page id (journey sections).
 */
export default function PageSections({ page, content, level = 2, leadId = true }) {
  const lead = page.sections.filter((section) => section.lead)
  const rest = page.sections.filter((section) => !section.lead)
  return (
    <>
      {lead.map((section) => {
        const render = SECTION_BODIES[section.id]
        if (!render) return null
        return (
          <div key={section.id} id={leadId ? section.id : undefined} className={styles.lead}>
            {render(content, level)}
          </div>
        )
      })}

      {rest.map((section) => {
        const render = SECTION_BODIES[section.id]
        if (!render) return null
        return (
          <Section key={section.id} id={section.id} label={section.label} level={level}>
            {render(content, level + 1)}
          </Section>
        )
      })}
    </>
  )
}
