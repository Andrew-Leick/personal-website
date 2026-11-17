// @vitest-environment happy-dom
// @vitest-environment-options {"url": "http://localhost/projects"}
import { expect, test } from 'vitest'

test('an alias URL is replaced with its page plus the alias hash, without a new entry (V5-07)', async () => {
  const before = window.history.length
  const { navigate } = await import('../history.js')
  expect(window.location.pathname + window.location.hash).toBe('/experience/#pokedex-projects')
  expect(window.history.length).toBe(before)

  navigate('/projects/')
  expect(window.location.pathname + window.location.hash).toBe('/experience/#pokedex-projects')
  navigate('/projects/#pokedex-all') // an explicit hash wins
  expect(window.location.hash).toBe('#pokedex-all')
  navigate('/education')
  expect(window.location.pathname + window.location.hash).toBe('/education/')
})

test('scroll spy keeps a #pokedex-* hash on its page and drops other hashes (V5-07, V5-17)', async () => {
  const { navigate, replaceFromScroll } = await import('../history.js')
  navigate('/experience/#pokedex-all')
  replaceFromScroll('/experience/')
  expect(window.location.pathname + window.location.hash).toBe('/experience/#pokedex-all')
  replaceFromScroll('/education/')
  expect(window.location.pathname + window.location.hash).toBe('/education/')
  navigate('/about/#contact')
  replaceFromScroll('/about/')
  expect(window.location.pathname + window.location.hash).toBe('/about/')
})
