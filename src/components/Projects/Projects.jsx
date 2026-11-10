import ProjectCard from './ProjectCard.jsx'
import styles from './Projects.module.css'

/** Uniform grid of project cards in getProjects() order (featured first). */
export default function Projects({ projects }) {
  if (!projects || projects.length === 0) return null
  return (
    <ul className={styles.grid}>
      {projects.map((project) => (
        <li key={project.id} className={styles.cell}>
          <ProjectCard project={project} />
        </li>
      ))}
    </ul>
  )
}
