import { describe, expect, test } from 'vitest'
import { createLeaderboard, createOnlineBoard, insert, parseBoard, validateEntry } from '../leaderboard.js'

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

describe('online leaderboard (Supabase)', () => {
  const ONLINE = { url: 'https://db.example/rpc', key: 'sb_publishable_test' }
  // A fake fetch: each call takes the next scripted response (or throws, for "offline").
  const fakeFetch = (...responses) => {
    const calls = []
    const fn = async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body), headers: init.headers })
      const next = responses.shift()
      if (next instanceof Error) throw next
      return { ok: next.status < 400, json: async () => next.body }
    }
    return Object.assign(fn, { calls })
  }
  const row = (id, name, ms) => ({ id, name, time_ms: ms, created_at: '2026-11-25T18:00:00Z' })

  test('loads the top times by name and time, with the publishable key', async () => {
    const fetch = fakeFetch({ status: 200, body: [row(1, 'Ada', 58000), row(2, 'Bo', 59000)] })
    const board = createOnlineBoard(createLeaderboard(memory()), ONLINE, fetch)
    expect(board.online).toBe(false)
    await board.load()
    expect(board.online).toBe(true)
    expect(board.entries().map((e) => [e.name, e.timeMs])).toEqual([['Ada', 58000], ['Bo', 59000]])
    expect(fetch.calls[0].url).toBe('https://db.example/rpc/kart_board_top')
    expect(fetch.calls[0].headers.apikey).toBe('sb_publishable_test')
  })

  test('submits a validated entry and returns its rank', async () => {
    const fetch = fakeFetch({ status: 200, body: [{ id: 7, rank: 2, created_at: '2026-11-25T18:01:00Z' }] }, { status: 200, body: [row(1, 'Ada', 58000), row(7, 'Cy', 60000)] })
    const board = createOnlineBoard(createLeaderboard(memory()), ONLINE, fetch)
    const res = await board.add({ name: '  Cy ', email: ' cy@example.com ', timeMs: 60000.4 })
    expect(res).toMatchObject({ ok: true, rank: 2, entry: { id: 7, name: 'Cy' } })
    expect(fetch.calls[0].body).toEqual({ p_name: 'Cy', p_email: 'cy@example.com', p_time_ms: 60000 })
    expect(board.entries()).toHaveLength(2)
  })

  test('maps the database\'s refusals to form errors, and never sends an invalid form', async () => {
    const fetch = fakeFetch({ status: 400, body: { message: 'time' } }, { status: 400, body: { message: 'rate' } }, { status: 500, body: null })
    const board = createOnlineBoard(createLeaderboard(memory()), ONLINE, fetch)
    expect(await board.add({ name: '', email: 'a@b.co', timeMs: 60000 })).toMatchObject({ ok: false, field: 'name' })
    expect(fetch.calls).toHaveLength(0)
    expect((await board.add({ name: 'Ada', email: 'a@b.co', timeMs: 1000 })).error).toMatch(/can.t be right/)
    expect((await board.add({ name: 'Ada', email: 'a@b.co', timeMs: 60000 })).error).toMatch(/Too many/)
    expect((await board.add({ name: 'Ada', email: 'a@b.co', timeMs: 60000 })).error).toMatch(/Couldn.t save online/)
  })

  test('offline: shows and saves to this device instead', async () => {
    const storage = memory()
    const fetch = fakeFetch(new Error('offline'), new Error('offline'))
    const board = createOnlineBoard(createLeaderboard(storage), ONLINE, fetch)
    await board.load()
    expect(board.online).toBe(false)
    const res = await board.add({ name: 'Ada', email: 'ada@example.com', timeMs: 58000 })
    expect(res).toMatchObject({ ok: true, rank: 1, offline: true })
    expect(createLeaderboard(storage).entries()).toHaveLength(1)
  })
})
