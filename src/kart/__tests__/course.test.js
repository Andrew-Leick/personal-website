import { describe, expect, test } from 'vitest'
import {
  BOX_RADIUS,
  COURSE,
  GATES_PER_LAP,
  START,
  SURFACE_BY_MATERIAL,
  gateBoxes,
  gateFor,
  gatePose,
  lapCount,
  nearestSample,
  signedProgressDelta,
  surfaceFor,
} from '../course.js'
import { MAX_SPEED } from '../physics.js'

const { samples, length, gateSlots } = COURSE
// The two passes over the figure-8 crossing (under and over the bridge), found from the samples.
function crossings() {
  let best = { d: Infinity, i: 0, j: 0 }
  for (let i = 0; i < samples.length; i++) {
    for (let j = i + 100; j < samples.length; j++) {
      if (length - (j - i) < 100) continue
      const d = Math.hypot(samples[i].x - samples[j].x, samples[i].z - samples[j].z)
      if (d < best.d) best = { d, i, j }
    }
  }
  return best
}
const ringDist = (a, b) => Math.abs(signedProgressDelta(a, b, length))

describe('course', () => {
  test('the spline closes and has a length', () => {
    expect(length).toBeGreaterThan(500)
    const a = samples[0]
    const z = samples[samples.length - 1]
    expect(Math.hypot(a.x - z.x, a.z - z.z)).toBeLessThan(1.5)
    for (let i = 1; i < samples.length; i++) expect(samples[i].dist).toBeGreaterThan(samples[i - 1].dist)
  })

  test('starts at the start line, facing the race direction', () => {
    expect(Math.hypot(samples[0].x - START.x, samples[0].z - START.z)).toBeLessThan(1)
    expect(Math.cos(samples[0].heading - START.heading)).toBeGreaterThan(0.99)
  })

  test('all 24 materials are classified; steep faces are walls', () => {
    expect(Object.keys(SURFACE_BY_MATERIAL)).toHaveLength(24)
    expect(surfaceFor('lambert209', 1)).toBe('road')
    expect(surfaceFor('lambert209', 0.3)).toBe('wall')
    expect(surfaceFor('lambert202', 0.9)).toBe('offroad')
    expect(surfaceFor('lambert241', 0)).toBe('decor')
  })

  test('gate slots increase, are >= 6 s apart at MAX_SPEED, and avoid the crossing and start', () => {
    const { i, j, d } = crossings()
    expect(d).toBeLessThan(1)
    expect(gateSlots).toHaveLength(GATES_PER_LAP)
    for (let k = 0; k < gateSlots.length; k++) {
      const next = k + 1 < gateSlots.length ? gateSlots[k + 1] : gateSlots[0] + length
      expect(next).toBeGreaterThan(gateSlots[k])
      expect((next - gateSlots[k]) / MAX_SPEED).toBeGreaterThanOrEqual(6)
      for (const avoid of [0, samples[i].dist, samples[j].dist]) expect(ringDist(gateSlots[k], avoid)).toBeGreaterThan(0.1 * length)
    }
  })

  test('nearestSample with a hint stays on its own branch at the crossing (both directions)', () => {
    const { i, j } = crossings()
    const w = 25
    for (const [own, other] of [[i, j], [j, i]]) {
      const p = samples[other] // the exact crossing point lies on both branches
      for (const dir of [-1, 1]) {
        const hint = (own + dir * 10 + samples.length) % samples.length
        const got = nearestSample(samples, p.x, p.z, hint, w)
        expect(ringDist(samples[got].dist, samples[own].dist)).toBeLessThan(3)
      }
    }
  })

  test('signedProgressDelta wraps', () => {
    expect(signedProgressDelta(length - 1, 1, length)).toBeCloseTo(2)
    expect(signedProgressDelta(1, length - 1, length)).toBeCloseTo(-2)
    expect(signedProgressDelta(10, 15, length)).toBeCloseTo(5)
  })

  test('gateFor maps 8 stops to 2 laps x 4 slots', () => {
    expect(lapCount(8)).toBe(2)
    expect(lapCount(9)).toBe(3)
    expect([0, 3, 4, 7].map(gateFor)).toEqual([
      { lap: 1, slot: 0 },
      { lap: 1, slot: 3 },
      { lap: 2, slot: 0 },
      { lap: 2, slot: 3 },
    ])
  })

  test('gate rows: 5 boxes across the road, centered on the gate', () => {
    for (let s = 0; s < GATES_PER_LAP; s++) {
      const pose = gatePose(s)
      const boxes = gateBoxes(s)
      expect(boxes).toHaveLength(5)
      expect(boxes[2].x).toBeCloseTo(pose.x)
      expect(boxes[2].z).toBeCloseTo(pose.z)
      const across = Math.hypot(boxes[4].x - boxes[0].x, boxes[4].z - boxes[0].z)
      expect(across).toBeLessThan(2 * pose.halfWidth)
      expect(across / 4).toBeGreaterThan(2 * BOX_RADIUS) // gaps between boxes
    }
  })
})
