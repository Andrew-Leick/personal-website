import PixelSprite from '../PixelSprite/PixelSprite.jsx'
import styles from './About.module.css'

/**
 * About paragraphs plus optional "Currently" and "Availability" lines. A photo shows first when
 * set; otherwise the pixel trainer (profile.avatar, SPEC-v6 P-05) stands beside the text. The
 * trainer is fan art (based on a Gen 4 trainer sprite), so like the Pokémon it needs site.fanArt.
 */
export default function About({ profile, fanArt = true }) {
  const paragraphs = profile?.about ?? []
  if (paragraphs.length === 0 && !profile?.currently) return null
  const avatar = !profile.photo && fanArt && profile.avatar ? profile.avatar : null
  return (
    <div className={avatar ? `${styles.about} ${styles.withAvatar}` : styles.about}>
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
      {avatar && <PixelSprite name={avatar} className={styles.avatar} />}
      <div className={styles.text}>
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
    </div>
  )
}
