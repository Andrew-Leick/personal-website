// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from 'vitest'
import { startIntros, stopIntros, tickIntros } from '../intros.js'
import { registerBall } from '../state.js'

// Every element measures as a laid-out 40px box on screen, so throws really fly; a heading
// marked data-away (and what is inside it) measures far above the window, scrolled away.
Element.prototype.getBoundingClientRect = function () {
  const top = this.closest?.('[data-away]') ? -5000 : 10
  return { x: 10, y: top, left: 10, top, right: 50, bottom: top + 40, width: 40, height: 40 }
}

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

test('scrolling a heading away mid-opening leaves a clean (not whitened) ball and a waiting slot', async () => {
  const heading = section('a')
  startIntros(['a'])
  tickIntros()
  const ball = heading.querySelector('[data-part="ball"]')
  // The throw lands and the opening starts washing the ball out to white.
  await vi.waitFor(() => expect(ball.style.filter).not.toBe(''), { timeout: 2000 })

  heading.setAttribute('data-away', '')
  tickIntros()

  expect(ball.style.filter).toBe('')
  expect(heading.hasAttribute('data-pending')).toBe(true)
  expect(document.querySelector('[data-flight]')).toBeNull() // off screen: home at once
})
