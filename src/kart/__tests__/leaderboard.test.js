import { describe, expect, test } from 'vitest'
import { createLeaderboard, insert, parseBoard, validateEntry } from '../leaderboard.js'

const memory = () => {
  const m = new Map()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }
}

describe('leaderboard', () => {
  test('validates and trims a name and an email', () => {
    expect(validateEntry('  Ada   Lovelace ', ' ada@example.com ')).toEqual({ name: 'Ada Lovelace', email: 'ada@example.com' })
    expect(validateEntry('', 'a@b.co')).toMatchObject({ field: 'name' })
    expect(validateEntry('x'.repeat(21), 'a@b.co')).toMatchObject({ field: 'name' })
    expect(validateEntry('Ada', 'not-an-email')).toMatchObject({ field: 'email' })
  })

  test('inserts in time order, ties after earlier entries, capped', () => {
    const a = { timeMs: 50 }
    const b = { timeMs: 60 }
    expect(insert([a, b], { timeMs: 55 })).toMatchObject({ rank: 2 })
    expect(insert([a, b], { timeMs: 60 }).rank).toBe(3)
    expect(insert([a, b], { timeMs: 70 }, 2)).toEqual({ entries: [a, b], rank: null })
  })

  test('adds, persists and ranks; bad stored data is an empty board', () => {
    const storage = memory()
    const board = createLeaderboard(storage)
    expect(board.add({ name: 'Ada', email: 'ada@example.com', timeMs: 58000 })).toMatchObject({ ok: true, rank: 1 })
    expect(board.add({ name: 'Bo', email: 'bo@example.com', timeMs: 57000 })).toMatchObject({ ok: true, rank: 1 })
    expect(board.add({ name: '', email: 'x', timeMs: 1 })).toMatchObject({ ok: false, field: 'name' })
    expect(createLeaderboard(storage).entries().map((e) => e.name)).toEqual(['Bo', 'Ada'])
    expect(parseBoard('{"oops":1}')).toEqual([])
    expect(parseBoard('[{"name":"x","email":"y","timeMs":-1}]')).toEqual([])
  })
})
