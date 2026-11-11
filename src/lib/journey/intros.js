// Section intros (spec v4.3 / v4.4): exactly one section's Poké Ball is "out" at a time — the
// section the reader is in. Driven by the scroll engine (useJourneyScroll) and hero clicks:
//
//   setCurrentIntro(id)  the active section changed. Every other section that is out is
//                        recalled: its Pokémon goes back in, the header returns to the empty
//                        slot, and the ball flies home to the rail (or simply returns there
//                        when the header is off screen).
//   tickIntros()         each frame: once half of the current section's slot is on screen, its
//                        rail ball is thrown to the header, opens, and the Pokémon appears;
//                        the rail slot shows a dot meanwhile. This replays on every visit.
//   heroOpen(id, …)      a hero ball was clicked: it opens, its Pokémon pops out and floats
//                        while the page glides, then lands in the header (no throw).
//
// Each section has a phase (home → throwing → out → returning → home, or home → hero →
// throwing → out) and a generation number: every async step checks it, so a quick scroll
// back and forth cancels a half-finished sequence cleanly. The one sprite in the air per
// section is tracked as `flight`, so a reversal turns it around instead of restarting.

import { prefersReducedMotion } from '../motion.js'
import { cancelAnimations, part, settled, wait } from './anim.js'
import { dismissBuddy, popBuddy, stillBuddy } from './heroBuddy.js'
import { closeBall, hop, OPEN_HANDOFF, OPEN_POP_AT, openBall, resetBall } from './openBall.js'
import { recall, resetRail, sendOut } from './rail.js'
import { getBall, isAutoScrolling, lastGlideSeq, onNextGlideEnd } from './state.js'
import { flyElement, throwBall } from './throwBall.js'

const RECALL_MS = 200

let ctl = null

const extras = (s) => [part(s.heading, 'underline'), part(s.heading, 'label')]
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

/** Header back to the empty dashed slot (data-pending), or to rest when the intros stop. */
function clearHeader(s, pending = true) {
  cancelAll(s)
  s.heading.removeAttribute('data-landed')
  s.heading.toggleAttribute('data-pending', pending)
}

/** At least half of the header's ball slot is on screen, so the landing is seen. */
function slotInView(s) {
  const r = s.intro.getBoundingClientRect()
  const half = r.height / 2
  return r.bottom >= half && r.top <= window.innerHeight - half
}

function headingOnScreen(s) {
  const r = s.heading.getBoundingClientRect()
  return r.bottom > 0 && r.top < window.innerHeight
}

/** A sprite of this section still in the air (null once it lands). */
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
  sendOut(s.id)
  await track(s, flight)
  if (!alive()) return
  const [underline, label] = extras(s)
  const timing = { delay: OPEN_POP_AT, fill: 'both' }
  await Promise.all([
    openBall(s.intro),
    settled([
      underline?.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { ...timing, duration: 320, easing: 'steps(8, end)' }),
      label?.animate(
        [{ transform: 'translateX(-16px)', opacity: 0.35 }, { transform: 'none', opacity: 1 }],
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
  // A sprite still in the air (a send-out, or the hero Pokémon landing) turns around home.
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
      label?.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateX(-16px)', opacity: 0.35 }], timing),
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

/** End of the hero click's own glide: land the Pokémon in the header, or put things back. */
function heroArrive(s, alive, ball, opened, cancelled) {
  if (ctl) ctl.hero = null
  const buddy = s.buddy
  s.buddy = null
  const arriving = alive() && !cancelled && ctl.current === s.id
  // Arriving, the ball stays hidden: its rail slot is already the dot (sent out at handoff).
  opened.then(() => closeBall(ball, { keepBallHidden: arriving }))
  if (!arriving) {
    dismissBuddy(buddy)
    if (alive()) {
      recall(s.id)
      s.phase = 'home' // the section gets its normal throw when the reader comes back
    }
    return
  }
  const landAlive = step(s, 'throwing')
  const onLand = () => {
    if (!landAlive()) return
    showHeader(s)
    hop(part(s.intro, 'pokemon'), 10)
  }
  stillBuddy(buddy)
  const flight = buddy ? flyElement(buddy, s.intro, { spin: false, onLand }) : (onLand(), Promise.resolve())
  track(s, flight).then(() => {
    if (landAlive()) s.phase = 'out'
  })
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
    sections.set(id, { id, intro, heading, phase: 'home', gen: 0, flight: null, buddy: null })
  }
  ctl = { sections, current: null, hero: null }
}

/** Stop: every header back to its resting state (Pokémon shown), every ball home. */
export function stopIntros() {
  if (!ctl) return
  const { sections } = ctl
  ctl = null
  sections.forEach((s) => {
    s.gen += 1
    s.flight?.abort()
    s.buddy?.remove()
    s.buddy = null
    clearHeader(s, false)
  })
  resetRail()
}

export function setCurrentIntro(id) {
  if (!ctl) return
  ctl.current = id
  ctl.sections.forEach((s) => {
    if (s.id !== id && isOut(s)) goHome(s)
  })
}

export function tickIntros() {
  if (!ctl || !ctl.current || isAutoScrolling()) return
  const s = ctl.sections.get(ctl.current)
  if (!s || s.phase === 'hero' || isOut(s)) return
  if (slotInView(s)) throwOut(s)
}

/** A hero click (or its glide) is in progress: further hero clicks are ignored. */
export function heroBusy() {
  return Boolean(ctl?.hero)
}

/**
 * A hero ball was clicked: open it, and at the flash pop its Pokémon out as a floating sprite
 * and turn its rail slot into the dot. Returns a promise that resolves at the handoff (the
 * caller navigates then), or undefined when the intros are off or a hero click is running.
 * The landing waits for the end of the glide that starts after the handoff, never an
 * earlier one still running.
 */
export function heroOpen(id, ball, guide) {
  if (!ctl || ctl.hero) return undefined
  const s = ctl.sections.get(id)
  if (!s) return undefined
  ctl.hero = id
  const alive = step(s, 'hero')
  ball.removeAttribute('data-hover')
  const opened = openBall(ball)
  return wait(OPEN_HANDOFF).then(() => {
    if (!alive()) {
      if (ctl) ctl.hero = null
      return
    }
    s.buddy = popBuddy(ball, guide)
    sendOut(id)
    onNextGlideEnd(({ cancelled }) => heroArrive(s, alive, ball, opened, cancelled), { after: lastGlideSeq() })
  })
}
