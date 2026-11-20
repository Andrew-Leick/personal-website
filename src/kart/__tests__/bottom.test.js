import { describe, expect, it } from 'vitest'
import { formatTime } from '../bottom.js'
import { computeFit } from '../layout.js'

describe('formatTime', () => {
  it('formats m:ss.cc with floored centiseconds', () => {
    expect(formatTime(0)).toBe('0:00.00')
    expect(formatTime(62459)).toBe('1:02.45')
    expect(formatTime(9999)).toBe('0:09.99')
    expect(formatTime(600000)).toBe('10:00.00')
  })

  it('clamps bad input to zero', () => {
    expect(formatTime(-5)).toBe('0:00.00')
    expect(formatTime(NaN)).toBe('0:00.00')
  })
})

describe('computeFit', () => {
  it('uses an integer scale side by side on a laptop', () => {
    expect(computeFit(1216, 706)).toEqual({ scale: 2, layout: 'side' })
  })

  it('stacks on a portrait phone, fractional when the integer wastes > 25%', () => {
    const { scale, layout } = computeFit(358, 700)
    expect(layout).toBe('stacked')
    expect(scale).toBeCloseTo(354 / 256)
  })

  it('stacks when the window is tall enough for two screens at the same scale', () => {
    expect(computeFit(1376, 806)).toEqual({ scale: 2, layout: 'stacked' })
  })
  it('2 players: two top screens side by side with the bottom screen below', () => {
    expect(computeFit(1216, 806, 2)).toEqual({ scale: 2, layout: 'duo' })
    expect(computeFit(1216, 706, 2).scale).toBeCloseTo((706 - 16 - 8) / 384)
  })
})
