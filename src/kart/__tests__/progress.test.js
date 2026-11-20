import { describe, expect, test } from 'vitest'
import { COURSE, gateBoxes } from '../course.js'
import { createProgress } from '../progress.js'

const DT = 1 / 60
const { samples, length } = COURSE
const n = samples.length
const at = (i) => samples[((Math.round(i) % n) + n) % n]

/** Move a kart along the centerline from sample `from` to `to` at `perTick` samples per tick. */
function drive(tracker, from, to, perTick = 0.5) {
  const events = []
  const dir = Math.sign(to - from)
  for (let i = from; dir > 0 ? i <= to : i >= to; i += dir * perTick) events.push(...tracker.update(at(i), DT))
  return events
}
const types = (events, type) => events.filter((e) => e.type === type)

describe('progress', () => {
  test('laps complete only after the checkpoint, then the race finishes', () => {
    const t = createProgress(COURSE, 8)
    expect(t.laps).toBe(2)
    // Reverse over the line from the start, then forward again: no lap credit.
    drive(t, 0, -40)
    let ev = drive(t, -40, 20)
    expect(types(ev, 'lap')).toHaveLength(0)
    ev = drive(t, 20, n + 5)
    expect(types(ev, 'lap')).toEqual([{ type: 'lap', lap: 2 }])
    expect(t.lap).toBe(2)
    ev = drive(t, n + 5, 2 * n + 5)
    expect(types(ev, 'finish')).toHaveLength(1)
    expect(t.nextStop).toBe(null)
  })

  test('gates fire once, in order, on the right lap', () => {
    const t = createProgress(COURSE, 8)
    const g0 = Math.round((COURSE.gateSlots[0] / length) * n)
    // Cross gate 0 forward, back over it and forward again: fires once.
    let ev = drive(t, 0, g0 + 5)
    ev = ev.concat(drive(t, g0 + 5, g0 - 5), drive(t, g0 - 5, g0 + 5))
    expect(types(ev, 'gate')).toEqual([{ type: 'gate', stop: 0 }])
    ev = drive(t, g0 + 5, 2 * n + 5)
    expect(types(ev, 'gate').map((e) => e.stop)).toEqual([1, 2, 3, 4, 5, 6, 7])
    // Stop 4 (lap 2, slot 0) fired only after the lap event.
    const order = ev.filter((e) => e.type !== 'wrongway').map((e) => e.type + (e.stop ?? e.lap ?? ''))
    expect(order.indexOf('lap2')).toBeLessThan(order.indexOf('gate4'))
  })

  test('the figure-8 crossing does not jump progress (both passes)', () => {
    const t = createProgress(COURSE, 8)
    let last = 0
    for (let i = 0; i <= n; i += 0.5) {
      t.update(at(i), DT)
      expect(Math.abs(t.dist - last)).toBeLessThan(2)
      last = t.dist
    }
    expect(t.dist).toBeCloseTo(length, -1)
  })

  test('wrong way fires on sustained reverse and clears when progress resumes', () => {
    const t = createProgress(COURSE, 8)
    drive(t, 0, 300)
    // ~0.15 lap per second backwards (6% threshold).
    let ev = drive(t, 300, 150, 150 / 120)
    expect(types(ev, 'wrongway')).toEqual([{ type: 'wrongway', on: true }])
    ev = drive(t, 150, 160)
    expect(types(ev, 'wrongway')).toEqual([{ type: 'wrongway', on: false }])
    // Slow backing up (a bump) does not trigger it.
    ev = drive(t, 160, 150, 0.05)
    expect(types(ev, 'wrongway')).toHaveLength(0)
  })

  test('boxHit is true inside a box of the stop row only', () => {
    const t = createProgress(COURSE, 8)
    const b = gateBoxes(1)[2]
    expect(t.boxHit(1, b.x + 0.5, b.z)).toBe(true)
    expect(t.boxHit(5, b.x, b.z)).toBe(true) // stop 5 = lap 2, slot 1
    expect(t.boxHit(0, b.x, b.z)).toBe(false)
  })

  test('reset starts over', () => {
    const t = createProgress(COURSE, 8)
    drive(t, 0, n + 5)
    t.reset()
    expect(t.lap).toBe(1)
    expect(t.nextStop).toBe(0)
    expect(t.dist).toBe(0)
  })
})
