import ProjectCard from './ProjectCard.jsx'
import styles from './Projects.module.css'

/**
 * Uniform grid of project cards in getProjects() order (featured first).
 * A single project gets one column at every width (REQ-866).
 */
export default function Projects({ projects, headingLevel = 3 }) {
  if (!projects || projects.length === 0) return null
  const className = projects.length === 1 ? `${styles.grid} ${styles.single}` : styles.grid
  return (
    <ul className={className}>
      {projects.map((project) => (
        <li key={project.id} className={styles.cell}>
          <ProjectCard project={project} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  )
}
