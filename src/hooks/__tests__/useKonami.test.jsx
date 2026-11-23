// @vitest-environment happy-dom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import useKonami, { KONAMI } from '../useKonami.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root
let container
let onCode
beforeEach(() => {
  onCode = vi.fn()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const Probe = () => {
    useKonami(onCode)
    return createElement('input', { id: 'field' })
  }
  act(() => root.render(createElement(Probe)))
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const press = (keys, target = window) =>
  keys.forEach((key) => target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })))

test('the full code calls back once, and again when typed again', () => {
  press(KONAMI)
  expect(onCode).toHaveBeenCalledTimes(1)
  press(KONAMI)
  expect(onCode).toHaveBeenCalledTimes(2)
})

test('B and A count in either case', () => {
  press([...KONAMI.slice(0, 8), 'B', 'A'])
  expect(onCode).toHaveBeenCalledTimes(1)
})

test('a wrong key starts over; an extra up keeps the two ups', () => {
  press(['ArrowUp', 'ArrowUp', 'ArrowDown', 'x', ...KONAMI.slice(3)])
  expect(onCode).not.toHaveBeenCalled()
  press(['ArrowUp', ...KONAMI])
  expect(onCode).toHaveBeenCalledTimes(1)
})

test('keys typed into a form field do not count', () => {
  press(KONAMI, document.getElementById('field'))
  expect(onCode).not.toHaveBeenCalled()
})
