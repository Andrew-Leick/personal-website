import DialogBox from '../components/DialogBox/DialogBox.jsx'
import MenuCursor from '../components/MenuCursor/MenuCursor.jsx'
import PixelSprite from '../components/PixelSprite/PixelSprite.jsx'
import Link from '../router/Link.jsx'
import styles from './Page.module.css'

/** The battle menu's commands, in the games' order, and the page each one leads to (SPEC-v6 P-08). */
const COMMANDS = [
  ['experience', 'FIGHT'],
  ['education', 'BAG'],
  ['about', 'POKéMON'], // the games' spelling: capitals with a lowercase é
  ['home', 'RUN'],
]

/**
 * Not found (REQ-875, SPEC-v6 P-08): h1, the wild-encounter line, and a battle menu whose four
 * commands are the site's pages (FIGHT → Experience, BAG → Education, POKéMON → About, RUN → Home).
 * Each command shows its real destination under it, so the link text names both. Pages the menu
 * doesn't know keep their own label.
 */
export default function NotFoundPage({ navItems }) {
  const byId = new Map(navItems.map((item) => [item.id, item]))
  const known = COMMANDS.filter(([id]) => byId.has(id)).map(([id, command]) => ({ ...byId.get(id), command }))
  const others = navItems.filter((item) => !COMMANDS.some(([id]) => id === item.id))
  const items = [...known, ...others.map((item) => ({ ...item, command: item.label }))]

  return (
    <article aria-labelledby="page-heading" className={`container ${styles.page}`}>
      <h1 id="page-heading" tabIndex={-1} className={styles.title}>
        Page not found
      </h1>
      <DialogBox className={styles.notice}>
        <PixelSprite name="egg" className={styles.noticeSprite} />
        <p className={styles.text}>A wild 404 appeared! There is no page at this address.</p>
      </DialogBox>
      <DialogBox as="nav" aria-label="Where to?" className={styles.battle}>
        <ul className={styles.battleMenu}>
          {items.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className={styles.command}>
                <MenuCursor className={styles.commandCursor} />
                <span className={styles.commandText}>
                  <span className={styles.commandName}>{item.command}</span>
                  <span className={styles.commandPlace}>{item.label}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </DialogBox>
    </article>
  )
}
