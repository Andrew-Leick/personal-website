import About from '../components/About/About.jsx'
import Contact from '../components/Contact/Contact.jsx'
import Education from '../components/Education/Education.jsx'
import Experience from '../components/Experience/Experience.jsx'
import Projects from '../components/Projects/Projects.jsx'
import Skills from '../components/Skills/Skills.jsx'

/**
 * Section id -> body renderer. `level` is the heading level for entry titles
 * inside the body (2 under a lead section, 3 under a section h2).
 */
export const SECTION_BODIES = {
  about: (c) => <About profile={c.profile} />,
  experience: (c, level) => <Experience experience={c.experience} headingLevel={level} />,
  projects: (c, level) => <Projects projects={c.projects} headingLevel={level} />,
  education: (c, level) => <Education education={c.education} headingLevel={level} />,
  skills: (c, level) => <Skills skills={c.skills} headingLevel={level} />,
  contact: (c) => <Contact profile={c.profile} links={c.links} />,
}
