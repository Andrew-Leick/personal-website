// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from 'vitest'
import { setCurrentIntro, startIntros, stopIntros, tickIntros } from '../intros.js'
import { registerBall } from '../state.js'

// Every element measures as a laid-out 40px box on screen, so throws really fly.
Element.prototype.getBoundingClientRect = () => ({ x: 10, y: 10, left: 10, top: 10, right: 50, bottom: 50, width: 40, height: 40 })

function section(id) {
  const h2 = document.createElement('h2')
  h2.innerHTML = `<span data-intro="${id}"><span data-part="ball"><span data-part="top"></span></span><span data-part="flash"></span><span data-part="pokemon"></span></span>`
  const rail = document.createElement('span')
  rail.innerHTML = '<span data-part="ball"></span>'
  document.body.append(h2, rail)
  registerBall(id, rail)
  return h2
}

afterEach(() => {
  stopIntros()
  document.body.innerHTML = ''
})

test('leaving a section mid-opening sends a clean (not whitened) ball home', async () => {
  const heading = section('a')
  section('b')
  startIntros(['a', 'b'])
  setCurrentIntro('a')
  tickIntros()
  const ball = heading.querySelector('[data-part="ball"]')
  // The throw lands and the opening starts washing the ball out to white.
  await vi.waitFor(() => expect(ball.style.filter).not.toBe(''), { timeout: 2000 })

  setCurrentIntro('b')

  const copy = document.querySelector('[data-flight]')
  expect(copy).not.toBeNull()
  expect(copy.style.filter).toBe('')
  expect(heading.hasAttribute('data-pending')).toBe(true)
})
