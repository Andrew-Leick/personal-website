// Keyboard + touch buttons + Gamepad (standard mapping) -> one snapshot per frame (SPEC-v5 5.1, 5.2, V5-13).
// steer: -1 = left, +1 = right. start, pause and restart are edge-triggered (true for one poll).

const KEY_ACTIONS = {
  arrowup: 'up', w: 'up', x: 'up',
  arrowdown: 'down', s: 'down', z: 'down',
  arrowleft: 'left', a: 'left',
  arrowright: 'right', d: 'right',
}
const EDGE_KEYS = { enter: 'start', ' ': 'start', escape: 'pause', p: 'pause', r: 'restart' }
const CAPTURED = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '])
const DEAD_ZONE = 0.2

/** Focus is in a link or form control: its own keys (Enter, Space, arrows) belong to it. */
function isControl(el) {
  return !!el?.closest?.('a[href], button, input, select, textarea, [contenteditable=""], [contenteditable="true"]')
}
function isTextField(el) {
  return !!el?.closest?.('input, select, textarea, [contenteditable=""], [contenteditable="true"]')
}

/** Left stick X with a 0.2 dead zone, rescaled to keep the full -1..1 range. */
export function stickValue(x) {
  const a = Math.abs(x)
  return a < DEAD_ZONE ? 0 : (Math.sign(x) * (Math.min(a, 1) - DEAD_ZONE)) / (1 - DEAD_ZONE)
}

/**
 * @param {{ touchRoot?: HTMLElement|null, autoGas?: boolean }} opts
 */
export function createInput({ touchRoot = null, autoGas = false } = {}) {
  const held = new Set() // keyboard actions
  const touch = new Set() // touch-button actions
  const edges = { start: false, pause: false, restart: false }
  let padPrev = { start: false, pause: false, restart: false }
  let capture = false
  let gasButton = null
  const snap = { throttle: 0, brake: 0, steer: 0, start: false, pause: false, restart: false }

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || isTextField(e.target)) return
    const key = e.key.toLowerCase()
    const control = isControl(e.target)
    if (capture && !control && CAPTURED.has(key)) e.preventDefault()
    if (KEY_ACTIONS[key]) held.add(KEY_ACTIONS[key])
    const edge = EDGE_KEYS[key]
    // Enter/Space on a focused button or link activates it instead of starting.
    if (edge && !e.repeat && !(edge === 'start' && control)) edges[edge] = true
  })
  window.addEventListener('keyup', (e) => {
    const action = KEY_ACTIONS[e.key.toLowerCase()]
    if (action) held.delete(action)
  })

  if (touchRoot && window.matchMedia?.('(pointer: coarse)').matches) {
    const bar = document.createElement('div')
    bar.className = 'kart-touch'
    const make = (action, text, label) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = `kart-touch-btn kart-touch-${action}`
      b.textContent = text
      b.setAttribute('aria-label', label)
      b.addEventListener('contextmenu', (e) => e.preventDefault())
      if (action === 'pause') {
        b.addEventListener('click', () => (edges.pause = true))
      } else {
        b.addEventListener('pointerdown', (e) => {
          touch.add(action)
          try {
            b.setPointerCapture?.(e.pointerId)
          } catch {
            // Capture is a nicety (keeps the press if the finger slides off); never lose the press.
          }
        })
        for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(type, () => touch.delete(action))
      }
      bar.append(b)
      return b
    }
    make('left', '◀', 'Steer left')
    make('right', '▶', 'Steer right')
    gasButton = make('up', 'GAS', 'Accelerate')
    gasButton.hidden = autoGas
    make('down', 'BRAKE', 'Brake')
    make('pause', 'II', 'Pause')
    touchRoot.append(bar)
  }

  return {
    poll() {
      const pad = [...(navigator.getGamepads?.() ?? [])].find((p) => p?.connected)
      const b = (i) => pad?.buttons[i]?.value ?? 0
      const on = (i) => !!pad?.buttons[i]?.pressed
      const padNow = { start: on(0) || on(9), pause: on(9), restart: on(8) }
      const has = (a) => held.has(a) || touch.has(a)

      const brake = Math.max(has('down') ? 1 : 0, b(1), b(6))
      const gas = Math.max(has('up') ? 1 : 0, b(0), b(7))
      snap.brake = brake
      snap.throttle = autoGas ? (brake > 0 ? 0 : 1) : gas
      const steer = (has('right') ? 1 : 0) - (has('left') ? 1 : 0) + (on(15) ? 1 : 0) - (on(14) ? 1 : 0) + stickValue(pad?.axes[0] ?? 0)
      snap.steer = Math.max(-1, Math.min(1, steer))
      for (const k of ['start', 'pause', 'restart']) {
        snap[k] = edges[k] || (padNow[k] && !padPrev[k])
        edges[k] = false
      }
      padPrev = padNow
      return snap
    },
    setAutoGas(on) {
      autoGas = !!on
      if (gasButton) gasButton.hidden = autoGas
    },
    setCapture(on) {
      capture = !!on
    },
    clear() {
      held.clear()
      touch.clear()
      edges.start = edges.pause = edges.restart = false
    },
  }
}
