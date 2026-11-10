import styles from './About.module.css'

/** About paragraphs plus an optional "Currently" line. */
export default function About({ profile }) {
  const paragraphs = profile?.about ?? []
  if (paragraphs.length === 0 && !profile?.currently) return null
  return (
    <div className={styles.about}>
      {profile.photo && (
        <img
          className={styles.photo}
          src={profile.photo.src}
          alt={profile.photo.alt}
          width="160"
          height="160"
          decoding="async"
        />
      )}
      {paragraphs.map((text, i) => (
        <p key={i}>{text}</p>
      ))}
      {profile.currently && (
        <p className={styles.currently}>
          <span className={styles.label}>Currently</span> {profile.currently}
        </p>
      )}
      {profile.availability && (
        <p className={styles.currently}>
          <span className={styles.label}>Availability</span> {profile.availability}
        </p>
      )}
    </div>
  )
}
