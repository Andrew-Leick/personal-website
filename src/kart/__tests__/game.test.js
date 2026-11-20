import { describe, expect, test } from 'vitest'
import { COUNT_STEP, createGame, parseBest } from '../game.js'

const DT = 1 / 60
function run(game, seconds) {
  let go = 0
  for (let i = 0; i < Math.round(seconds / DT); i++) if (game.tick(DT) === 'go') go++
  return go
}

describe('game state machine', () => {
  test('loading -> title -> countdown -> racing -> finished', () => {
    const g = createGame()
    expect(g.state).toBe('loading')
    expect(g.start()).toBe(false)
    g.loaded()
    expect(g.state).toBe('title')
    expect(g.start()).toBe(true)
    expect(g.state).toBe('countdown')
    expect(g.label).toBe('3')
    run(g, COUNT_STEP)
    expect(g.label).toBe('2')
    run(g, COUNT_STEP)
    expect(g.label).toBe('1')
    expect(g.driving).toBe(false)
    expect(g.timeMs).toBe(0)
    expect(run(g, COUNT_STEP)).toBe(1)
    expect(g.state).toBe('racing')
    expect(g.driving).toBe(true)
    expect(g.label).toBe('GO!')
    run(g, COUNT_STEP)
    expect(g.label).toBe(null)
    run(g, 10)
    expect(g.timeMs).toBeCloseTo(10600, -2)
    const r = g.finish()
    expect(g.state).toBe('finished')
    expect(r).toEqual({ timeMs: g.timeMs, bestMs: g.timeMs, isBest: true })
    run(g, 5)
    expect(g.timeMs).toBe(r.timeMs) // frozen after the finish
  })

  test('pause freezes the timer and resumes to the previous state', () => {
    const g = createGame()
    g.loaded()
    g.start()
    expect(g.pause()).toBe(true)
    expect(g.label).toBe('3')
    run(g, 5)
    expect(g.resume()).toBe(true)
    expect(g.state).toBe('countdown')
    run(g, 3 * COUNT_STEP + 2)
    const before = g.timeMs
    g.pause()
    expect(g.state).toBe('paused')
    expect(g.driving).toBe(false)
    expect(g.finish()).toBe(null)
    run(g, 5)
    expect(g.timeMs).toBe(before)
    g.resume()
    expect(g.state).toBe('racing')
    expect(g.resume()).toBe(false)
  })

  test('restart from paused or finished resets to countdown; not from title', () => {
    const g = createGame()
    g.loaded()
    expect(g.restart()).toBe(false)
    g.start()
    run(g, 4)
    g.pause()
    expect(g.restart()).toBe(true)
    expect(g.state).toBe('countdown')
    expect(g.timeMs).toBe(0)
    run(g, 4)
    g.finish()
    expect(g.result).not.toBe(null)
    expect(g.restart()).toBe(true)
    expect(g.result).toBe(null)
    expect(g.label).toBe('3')
    expect(g.pause()).toBe(true)
    expect(g.start()).toBe(false)
  })

  test('best time only improves', () => {
    const g = createGame({ best: 30000 })
    g.loaded()
    g.start()
    run(g, 3 * COUNT_STEP + 40)
    expect(g.finish()).toMatchObject({ bestMs: 30000, isBest: false })
    g.restart()
    run(g, 3 * COUNT_STEP + 20)
    const r = g.finish()
    expect(r.isBest).toBe(true)
    expect(r.bestMs).toBe(r.timeMs)
    expect(g.best).toBe(r.timeMs)
  })

  test('parseBest accepts positive numbers only', () => {
    expect(parseBest('31234')).toBe(31234)
    for (const bad of [null, '', 'abc', '-5', '0', 'Infinity']) expect(parseBest(bad)).toBe(null)
  })
})
