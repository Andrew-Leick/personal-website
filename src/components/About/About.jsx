import { Suspense, lazy, useState } from 'react'
import styles from './About.module.css'

// Loaded on demand: the trainer's grid is too large for the first download (trainer.js).
const TrainerSprite = lazy(() => import('./TrainerSprite.jsx'))

/**
 * An Easter egg (SPEC-v6 P-11's hint): the trainer is a button that pops a speech bubble telling
 * how to switch on the Game Boy theme. The arrows are spelled out for screen readers.
 */
function Trainer() {
  const [open, setOpen] = useState(false)
  return (
    <div className={styles.trainer} onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}>
      <button
        type="button"
        className={styles.trainerButton}
        aria-expanded={open}
        aria-controls="trainer-tip"
        onClick={() => setOpen((on) => !on)}
      >
        {/* Until it loads, an empty box of its size holds the layout. */}
        <Suspense fallback={<span className={styles.avatar} />}>
          <TrainerSprite className={styles.avatar} />
        </Suspense>
        <span className="visually-hidden">Trainer tip</span>
      </button>
      <p id="trainer-tip" className={`pixel-dialog ${styles.bubble}`} hidden={!open}>
        Psst! On a keyboard, try:
        <kbd className={styles.code} aria-hidden="true">
          ↑↑↓↓ ←→←→ B A
        </kbd>
        <span className="visually-hidden">up, up, down, down, left, right, left, right, B, A.</span>
        Do it again to switch back.
      </p>
    </div>
  )
}

/**
 * About paragraphs plus optional "Currently" and "Availability" lines. A photo shows first when
 * set; otherwise the pixel trainer (profile.avatar, SPEC-v6 P-05) stands beside the text; clicking
 * it shows a tip. The trainer is fan art (based on a Gen 4 trainer sprite), so like the Pokémon it
 * needs site.fanArt.
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
      {avatar && <Trainer />}
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
