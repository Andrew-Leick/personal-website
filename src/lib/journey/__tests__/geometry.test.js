import { describe, expect, test } from 'vitest'
import { arcLift, arcPoint, spinAngle, ballTransform, clamp, easeInOut, heroProgress, lerp, pickActive, staggered, staggerOrder, tilt, trackProgress } from '../geometry.js'

describe('basics', () => {
  test('clamp and lerp', () => {
    expect(clamp(-1)).toBe(0)
    expect(clamp(2)).toBe(1)
    expect(clamp(0.4)).toBe(0.4)
    expect(lerp(10, 20, 0.5)).toBe(15)
  })
  test('easeInOut keeps its ends and midpoint', () => {
    expect(easeInOut(0)).toBe(0)
    expect(easeInOut(0.5)).toBe(0.5)
    expect(easeInOut(1)).toBe(1)
    expect(easeInOut(0.25)).toBeLessThan(0.25)
  })
})

describe('heroProgress', () => {
  test('scales scroll by the travel distance', () => {
    expect(heroProgress(0, 400)).toBe(0)
    expect(heroProgress(200, 400)).toBe(0.5)
    expect(heroProgress(900, 400)).toBe(1)
  })
  test('no travel means the hero is gone', () => {
    expect(heroProgress(0, 0)).toBe(1)
    expect(heroProgress(0, Number.NaN)).toBe(1)
  })
})

describe('staggered', () => {
  test('first ball leads, last ball trails, all finish together', () => {
    expect(staggered(0.1, 0, 3)).toBeGreaterThan(staggered(0.1, 2, 3))
    expect(staggered(0.1, 2, 3)).toBe(0)
    for (const i of [0, 1, 2]) expect(staggered(1, i, 3)).toBe(1)
    for (const i of [0, 1, 2]) expect(staggered(0, i, 3)).toBe(0)
  })
  test('a single ball is not staggered', () => {
    expect(staggered(0.3, 0, 1)).toBe(0.3)
  })
})

describe('ballTransform', () => {
  const rail = { x: 900, y: 300, width: 60 }
  const hero = { x: 100, y: 500, width: 90 }
  test('t = 0 sits on the hero slot at hero size', () => {
    expect(ballTransform(rail, hero, 0)).toEqual({ tx: -800, ty: 200, scale: 1.5 })
  })
  test('t = 1 is the rail slot, untransformed', () => {
    expect(ballTransform(rail, hero, 1)).toEqual({ tx: 0, ty: 0, scale: 1 })
  })
  test('halfway is halfway', () => {
    expect(ballTransform(rail, hero, 0.5)).toEqual({ tx: -400, ty: 100, scale: 1.25 })
  })
  test('missing rects leave the ball in place', () => {
    expect(ballTransform(null, hero, 0)).toEqual({ tx: 0, ty: 0, scale: 1 })
    expect(ballTransform({ x: 0, y: 0, width: 0 }, hero, 0)).toEqual({ tx: 0, ty: 0, scale: 1 })
  })
})

describe('pickActive', () => {
  const sections = [
    { id: 'experience', top: 100 },
    { id: 'projects', top: 900 },
    { id: 'about', top: 1800 },
  ]
  test('last section above the line wins', () => {
    expect(pickActive(sections, 400)).toBe('experience')
    expect(pickActive(sections, 1000)).toBe('projects')
    expect(pickActive(sections, 5000)).toBe('about')
  })
  test('nothing above the line is home', () => {
    expect(pickActive(sections, 50)).toBe('home')
    expect(pickActive([], 400)).toBe('home')
  })
})

describe('arcs', () => {
  const from = { x: 0, y: 100 }
  const to = { x: 200, y: 100 }
  test('arcPoint keeps its ends and peaks at half the lift', () => {
    expect(arcPoint(from, to, 80, 0)).toEqual(from)
    expect(arcPoint(from, to, 80, 1)).toEqual(to)
    expect(arcPoint(from, to, 80, 0.5)).toEqual({ x: 100, y: 60 })
  })
  test('lift 0 is a straight line', () => {
    expect(arcPoint(from, to, 0, 0.25)).toEqual({ x: 50, y: 100 })
  })
  test('arcLift is a quarter of the distance, capped', () => {
    expect(arcLift(from, to)).toBe(50)
    expect(arcLift({ x: 0, y: 0 }, { x: 0, y: 2000 })).toBe(120)
  })
  test('ballTransform follows the arc', () => {
    const rail = { x: 200, y: 100, width: 60 }
    const hero = { x: 0, y: 100, width: 60 }
    expect(ballTransform(rail, hero, 0.5, 80)).toEqual({ tx: -100, ty: -40, scale: 1 })
  })
  test('tilt is 0 at the ends and stepped in between', () => {
    expect(tilt(0)).toBe(-0)
    expect(tilt(1)).toBe(-0)
    expect(tilt(0.5)).toBe(-12)
    expect([0, -4, -8, -12]).toContain(tilt(0.2))
  })
})

describe('staggerOrder', () => {
  test('shortest path first, ties in input order', () => {
    expect(staggerOrder([900, 700, 500])).toEqual([2, 1, 0])
    expect(staggerOrder([300, 300, 100])).toEqual([1, 2, 0])
    expect(staggerOrder([])).toEqual([])
  })
})

describe('trackProgress', () => {
  test('0 on the hero, i/(n-1) the moment section i activates', () => {
    const tops = [400, 1400, 2400]
    expect(trackProgress(tops, 300)).toBe(0)
    expect(trackProgress(tops, 400)).toBe(0)
    expect(trackProgress(tops, 1400)).toBe(0.5)
    expect(trackProgress(tops, 2400)).toBe(1)
    expect(trackProgress(tops, 9000)).toBe(1)
  })
  test('moves through a section in proportion', () => {
    expect(trackProgress([0, 1000, 2000], 500)).toBe(0.25)
    expect(trackProgress([0, 1000, 2000], 1500)).toBe(0.75)
  })
  test('edge cases', () => {
    expect(trackProgress([], 100)).toBe(0)
    expect(trackProgress([50], 100)).toBe(1)
  })
})

describe('spinAngle', () => {
  test('one full turn over the first 60% of the flight, easing into upright', () => {
    expect(spinAngle(0)).toBe(0)
    expect(spinAngle(0.3)).toBe(270)
    expect(spinAngle(0.6)).toBe(360)
    expect(spinAngle(0.9)).toBe(360)
    expect(spinAngle(1)).toBe(360)
    expect(spinAngle(0.15)).toBeGreaterThan(spinAngle(0.45) - spinAngle(0.3)) // fast, then slowing
  })
  test('a turn-around keeps going forward to the next upright angle', () => {
    expect(spinAngle(0, 270)).toBe(270)
    expect(spinAngle(0.6, 270)).toBe(360)
    expect(spinAngle(1, 90) % 360).toBe(0)
  })
})
