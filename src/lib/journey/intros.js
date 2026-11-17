// Section intros (spec v4.3, v4.4, v4.9). A heading's ball is "out" exactly while its slot is
// on screen. Driven every frame by the scroll engine (useJourneyScroll), through tickIntros():
//
//   - A waiting heading whose slot comes into view gets its rail ball thrown to it in that same
//     frame: the ball arcs over, opens, and the Pokémon appears. The rail slot shows a dot
//     meanwhile. The dashed ring marks the slot only while the ball is out of the rail (rail.js
//     markOut sets [data-out] on the slot with the rail link), so a visible ring always comes
//     with its throw, and never sits beside a ball resting in the rail (V4-57, V4-59).
//   - A heading whose slot leaves the view sends its ball home (at once off screen, or turning
//     a ball still in the air around).
//
// Several balls can be out at once (two headings on screen on tall or narrow screens). During a
// link glide nothing is thrown or recalled; the page settles when the glide ends.
//
// Each section has a phase (home → throwing → out → returning → home) and a generation number:
// every async step checks it, so a quick scroll back and forth cancels a half-finished
// sequence cleanly. The one ball in the air per section is tracked as `flight`, so a reversal
// turns it around instead of restarting.

import { prefersReducedMotion } from '../motion.js'
import { cancelAnimations, nextPaint, part, settled } from './anim.js'
import { OPEN_POP_AT, openBall, resetBall } from './openBall.js'
import { recall, resetRail, sendOut } from './rail.js'
import { getBall, isAutoScrolling } from './state.js'
import { throwBall } from './throwBall.js'

const RECALL_MS = 200

let ctl = null

const extras = (s) => [part(s.heading, 'underline'), part(s.heading, 'label')]
// The title's pending offset points away from the slot (toward the trailing edge), so it never
// crowds the slot (or its landing ring); it mirrors in RTL. Matches .title[data-pending] .label in the CSS.
const labelShift = (label) => `translateX(${getComputedStyle(label).direction === 'rtl' ? -16 : 16}px)`
const isOut = (s) => s.phase === 'out' || s.phase === 'throwing'

function cancelAll(s) {
  resetBall(s.intro)
  extras(s).forEach(cancelAnimations)
}

/** Header shows the Pokémon, full underline and title (the resting state). */
function showHeader(s) {
  cancelAll(s)
  s.heading.removeAttribute('data-pending')
  s.heading.removeAttribute('data-landed')
}

/** Header back to the waiting slot (data-pending), or to rest when the intros stop. */
function clearHeader(s, pending = true) {
  cancelAll(s)
  s.heading.removeAttribute('data-landed')
  s.heading.toggleAttribute('data-pending', pending)
}

/**
 * The bottom of what the reader can see: the top of the phone dock once it is solid (< 768px,
 * after the hero glide), else the window's. A slot behind the solid dock is not seen; behind a
 * dock still fading in, it is.
 */
function visibleBottom() {
  const dock = document.querySelector('[data-rail-dock]')
  if (dock) {
    const style = getComputedStyle(dock)
    if (style.display !== 'none' && Number.parseFloat(style.opacity || '1') >= 0.99) return dock.getBoundingClientRect().top
  }
  return window.innerHeight
}

/** Any part of the heading's ball slot (where the ring is drawn) is on screen. */
function slotVisible(s) {
  const r = s.intro.getBoundingClientRect()
  return r.height > 0 && r.bottom > 0 && r.top < visibleBottom()
}

function headingOnScreen(s) {
  const r = s.heading.getBoundingClientRect()
  return r.bottom > 0 && r.top < window.innerHeight
}

/** A ball of this section still in the air (null once it lands). */
function inFlight(s) {
  return s.flight?.copy?.isConnected ? s.flight : null
}

async function track(s, flight) {
  s.flight = flight
  await flight
  if (s.flight === flight) s.flight = null
}

/** Starts a new step for `s`; the returned check is false once anything newer has started. */
function step(s, phase) {
  const gen = ++s.gen
  s.phase = phase
  return () => ctl !== null && s.gen === gen
}

async function throwOut(s) {
  const alive = step(s, 'throwing')
  clearHeader(s)
  // A recall still in the air turns around toward the header; otherwise throw from the rail.
  // The throw measures its start first, then the rail slot turns into a dot.
  const previous = inFlight(s)
  const flight = throwBall(previous ? previous.copy : getBall(s.id), part(s.intro, 'ball'), () => {
    if (alive()) s.heading.setAttribute('data-landed', '')
  })
  previous?.abort()
  // Marks the rail link and this heading's slot together: the slot's dashed ring shows from this
  // frame until the ball lands (spec v4.9).
  sendOut(s.id)
  await track(s, flight)
  if (!alive()) return
  // Let the landed ball paint once, closed, before the lid starts to swing. Revealing it and
  // starting the lid's (GPU) animation in the same frame could leave the lid undrawn.
  await nextPaint()
  if (!alive()) return
  const [underline, label] = extras(s)
  const timing = { delay: OPEN_POP_AT, fill: 'both' }
  await Promise.all([
    openBall(s.intro),
    settled([
      underline?.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { ...timing, duration: 320, easing: 'steps(8, end)' }),
      label?.animate(
        [{ transform: labelShift(label) }, { transform: 'none' }],
        { ...timing, duration: 200, easing: 'steps(4, end)' },
      ),
    ]),
  ])
  if (!alive()) return
  showHeader(s)
  s.phase = 'out'
}

async function goHome(s) {
  const alive = step(s, 'returning')
  // A send-out still in the air turns around and flies home.
  const previous = inFlight(s)
  if (previous) {
    clearHeader(s)
    const flight = throwBall(previous.copy, getBall(s.id), () => {
      if (alive()) recall(s.id)
    })
    previous.abort()
    await track(s, flight)
    if (alive()) s.phase = 'home'
    return
  }
  if (!headingOnScreen(s) || prefersReducedMotion()) {
    clearHeader(s)
    recall(s.id)
    s.phase = 'home'
    return
  }
  // On screen: the Pokémon goes back in and the underline retracts, then the ball flies home.
  if (!s.heading.hasAttribute('data-pending')) {
    cancelAll(s)
    const [underline, label] = extras(s)
    const timing = { duration: RECALL_MS, easing: 'steps(4, end)', fill: 'forwards' }
    await settled([
      part(s.intro, 'pokemon')?.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0)', opacity: 0 }], timing),
      underline?.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], timing),
      label?.animate([{ transform: 'none' }, { transform: labelShift(label) }], timing),
    ])
    if (!alive()) return
  }
  clearHeader(s)
  await track(
    s,
    throwBall(part(s.intro, 'ball'), getBall(s.id), () => {
      if (alive()) recall(s.id)
    }),
  )
  if (alive()) s.phase = 'home'
}

/** Start the intros for these page ids (idempotent). Every header starts empty. */
export function startIntros(ids) {
  if (ctl) return
  const sections = new Map()
  for (const id of ids) {
    const intro = document.querySelector(`[data-intro="${id}"]`)
    const heading = intro?.closest('h2')
    if (!intro || !heading) continue
    heading.setAttribute('data-pending', '')
    sections.set(id, { id, intro, heading, phase: 'home', gen: 0, flight: null })
  }
  ctl = { sections, current: null }
}

/** Stop: every header back to its resting state (Pokémon shown), every ball home. */
export function stopIntros() {
  if (!ctl) return
  const { sections } = ctl
  ctl = null
  sections.forEach((s) => {
    s.gen += 1
    s.flight?.abort()
    clearHeader(s, false)
  })
  resetRail()
}

/**
 * The active section changed. Intros no longer follow it (a heading's ball is out while its slot
 * is on screen, see tickIntros); it is only recorded.
 */
export function setCurrentIntro(id) {
  if (!ctl) return
  ctl.current = id
}

/**
 * Every frame: each waiting heading whose slot is on screen gets its ball thrown now, in the frame
 * its ring would first show; each heading whose slot has left the view sends its ball home. While a
 * link glide runs, nothing moves: the sections it passes stay waiting (no ring, their balls never
 * leave the rail) and the page settles when the glide ends.
 */
export function tickIntros() {
  if (!ctl || isAutoScrolling()) return
  ctl.sections.forEach((s) => {
    const seen = slotVisible(s)
    if (seen && !isOut(s)) throwOut(s)
    else if (!seen && isOut(s)) goHome(s)
  })
}
