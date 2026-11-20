import { describe, expect, test } from 'vitest'
import { COURSE, START, nearestSample } from '../course.js'
import { BUMP_TIME, MAX_SPEED, OFFROAD_CAP, REVERSE_MAX, boost, createKart, step } from '../physics.js'
import { createProgress } from '../progress.js'

const DT = 1 / 60
const sample = (surface) => ({ y: 0, surface, normalY: 1 })
const flat = (surface = 'road') => ({ at: () => sample(surface), blocked: () => false })
const run = (kart, input, ground, seconds) => {
  for (let i = 0; i < Math.round(seconds / DT); i++) step(kart, input, ground, DT)
  return kart
}
const GAS = { throttle: 1, brake: 0, steer: 0 }

describe('physics', () => {
  test('road and off-road speed caps', () => {
    expect(run(createKart(START), GAS, flat('road'), 5).speed).toBeCloseTo(MAX_SPEED)
    expect(run(createKart(START), GAS, flat('offroad'), 5).speed).toBeCloseTo(OFFROAD_CAP)
    // Driving from road into grass bleeds speed down to the off-road cap.
    const k = run(createKart(START), GAS, flat('road'), 5)
    expect(run(k, GAS, flat('offroad'), 2).speed).toBeCloseTo(OFFROAD_CAP)
  })

  test('accepts a plain ground sample as well as the API', () => {
    expect(run(createKart(START), GAS, sample('road'), 5).speed).toBeCloseTo(MAX_SPEED)
  })

  test('no turning at speed 0', () => {
    const k = run(createKart(START), { throttle: 0, brake: 0, steer: 1 }, flat(), 1)
    expect(k.heading).toBe(START.heading)
  })

  test('reverse is capped and inverts steering', () => {
    const fwd = run(createKart({ x: 0, z: 0, heading: 0 }), { throttle: 1, brake: 0, steer: 1 }, flat(), 0.5)
    expect(fwd.heading).toBeGreaterThan(0)
    const rev = run(createKart({ x: 0, z: 0, heading: 0 }), { throttle: 0, brake: 1, steer: 1 }, flat(), 3)
    expect(rev.speed).toBeCloseTo(-REVERSE_MAX)
    expect(rev.heading).toBeLessThan(0)
  })

  test('the boost raises the cap, then expires', () => {
    const k = run(createKart(START), GAS, flat(), 5)
    boost(k)
    expect(k.speed).toBeGreaterThan(MAX_SPEED * 1.2)
    run(k, GAS, flat(), 0.5)
    expect(k.speed).toBeGreaterThan(MAX_SPEED * 1.25) // surge bleeds off slowly while boosted
    run(k, GAS, flat(), 4)
    expect(k.boostT).toBe(0)
    expect(k.speed).toBeCloseTo(MAX_SPEED)
  })

  test('a wall bumps the kart back without moving it', () => {
    const k = run(createKart({ x: 0, z: 0, heading: 0 }), GAS, flat(), 3)
    const v = k.speed
    const x = k.x
    step(k, GAS, { at: () => sample('road'), blocked: () => true }, DT)
    expect(k.x).toBe(x)
    expect(k.speed).toBeCloseTo(-0.3 * v)
    expect(k.bumpT).toBeCloseTo(BUMP_TIME)
    // Off the mesh ('out') bumps too.
    const k2 = run(createKart({ x: 0, z: 0, heading: 0 }), GAS, flat(), 3)
    step(k2, GAS, { at: (x) => sample(x > k2.x ? 'out' : 'road'), blocked: () => false }, DT)
    expect(k2.speed).toBeLessThan(0)
  })

  test('a clean full-throttle lap takes 28-35 s', () => {
    const kart = createKart(START)
    const tracker = createProgress(COURSE, 4) // 4 stops = 1 lap
    const { samples } = COURSE
    let idx = 0
    let t = 0
    let finished = false
    while (!finished && t < 60) {
      // Simple follower: steer toward a centerline point ~12 units ahead.
      idx = nearestSample(samples, kart.x, kart.z, idx, 30)
      const target = samples[(idx + 12) % samples.length]
      const err = Math.atan2(Math.sin(Math.atan2(target.z - kart.z, target.x - kart.x) - kart.heading), Math.cos(Math.atan2(target.z - kart.z, target.x - kart.x) - kart.heading))
      step(kart, { throttle: 1, brake: 0, steer: Math.max(-1, Math.min(1, err * 3)) }, flat(), DT)
      for (const e of tracker.update(kart, DT)) if (e.type === 'finish') finished = true
      t += DT
    }
    expect(finished).toBe(true)
    expect(t).toBeGreaterThanOrEqual(28)
    expect(t).toBeLessThanOrEqual(35)
  })
})
