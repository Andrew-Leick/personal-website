import { useEffect, useState } from 'react'
import { formatDexNumber } from '../../lib/content/index.js'
import { prefersReducedMotion } from '../../lib/motion.js'
import useRoute from '../../router/useRoute.js'
import PixelSprite from '../PixelSprite/PixelSprite.jsx'
import DexDetail from './DexDetail.jsx'
import styles from './Pokedex.module.css'

/** The two dexes the start screen offers, in order, and the content list each one reads. */
const DEXES = { experience: 'work', projects: 'projects' }
const LABELS = { experience: 'Experience', projects: 'Projects' }
const HASH = '#pokedex-'

/**
 * The Pokédex (SPEC-v5.1): it starts closed; Open swings the lid and shows the start screen
 * (Experience or Projects); a dex is a grid of Pokémon, one per entry; a Pokémon opens that
 * entry's showcase. A back key steps up a level, and the showcase has previous and next.
 * Focus moves to the new screen's heading on every step the reader takes, never on load.
 */
export default function Pokedex({ dex, fanArt, headingLevel = 3 }) {
  const views = Object.keys(DEXES).filter((v) => dex[DEXES[v]].length > 0)
  const [screen, setScreen] = useState('closed') // 'closed' | 'start' | a view
  const [entry, setEntry] = useState(null) // index of the open entry in the view, or null
  const [lid, setLid] = useState(false) // the lid is swinging open
  const [focusTo, setFocusTo] = useState(null) // { id } of the element to focus after a step
  const { nav } = useRoute()

  // #pokedex-{view} (load, in-page links, back/forward) opens that dex directly, lid already open.
  // Applied once per navigation while rendering (React's "adjust state on prop change").
  const [seenNav, setSeenNav] = useState(null)
  if (seenNav !== nav.id) {
    setSeenNav(nav.id)
    const v = nav.hash.startsWith(HASH) ? nav.hash.slice(HASH.length) : null
    if (views.includes(v)) {
      setScreen(v)
      setEntry(null)
    }
  }

  useEffect(() => {
    if (focusTo) document.getElementById(focusTo.id)?.focus()
  }, [focusTo])

  if (views.length === 0) return null

  function go(nextScreen, nextEntry = null, focus = `pokedex-${nextEntry === null ? nextScreen : 'entry'}-heading`) {
    setFocusTo({ id: focus })
    setScreen(nextScreen)
    setEntry(nextEntry)
  }

  const Heading = `h${headingLevel}`
  const list = DEXES[screen] ? dex[DEXES[screen]] : []
  const shown = entry === null ? null : list[entry]
  const sprite = (e) => (fanArt && e.pokemon) || 'egg'
  const label = (e) => (e.kind === 'work' ? `${e.subtitle} ${e.start.slice(0, 4)}` : e.name)
  const key = (text, onClick, props) => (
    <button type="button" className={styles.key} onClick={onClick} {...props}>
      {text}
    </button>
  )

  let bar
  let body
  if (screen === 'start') {
    bar = key('Close', () => go('closed', null, 'pokedex-open'))
    body = (
      <>
        <Heading id="pokedex-start-heading" tabIndex={-1} className={styles.heading}>
          What would you like to see?
        </Heading>
        <ul className={styles.choices}>
          {views.map((v) => (
            <li key={v}>
              {key(
                <>
                  {LABELS[v]} <span className={styles.count}>{dex[DEXES[v]].length}</span>
                </>,
                () => go(v),
                { id: `pokedex-pick-${v}` },
              )}
            </li>
          ))}
        </ul>
      </>
    )
  } else if (shown) {
    bar = (
      <>
        {key(<><span aria-hidden="true">◀ </span>{LABELS[screen]}</>, () => go(screen, null, `pokedex-tile-${entry}`))}
        <span className={styles.step}>
          {key(<><span aria-hidden="true">◀ </span>Previous</>, () => go(screen, entry - 1), { disabled: entry === 0 })}
          {key(<>Next<span aria-hidden="true"> ▶</span></>, () => go(screen, entry + 1), { disabled: entry === list.length - 1 })}
        </span>
      </>
    )
    body = (
      <div className={styles.showcase}>
        <div className={styles.stage}>
          <PixelSprite name={sprite(shown)} className={styles.bigSprite} />
        </div>
        <DexDetail entry={shown} headingLevel={headingLevel} headingId="pokedex-entry-heading" />
      </div>
    )
  } else if (list.length > 0) {
    bar = key(<><span aria-hidden="true">◀ </span>Menu</>, () => go('start', null, `pokedex-pick-${screen}`))
    body = (
      <>
        <Heading id={`pokedex-${screen}-heading`} tabIndex={-1} className={styles.heading}>
          {LABELS[screen]}
        </Heading>
        <ul className={styles.grid}>
          {list.map((e, i) => (
            <li key={e.key}>
              <button
                type="button"
                id={`pokedex-tile-${i}`}
                className={styles.tile}
                onClick={() => go(screen, i)}
                // Starts with the visible text and adds the role or context line. An aria-label,
                // not hidden text: Chrome puts a space before out-of-flow text ("2026 , Role").
                aria-label={[`${formatDexNumber(e.number)} ${label(e)}`, e.kind === 'work' ? e.name : e.subtitle].filter(Boolean).join(', ')}
              >
                <PixelSprite name={sprite(e)} className={styles.sprite} />
                <span className={styles.number}>{formatDexNumber(e.number)}</span>
                <span className={styles.label}>{label(e)}</span>
              </button>
            </li>
          ))}
        </ul>
      </>
    )
  }

  return (
    <div className={styles.dex} id="pokedex">
      <p className={styles.title}>{fanArt ? 'Pokédex' : 'Index'}</p>
      {screen === 'closed' ? (
        <div className={styles.cover}>
          {key(fanArt ? 'Open Pokédex' : 'Open index', () => {
            // No lid at all under reduced motion: its animation would never run to remove it.
            setLid(!prefersReducedMotion())
            go('start')
          }, { id: 'pokedex-open' })}
        </div>
      ) : (
        <div className={styles.screen} id={DEXES[screen] ? `pokedex-${screen}` : undefined} data-print="hide">
          {lid && <span className={styles.lid} aria-hidden="true" onAnimationEnd={() => setLid(false)} />}
          <div className={styles.bar}>{bar}</div>
          {body}
        </div>
      )}
      {/* Print shows every entry of both dexes, under their dex's name, whatever screen is open. */}
      <div className={styles.print} hidden>
        {views.map((v) => (
          <section key={v} className={styles.print}>
            <Heading className={styles.heading}>{LABELS[v]}</Heading>
            {dex[DEXES[v]].map((e) => (
              <DexDetail key={e.key} entry={e} headingLevel={headingLevel + 1} />
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
