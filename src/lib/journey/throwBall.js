// Flying sprites (spec v4.1–v4.4).
//
// throwBall: a copy of a Poké Ball arcs from one element to another, spinning in quarter
// turns. Used rail → section header (send out) and header → rail (recall).
//
// - The target is re-measured on every frame, so the arc always ends exactly on it, however
//   the page scrolls meanwhile.
// - A flight is a promise with `copy` (the flying element) and `abort()`. A throw can start
//   from another flight's copy (fromEl = flight.copy) and abort that flight in the same
//   frame: the ball turns around in mid-air instead of jumping.

import { prefersReducedMotion } from '../motion.js'
import { arcLift, arcPoint, lerp } from './geometry.js'

/** Flight time grows with distance, so long desktop throws never blur across the screen. */
export function throwDuration(distance) {
  return Math.min(650, Math.max(380, 320 + distance * 0.25))
}

const easeOut = (t) => 1 - (1 - t) ** 2
const center = (rect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 })

/** A finished (or skipped) flight. */
function landedFlight() {
  const flight = Promise.resolve()
  flight.copy = null
  flight.abort = () => undefined
  return flight
}

/**
 * A fixed-position copy of the Poké Ball `art` (a PokeBall element) at `rect` (viewport), on
 * top of the page and the rail. Marked [data-flight] so tests and cleanups can find every
 * copy in the air. Context styles (rail dot, hidden header ball) do not follow it to <body>.
 */
function makeCopy(art, rect) {
  const copy = art.cloneNode(true)
  copy.removeAttribute('data-hover')
  copy.setAttribute('data-flight', '')
  Object.assign(copy.style, {
    // The source can be a header ball whose own class defaults to display: none (it is
    // shown there by its heading's state); the copy in <body> must always draw.
    display: 'block',
    position: 'fixed',
    inset: 'auto',
    left: '0px',
    top: '0px',
    margin: '0',
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    transform: `translate(${rect.x}px, ${rect.y}px)`,
    scale: 'none',
    translate: 'none',
    opacity: '1',
    visibility: 'visible',
    animation: 'none',
    transition: 'none',
    pointerEvents: 'none',
    zIndex: '16',
    willChange: 'transform',
  })
  copy.querySelectorAll('[style]').forEach((el) => el.style.removeProperty('transform'))
  document.body.appendChild(copy)
  return copy
}

/**
 * Fly the existing fixed copy `copy` onto `toEl`, ending at toEl's size. `spin`: quarter
 * turns or none. `onLand` runs in the frame the flight ends;
 * the copy is removed then (also on abort, which skips onLand). If either end measures 0
 * wide (not laid out), it lands at once.
 * @returns {Promise<void> & { copy: HTMLElement|null, abort: () => void }}
 */
function flyElement(copy, toEl, { onLand, spin = true } = {}) {
  const from = copy.getBoundingClientRect()
  const first = toEl?.getBoundingClientRect()
  if (!(from.width > 0) || !(first?.width > 0)) {
    copy.remove()
    onLand?.()
    return landedFlight()
  }
  const start = center(from)
  const end = center(first)
  // Arc height from the distance at launch, so the curve keeps its shape while it follows.
  const lift = arcLift(start, end)
  const duration = throwDuration(Math.hypot(end.x - start.x, end.y - start.y))
  // Starting from another flight: keep its current spin so a turn-around is seamless.
  const startTurn = Number(copy.dataset.turn ?? 0)
  copy.style.transformOrigin = '50% 50%'
  let shownSize = 0

  function place(t) {
    const to = toEl.getBoundingClientRect()
    const size = to.width > 0 ? to.width : first.width
    const e = easeOut(t)
    const point = arcPoint(start, center(to), lift, e)
    const scale = lerp(from.width, size, e) / size
    const turn = spin ? startTurn + Math.min(4, Math.floor(t * 4)) * 90 : 0
    if (spin) copy.dataset.turn = String(turn % 360)
    if (size !== shownSize) {
      shownSize = size
      copy.style.width = `${size}px`
      copy.style.height = `${size}px`
    }
    copy.style.transform = `translate(${point.x - size / 2}px, ${point.y - size / 2}px) scale(${scale}) rotate(${turn}deg)`
  }
  place(0)

  let frame = 0
  let finish = () => undefined
  const flight = new Promise((resolve) => {
    finish = (landed) => {
      cancelAnimationFrame(frame)
      if (landed) onLand?.()
      copy.remove()
      resolve()
    }
    const startTime = performance.now()
    const step = (now) => {
      const t = Math.min(1, (now - startTime) / duration)
      if (t < 1) {
        place(t)
        frame = requestAnimationFrame(step)
      } else {
        finish(true)
      }
    }
    frame = requestAnimationFrame(step)
  })
  flight.copy = copy
  flight.abort = () => finish(false)
  return flight
}

/**
 * Throw a Poké Ball from `fromEl` to `toEl` (both laid out; their current viewport rects
 * are used). With reduced motion, or a missing rect, it lands at once.
 * @returns {Promise<void> & { copy: HTMLElement|null, abort: () => void }}
 */
export function throwBall(fromEl, toEl, onLand) {
  if (!fromEl || !toEl || prefersReducedMotion()) {
    onLand?.()
    return landedFlight()
  }
  const from = fromEl.getBoundingClientRect()
  if (!(from.width > 0)) {
    onLand?.()
    return landedFlight()
  }
  // The art to copy: the PokeBall inside a rail mover or header slot, or a previous flight.
  const art = fromEl.matches?.('[data-part="ball"]') ? fromEl : fromEl.querySelector?.('[data-part="ball"]')
  if (!art) {
    onLand?.()
    return landedFlight()
  }
  const copy = makeCopy(art, from)
  copy.dataset.turn = fromEl.dataset?.turn ?? '0'
  // A small recoil on the rail ball as it throws.
  fromEl.querySelector?.('[data-part="ball"]')?.animate?.(
    [{ translate: '0 0' }, { translate: '-4px 0' }, { translate: '0 0' }],
    { duration: 200, easing: 'steps(3, end)', composite: 'add' },
  )
  return flyElement(copy, toEl, { onLand, spin: true })
}
