import { getSiteContent } from './lib/content/index.js'
import About from './components/About/About.jsx'
import Contact from './components/Contact/Contact.jsx'
import Education from './components/Education/Education.jsx'
import Experience from './components/Experience/Experience.jsx'
import Hero from './components/Hero/Hero.jsx'
import Projects from './components/Projects/Projects.jsx'
import Section from './components/Section/Section.jsx'
import SiteFooter from './components/SiteFooter/SiteFooter.jsx'
import SiteHeader from './components/SiteHeader/SiteHeader.jsx'
import Skills from './components/Skills/Skills.jsx'
import SkipLink from './components/SkipLink/SkipLink.jsx'
import useActiveSection from './hooks/useActiveSection.js'
import useTheme from './hooks/useTheme.js'

/** Section id -> body renderer. Order and visibility come from getSections(). */
const SECTION_BODIES = {
  about: (c) => <About profile={c.profile} />,
  experience: (c) => <Experience experience={c.experience} />,
  projects: (c) => <Projects projects={c.projects} />,
  education: (c) => <Education education={c.education} />,
  skills: (c) => <Skills skills={c.skills} />,
  contact: (c) => <Contact profile={c.profile} links={c.links} />,
}

export default function App() {
  const content = getSiteContent()
  const { site, profile, links, sections } = content
  const { theme, toggleTheme } = useTheme(site.defaultTheme)
  const activeId = useActiveSection(sections.map((s) => s.id))

  return (
    <>
      <SkipLink />
      <SiteHeader
        name={profile.name}
        sections={sections}
        activeId={activeId}
        showThemeToggle={site.themeToggle}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <main id="main" tabIndex={-1}>
        <Hero profile={profile} links={links} />
        {sections.map((section) => {
          const render = SECTION_BODIES[section.id]
          if (!render) return null
          return (
            <Section key={section.id} id={section.id} label={section.label} index={section.index}>
              {render(content)}
            </Section>
          )
        })}
      </main>
      <SiteFooter name={profile.name} links={links} />
    </>
  )
}
