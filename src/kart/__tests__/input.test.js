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
    expect(input.poll()[0]).toMatchObject({ throttle: 1, brake: 0, steer: -1 })
    key('keyup', 'ArrowUp')
    key('keydown', 'Z')
    key('keydown', 'ArrowRight')
    expect(input.poll()[0]).toMatchObject({ throttle: 0, brake: 1, steer: 0 })
    input.clear()
    expect(input.poll()[0]).toMatchObject({ throttle: 0, brake: 0, steer: 0 })
  })

  test('start, pause and restart fire once per press and ignore key repeat', () => {
    const input = createInput()
    key('keydown', 'Enter')
    key('keydown', 'Escape')
    key('keydown', 'r')
    expect(input.poll()[0]).toMatchObject({ start: true, pause: true, restart: true })
    expect(input.poll()[0]).toMatchObject({ start: false, pause: false, restart: false })
    key('keydown', 'p', { repeat: true })
    expect(input.poll()[0].pause).toBe(false)
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
    expect(input.poll()[0].throttle).toBe(1)
    key('keydown', 's')
    expect(input.poll()[0]).toMatchObject({ throttle: 0, brake: 1 })
    input.setAutoGas(false)
    key('keyup', 's')
    expect(input.poll()[0].throttle).toBe(0)
  })

  test('gamepad: buttons, stick dead zone, edge-triggered Start and Select', () => {
    const input = createInput()
    pad([7, 9], [0.1, 0])
    expect(input.poll()[0]).toMatchObject({ throttle: 1, steer: 0, start: true, pause: true })
    expect(input.poll()[0]).toMatchObject({ start: false, pause: false })
    pad([6, 14, 8])
    expect(input.poll()[0]).toMatchObject({ brake: 1, steer: -1, restart: true })
    pad([], [0.6, 0])
    expect(input.poll()[0].steer).toBeCloseTo(0.5)
  })

  test('2 players: W A S D drive P1, the arrows drive P2, gamepads map in order', () => {
    const input = createInput({ autoGas: true })
    key('keydown', 'w')
    key('keydown', 'ArrowLeft')
    let [p1, p2] = input.poll(2)
    expect(p1).toMatchObject({ throttle: 1, steer: 0 }) // auto gas is 1-player only
    expect(p2).toMatchObject({ throttle: 0, steer: -1 })
    key('keyup', 'w')
    key('keydown', 'ArrowUp')
    key('keydown', 'd')
    ;[p1, p2] = input.poll(2)
    expect(p1).toMatchObject({ throttle: 0, steer: 1 })
    expect(p2).toMatchObject({ throttle: 1, steer: -1 })
    input.clear()
    pads = [{ connected: true, buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0] }, null, { connected: true, buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === 7, value: i === 7 ? 1 : 0 })), axes: [0, 0] }]
    ;[p1, p2] = input.poll(2)
    expect(p1.throttle).toBe(0)
    expect(p2.throttle).toBe(1)
  })

  test('stickValue rescales past the dead zone', () => {
    expect(stickValue(0.19)).toBe(0)
    expect(stickValue(1)).toBe(1)
    expect(stickValue(-1)).toBe(-1)
  })
})
