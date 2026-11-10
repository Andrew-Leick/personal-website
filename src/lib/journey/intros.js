// Section intros (spec v4.3): exactly one section's Poké Ball is "out" at a time — the
// section the reader is in. Driven by the scroll engine (useJourneyScroll):
//
//   setCurrentIntro(id)  the active section changed. Every other section that is out is
//                        recalled: its Pokémon goes back in, the header returns to the empty
//                        slot, and the ball flies home to the rail (or simply returns there
//                        when the header is off screen).
//   tickIntros()         each frame: once the current section's slot is fully on screen, its
//                        rail ball is thrown to the header, opens, and the Pokémon appears;
//                        the rail slot shows a dot meanwhile. This replays on every visit.
//
// Every async step carries a generation number, so a quick scroll back and forth cancels a
// half-finished sequence cleanly instead of fighting it.

import { prefersReducedMotion } from '../motion.js'
import { hop, OPEN_POP_AT, openBall, resetBall } from './openBall.js'
import { recall, resetRail, sendOut } from './rail.js'
import { getBall, isAutoScrolling } from './state.js'
import { throwBall } from './throwBall.js'

const RECALL_MS = 200

let ctl = null

const part = (el, name) => el?.querySelector(`[data-part="${name}"]`) ?? null
const extras = (s) => [part(s.heading, 'underline'), part(s.heading, 'label')]

function cancelAll(s) {
  resetBall(s.intro)
  extras(s).forEach((el) => el?.getAnimations?.().forEach((animation) => animation.cancel()))
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

function slotInView(s) {
  const r = s.intro.getBoundingClientRect()
  return r.top >= 0 && r.bottom <= window.innerHeight
}

function headingOnScreen(s) {
  const r = s.heading.getBoundingClientRect()
  return r.bottom > 0 && r.top < window.innerHeight
}

const settled = (animations) => Promise.all(animations.filter(Boolean).map((a) => a.finished.catch(() => undefined)))

async function throwOut(s) {
  const gen = ++s.gen
  const alive = () => ctl !== null && s.gen === gen
  s.phase = 'throwing'
  clearHeader(s)
  // The throw measures the rail ball first, then its slot turns into a dot.
  const landed = throwBall(getBall(s.id), part(s.intro, 'ball'), () => {
    if (alive()) s.heading.setAttribute('data-landed', '')
  })
  sendOut(s.id)
  await landed
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

/** Opened from the hero (BallLink): the Pokémon is already out, so no throw; it just lands. */
function settleOut(s) {
  s.gen += 1
  showHeader(s)
  sendOut(s.id)
  s.phase = 'out'
  hop(part(s.intro, 'pokemon'), 10)
}

async function goHome(s) {
  const gen = ++s.gen
  const alive = () => ctl !== null && s.gen === gen
  s.phase = 'returning'
  if (!headingOnScreen(s) || prefersReducedMotion()) {
    clearHeader(s)
    recall(s.id)
    s.phase = 'home'
    return
  }
  // On screen: the Pokémon goes back in and the underline retracts, then the ball flies home.
  const wasShowing = !s.heading.hasAttribute('data-pending')
  cancelAll(s)
  if (wasShowing) {
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
  await throwBall(part(s.intro, 'ball'), getBall(s.id), () => {
    if (alive()) recall(s.id)
  })
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
    sections.set(id, { id, intro, heading, phase: 'home', gen: 0 })
  }
  ctl = { sections, current: null, fromHero: new Set() }
}

/** Stop: every header back to its resting state (Pokémon shown), every ball home. */
export function stopIntros() {
  if (!ctl) return
  const { sections } = ctl
  ctl = null
  sections.forEach((s) => {
    s.gen += 1
    clearHeader(s, false)
  })
  resetRail()
}

export function setCurrentIntro(id) {
  if (!ctl) return
  ctl.current = id
  ctl.sections.forEach((s) => {
    if (s.id !== id && (s.phase === 'out' || s.phase === 'throwing')) goHome(s)
  })
}

export function tickIntros() {
  if (!ctl || !ctl.current || isAutoScrolling()) return
  const s = ctl.sections.get(ctl.current)
  if (!s || s.phase === 'out' || s.phase === 'throwing') return
  if (ctl.fromHero.delete(s.id)) settleOut(s)
  else if (slotInView(s)) throwOut(s)
}

/** A hero click opened this section's ball on the way: show its Pokémon on arrival, no throw. */
export function openedFromHero(id) {
  ctl?.fromHero.add(id)
}
