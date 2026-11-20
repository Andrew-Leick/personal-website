// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import About from '../About.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root
let container
function render(profile, fanArt = true) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  act(() => root.render(<About profile={profile} fanArt={fanArt} />))
}

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const profile = { about: ['Hi.'], currently: null, availability: null, photo: null, avatar: 'trainer' }

describe('About trainer (the Konami tip)', () => {
  it('the trainer is a button that shows and hides a tip with the code', () => {
    render(profile)
    const button = container.querySelector('button[aria-controls="trainer-tip"]')
    const tip = container.querySelector('#trainer-tip')
    expect(button.textContent).toBe('Trainer tip')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(tip.hidden).toBe(true)

    act(() => button.click())
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(tip.hidden).toBe(false)
    expect(tip.textContent).toContain('up, up, down, down, left, right, left, right, B, A')

    act(() => button.click())
    expect(tip.hidden).toBe(true)
  })

  it('Escape closes the tip', () => {
    render(profile)
    const button = container.querySelector('button[aria-controls="trainer-tip"]')
    act(() => button.click())
    act(() => button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(container.querySelector('#trainer-tip').hidden).toBe(true)
  })

  it('no trainer (and no tip) with fan art off', () => {
    render(profile, false)
    expect(container.querySelector('#trainer-tip')).toBeNull()
  })
})
