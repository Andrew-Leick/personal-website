// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { swapStarter } from '../useJourneyScroll.js'

// A hero slot with its starter, and the rail ball that sits over it.
function starter() {
  const heroSlot = document.createElement('span')
  heroSlot.innerHTML = '<span data-part="flash"></span><span data-part="pokemon"></span>'
  const mover = document.createElement('span')
  mover.innerHTML = '<span data-part="ball"><span data-part="top"></span></span>'
  return {
    heroSlot,
    mover,
    heroPokemon: heroSlot.querySelector('[data-part="pokemon"]'),
    heroFlash: heroSlot.querySelector('[data-part="flash"]'),
    ballPart: mover.querySelector('[data-part="ball"]'),
    lid: mover.querySelector('[data-part="top"]'),
  }
}

const state = (b) => ({ in: b.heroSlot.hasAttribute('data-in'), ballHidden: b.mover.hasAttribute('data-starter-out') })

describe('swapStarter (hero starters, without animation)', () => {
  it('out: the starter shows and the ball over it is hidden', () => {
    const b = starter()
    swapStarter(b, true, false)
    expect(state(b)).toEqual({ in: false, ballHidden: true })
  })

  it('in: the starter hides and the ball shows, ready to glide', () => {
    const b = starter()
    swapStarter(b, true, false)
    swapStarter(b, false, false)
    expect(state(b)).toEqual({ in: true, ballHidden: false })
  })

  it('a newer swap wins over an animated one still running', async () => {
    const b = starter()
    swapStarter(b, false, false)
    swapStarter(b, true, true) // starts coming out (its end would hide the ball)
    swapStarter(b, false, false) // scrolled away again before it finished
    await new Promise((resolve) => setTimeout(resolve, 900))
    expect(state(b)).toEqual({ in: true, ballHidden: false })
  })
})
