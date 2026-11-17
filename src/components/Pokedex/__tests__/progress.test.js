// @vitest-environment happy-dom
import { afterEach, expect, test } from 'vitest'
import { loadProgress, record, resetProgressMemory, tally } from '../progress.js'

afterEach(() => {
  window.localStorage.clear()
  resetProgressMemory()
})

const all = ['work:a', 'work:b', 'project:c']

test('starts empty, and a stored copy round-trips', () => {
  expect(tally(loadProgress(), all)).toEqual({ seen: 0, caught: 0, total: 3, complete: false })
  record(loadProgress(), { seen: ['work:a', 'work:b'], caught: ['work:a'] }, all)
  expect(tally(loadProgress(), all)).toEqual({ seen: 2, caught: 1, total: 3, complete: false })
})

test('a catch also counts as seen, and nothing new returns the same object', () => {
  const start = loadProgress()
  const { progress } = record(start, { caught: ['project:c'] }, all)
  expect(progress.seen.has('project:c')).toBe(true)
  expect(record(progress, { seen: ['project:c'], caught: ['project:c'] }, all).progress).toBe(progress)
})

test('completing the dex is reported exactly once, ever', () => {
  let p = loadProgress()
  let result = record(p, { caught: ['work:a', 'work:b'] }, all)
  expect(result.justCompleted).toBe(false)
  result = record(result.progress, { caught: ['project:c'] }, all)
  expect(result.justCompleted).toBe(true)
  expect(result.progress.complete).toBe(true)
  p = loadProgress()
  expect(p.complete).toBe(true)
  expect(record(p, { caught: ['work:a'] }, all).justCompleted).toBe(false)
})

test('keys of entries no longer in the dex do not count toward the tally', () => {
  record(loadProgress(), { caught: ['work:gone', 'work:a'] }, all)
  expect(tally(loadProgress(), all)).toMatchObject({ seen: 1, caught: 1 })
})

test('broken or blocked storage falls back to memory', () => {
  window.localStorage.setItem('pokedex-progress', '{not json')
  expect(tally(loadProgress(), all).seen).toBe(0)
  const original = window.localStorage.setItem
  window.localStorage.setItem = () => {
    throw new Error('blocked')
  }
  try {
    window.localStorage.removeItem('pokedex-progress')
    record(loadProgress(), { caught: ['work:b'] }, all)
    expect(tally(loadProgress(), all).caught).toBe(1)
  } finally {
    window.localStorage.setItem = original
  }
})
