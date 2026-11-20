import { useEffect, useState } from 'react'
import { formatDexNumber } from '../../lib/content/index.js'
import { prefersReducedMotion } from '../../lib/motion.js'
import useRoute from '../../router/useRoute.js'
import PixelSprite from '../PixelSprite/PixelSprite.jsx'
import DexDetail from './DexDetail.jsx'
import { loadProgress, record, tally } from './progress.js'
import styles from './Pokedex.module.css'

/** The two dexes the start screen offers, in order, and the content list each one reads. */
const DEXES = { experience: 'work', projects: 'projects' }
const LABELS = { experience: 'Experience', projects: 'Projects' }
const HASH = '#pokedex-'

/** How long a lid swing may take before it finishes anyway (the swings are 700ms and 600ms). */
const LID_FALLBACK_MS = 1000

/**
 * The Pokédex (SPEC-v5.1): it starts closed; Open swings the lid away and shows the start screen
 * (Experience or Projects); Close swings it shut again. A dex is a grid of Pokémon, one per
 * entry; a Pokémon opens that entry's showcase. A back key steps up a level, and the showcase has
 * previous and next. The device has a fixed tall shape: anything longer scrolls inside the screen.
 * Focus moves to the new screen's heading on every step the reader takes, never on load.
 */
export default function Pokedex({ dex, fanArt, headingLevel = 3 }) {
  const views = Object.keys(DEXES).filter((v) => dex[DEXES[v]].length > 0)
  const [screen, setScreen] = useState('closed') // 'closed' | 'start' | a view
  const [entry, setEntry] = useState(null) // index of the open entry in the view, or null
  const [lid, setLid] = useState(null) // null | 'open' (swinging away) | 'closing' (swinging shut)
  const [focusTo, setFocusTo] = useState(null) // { id } of the element to focus after a step
  // Seen and caught entries (SPEC-v6 P-07), kept across visits; completion is announced once.
  const [progress, setProgress] = useState(loadProgress)
  const [completedBy, setCompletedBy] = useState(null) // key of the entry whose catch completed the dex
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

  function go(nextScreen, nextEntry = null, focus = `pokedex-${nextEntry === null ? nextScreen : 'entry'}-heading`) {
    setFocusTo({ id: focus })
    setScreen(nextScreen)
    setEntry(nextEntry)
  }

  function finishClose() {
    setLid(null)
    go('closed', null, 'pokedex-open')
  }

  function close() {
    // Under reduced motion there is no lid, so it would never report an end: close at once.
    if (prefersReducedMotion()) finishClose()
    else setLid('closing') // a lid still opening keeps its element and turns around
  }

  /** The lid's swing ended (its transform transition; ignore the opacity one and children). */
  function onLidEnd(event) {
    if (event.target !== event.currentTarget || event.propertyName !== 'transform') return
    if (lid === 'closing') finishClose()
    else setLid(null)
  }

  // Each step starts its screen at the top (the heading leads it); going back to a tile scrolls
  // only as far as needed to show that tile.
  useEffect(() => {
    const el = focusTo && document.getElementById(focusTo.id)
    if (!el) return
    el.focus({ preventScroll: true })
    const view = el.closest('[role="region"]')
    if (el.tagName.startsWith('H') && view) view.scrollTop = 0
    else el.scrollIntoView?.({ block: 'nearest' })
  }, [focusTo])

  // An open list marks its entries seen; an open showcase catches its entry. Catching the last
  // uncaught entry completes the dex (once, ever).
  const listKeys = DEXES[screen] ? dex[DEXES[screen]].map((e) => e.key) : []
  const caughtKey = entry !== null && listKeys[entry] ? listKeys[entry] : null
  const allKeys = [...dex.work, ...dex.projects].map((e) => e.key)
  const seenSignature = listKeys.join('|')
  useEffect(() => {
    if (!seenSignature && !caughtKey) return
    setProgress((current) => {
      const { progress: next, justCompleted } = record(current, { seen: seenSignature ? seenSignature.split('|') : [], caught: caughtKey ? [caughtKey] : [] }, allKeys)
      if (justCompleted) setCompletedBy(caughtKey)
      return next
    })
    // allKeys is derived from dex, which never changes while mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seenSignature, caughtKey])

  // If a swing never reports its end (a background tab, no @starting-style support), finish anyway.
  useEffect(() => {
    if (lid === null) return undefined
    const timer = setTimeout(lid === 'closing' ? finishClose : () => setLid(null), LID_FALLBACK_MS)
    return () => clearTimeout(timer)
  })

  if (views.length === 0) return null

  const Heading = `h${headingLevel}`
  const list = DEXES[screen] ? dex[DEXES[screen]] : []
  const shown = entry === null ? null : list[entry]
  const sprite = (e) => (fanArt && e.pokemon) || 'egg'
  // Work tiles: organization and years ("FIRST Robotics 2020–2024"; one year when it starts and ends in it).
  const years = (e) => [...new Set([e.start, e.end].filter(Boolean).map((d) => d.slice(0, 4)))].join('–')
  const label = (e) => (e.kind === 'work' ? `${e.subtitle} ${years(e)}` : e.name)
  const key = (text, onClick, props) => (
    <button type="button" className={styles.key} onClick={onClick} {...props}>
      {text}
    </button>
  )

  let bar
  let body
  if (screen === 'start') {
    bar = key('Close', close, { className: `${styles.key} ${styles.close}` })
    body = (
      <>
        <Heading id="pokedex-start-heading" tabIndex={-1} className={styles.heading}>
          What would you like to see?
        </Heading>
        <Tally {...tally(progress, allKeys)} />
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
          {key(<><span aria-hidden="true">◀ </span><span className={styles.stepText}>Previous</span></>, () => go(screen, entry - 1), { disabled: entry === 0 })}
          {key(<><span className={styles.stepText}>Next</span><span aria-hidden="true"> ▶</span></>, () => go(screen, entry + 1), { disabled: entry === list.length - 1 })}
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
                {e.kind === 'work' && <span className={styles.role}>{e.name}</span>}
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
          {key('View experience and projects', () => {
            // No lid at all under reduced motion: it would never report an end.
            setLid(prefersReducedMotion() ? null : 'open')
            go('start')
          }, { id: 'pokedex-open' })}
        </div>
      ) : (
        <div className={styles.screen} id={DEXES[screen] ? `pokedex-${screen}` : undefined} data-print="hide">
          {lid && <span className={styles.lid} aria-hidden="true" data-state={lid} onTransitionEnd={onLidEnd} />}
          {/* Announces the completion once (rendered empty first, so screen readers pick the text up). */}
          <p className="visually-hidden" role="status">
            {completedBy ? `Pokédex complete! You caught all ${allKeys.length}.` : ''}
          </p>
          <div className={styles.bar} inert={lid === 'closing' || undefined}>
            {bar}
          </div>
          {/* The fixed-height screen's scrolling part: focusable so keyboard users can scroll it. */}
          <div
            className={styles.view}
            role="region"
            aria-labelledby={shown ? 'pokedex-entry-heading' : `pokedex-${screen}-heading`}
            tabIndex={0}
            inert={lid === 'closing' || undefined}
          >
            {/* A new page per step, so each screen change gets the refresh (Pokedex.module.css .page). */}
            <div key={`${screen}:${entry ?? ''}`} className={styles.page}>
              {completedBy && shown?.key === completedBy && (
                <p className={styles.complete}>
                  ★ Pokédex complete! You caught all {allKeys.length}.
                </p>
              )}
              {body}
            </div>
          </div>
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

/** The start screen's progress line: SEEN n OF N · CAUGHT n OF N (★ COMPLETE once caught all). */
function Tally({ seen, caught, total, complete }) {
  return (
    <p className={styles.tally}>
      Seen <span className={styles.count}>{seen}</span> of {total}
      <span aria-hidden="true"> · </span>
      Caught <span className={styles.count}>{caught}</span> of {total}
      {complete && (
        <>
          <span aria-hidden="true"> · </span>★ Complete
        </>
      )}
    </p>
  )
}
