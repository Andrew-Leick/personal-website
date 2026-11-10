// Rail → section heading throw (spec v4.1 / v4.2): a copy of the rail's Poké Ball arcs from
// the rail (or the phone dock) into the heading's empty slot, spinning in quarter turns.
//
// The heading moves while the page scrolls, so the target is re-measured on every frame:
// the arc always ends exactly on the slot, wherever it is when the throw lands.

import { BALL_SPRITE } from '../../components/PixelSprite/sprites.js'
import { BASE_URL } from '../content/paths.js'
import { prefersReducedMotion } from '../motion.js'
import { arcLift, arcPoint, lerp } from './geometry.js'

export const THROW_DURATION = 420

const easeOut = (t) => 1 - (1 - t) ** 2
const center = (rect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 })

/**
 * Throw from `fromEl` (the rail ball) to `toEl` (the heading's ball box). `onLand` runs in the
 * same frame the copy is removed, so the real ball can appear with no gap or flicker.
 * Resolves after landing. Resolves at once (after onLand) when motion is reduced or a rect
 * is missing.
 */
export function throwBall(fromEl, toEl, onLand) {
  const land = () => onLand?.()
  if (!fromEl || !toEl || prefersReducedMotion()) {
    land()
    return Promise.resolve()
  }
  const from = fromEl.getBoundingClientRect()
  const first = toEl.getBoundingClientRect()
  if (!(from.width > 0) || !(first.width > 0)) {
    land()
    return Promise.resolve()
  }

  const start = center(from)
  // Arc height from the distance at launch, so the curve keeps its shape while it follows.
  const lift = arcLift(start, center(first))
  const copy = document.createElement('img')
  copy.src = `${BASE_URL}sprites/${BALL_SPRITE}.png`
  copy.alt = ''
  copy.setAttribute('aria-hidden', 'true')
  Object.assign(copy.style, {
    position: 'fixed',
    left: '0px',
    top: '0px',
    width: `${first.width}px`,
    height: `${first.height}px`,
    imageRendering: 'pixelated',
    pointerEvents: 'none',
    zIndex: '16',
    transformOrigin: '50% 50%',
    willChange: 'transform',
  })

  function place(t) {
    const to = toEl.getBoundingClientRect()
    const size = to.width || first.width
    const point = arcPoint(start, center(to), lift, easeOut(t))
    const scale = lerp(from.width, size, easeOut(t)) / size
    // Quarter turns keep the pixel art square; one full spin over the throw.
    const turn = Math.min(4, Math.floor(t * 4)) * 90
    copy.style.width = `${size}px`
    copy.style.height = `${size}px`
    copy.style.transform = `translate(${point.x - size / 2}px, ${point.y - size / 2}px) scale(${scale}) rotate(${turn}deg)`
  }

  place(0)
  document.body.appendChild(copy)
  // A small recoil on the rail ball as it throws.
  fromEl.querySelector?.('[data-part="ball"]')?.animate?.(
    [{ translate: '0 0' }, { translate: '-4px 0' }, { translate: '0 0' }],
    { duration: 200, easing: 'steps(3, end)', composite: 'add' },
  )

  return new Promise((resolve) => {
    const startTime = performance.now()
    const step = (now) => {
      const t = Math.min(1, (now - startTime) / THROW_DURATION)
      if (t < 1) {
        place(t)
        requestAnimationFrame(step)
        return
      }
      land()
      copy.remove()
      resolve()
    }
    requestAnimationFrame(step)
  })
}
