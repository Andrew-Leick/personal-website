import { describe, expect, test } from 'vitest'
import { checkpointDists, createSplits, formatDelta, parsePr } from '../splits.js'

describe('splits', () => {
  test('4 checkpoints per lap, the last on the finish line', () => {
    expect(checkpointDists(100, 2)).toEqual([25, 50, 75, 100, 125, 150, 175, 200])
  })

  test('records each crossing once and compares with the PR', () => {
    const s = createSplits(checkpointDists(100, 1))
    const pr = { timeMs: 4000, splits: [1000, 2000, 3000, 4000] }
    expect(s.update(10, 500, pr)).toBeNull()
    expect(s.update(26, 1100, pr)).toEqual({ index: 0, timeMs: 1100, deltaMs: 100 })
    expect(s.update(30, 1200, pr)).toBeNull() // no double count
    expect(s.update(20, 1300, pr)).toBeNull() // backing up does not re-fire
    expect(s.update(55, 1900, null)).toEqual({ index: 1, timeMs: 1900, deltaMs: null })
    expect(s.times).toEqual([1100, 1900])
    s.reset()
    expect(s.times).toEqual([])
  })

  test('formatDelta signs and rounds to hundredths', () => {
    expect(formatDelta(-420)).toBe('-0.42')
    expect(formatDelta(1234)).toBe('+1.23')
    expect(formatDelta(0)).toBe('-0.00')
    expect(formatDelta(61005)).toBe('+61.01')
  })

  test('parsePr rejects malformed or mismatched records', () => {
    const good = JSON.stringify({ timeMs: 50000, splits: [1, 2, 3, 4] })
    expect(parsePr(good, 4)).toEqual({ timeMs: 50000, splits: [1, 2, 3, 4] })
    expect(parsePr(good, 8)).toBeNull()
    expect(parsePr('nope', 4)).toBeNull()
    expect(parsePr(null, 4)).toBeNull()
    expect(parsePr(JSON.stringify({ timeMs: 5, splits: [1, 0, 3, 4] }), 4)).toBeNull()
  })
})
