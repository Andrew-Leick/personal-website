import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createInput, stickValue } from '../input.js'

let win
let pads
function key(type, k, extra = {}) {
  const e = Object.assign(new Event(type, { cancelable: true }), { key: k, repeat: false }, extra)
  win.dispatchEvent(e)
  return e
}
function pad(pressed = [], axes = [0, 0]) {
  const buttons = Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), value: pressed.includes(i) ? 1 : 0 }))
  pads = [null, { connected: true, buttons, axes }]
}

beforeEach(() => {
  win = new EventTarget()
  pads = []
  vi.stubGlobal('window', win)
  vi.stubGlobal('navigator', { getGamepads: () => pads })
})
afterEach(() => vi.unstubAllGlobals())

describe('input', () => {
  test('keyboard held keys map to throttle, brake and steer', () => {
    const input = createInput()
    key('keydown', 'ArrowUp')
    key('keydown', 'a')
    expect(input.poll()).toMatchObject({ throttle: 1, brake: 0, steer: -1 })
    key('keyup', 'ArrowUp')
    key('keydown', 'Z')
    key('keydown', 'ArrowRight')
    expect(input.poll()).toMatchObject({ throttle: 0, brake: 1, steer: 0 })
    input.clear()
    expect(input.poll()).toMatchObject({ throttle: 0, brake: 0, steer: 0 })
  })

  test('start, pause and restart fire once per press and ignore key repeat', () => {
    const input = createInput()
    key('keydown', 'Enter')
    key('keydown', 'Escape')
    key('keydown', 'r')
    expect(input.poll()).toMatchObject({ start: true, pause: true, restart: true })
    expect(input.poll()).toMatchObject({ start: false, pause: false, restart: false })
    key('keydown', 'p', { repeat: true })
    expect(input.poll().pause).toBe(false)
  })

  test('arrows and Space are captured only when capture is on', () => {
    const input = createInput()
    expect(key('keydown', 'ArrowDown').defaultPrevented).toBe(false)
    input.setCapture(true)
    expect(key('keydown', 'ArrowDown').defaultPrevented).toBe(true)
    expect(key('keydown', ' ').defaultPrevented).toBe(true)
    expect(key('keydown', 'w').defaultPrevented).toBe(false)
  })

  test('auto gas holds throttle unless braking', () => {
    const input = createInput({ autoGas: true })
    expect(input.poll().throttle).toBe(1)
    key('keydown', 's')
    expect(input.poll()).toMatchObject({ throttle: 0, brake: 1 })
    input.setAutoGas(false)
    key('keyup', 's')
    expect(input.poll().throttle).toBe(0)
  })

  test('gamepad: buttons, stick dead zone, edge-triggered Start and Select', () => {
    const input = createInput()
    pad([7, 9], [0.1, 0])
    expect(input.poll()).toMatchObject({ throttle: 1, steer: 0, start: true, pause: true })
    expect(input.poll()).toMatchObject({ start: false, pause: false })
    pad([6, 14, 8])
    expect(input.poll()).toMatchObject({ brake: 1, steer: -1, restart: true })
    pad([], [0.6, 0])
    expect(input.poll().steer).toBeCloseTo(0.5)
  })

  test('stickValue rescales past the dead zone', () => {
    expect(stickValue(0.19)).toBe(0)
    expect(stickValue(1)).toBe(1)
    expect(stickValue(-1)).toBe(-1)
  })
})
