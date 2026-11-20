// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Pokedex from '../Pokedex.jsx'
import { resetProgressMemory } from '../progress.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// Fixture matching the SPEC-v5.1 data contract (DexEntry / Dex).
function entry(kind, id, number, pokemon = null) {
  return {
    key: `${kind}:${id}`,
    kind,
    id,
    number,
    name: `${kind} ${id}`,
    subtitle: `Org ${id}`,
    subtitleUrl: null,
    dateLabel: 'Jun 2025 – Present',
    start: '2025-06',
    end: null,
    typeLabel: kind === 'work' ? 'Work' : 'Project',
    tagLabel: null,
    featured: false,
    summary: 'Summary',
    role: null,
    highlights: ['One'],
    technologies: ['React'],
    links: kind === 'work' ? null : { repo: 'https://github.com/x/y', demo: null, writeup: null },
    primaryUrl: null,
    githubStats: null,
    image: null,
    pokemon,
  }
}

function makeDex(nWork, nProjects) {
  return {
    work: Array.from({ length: nWork }, (_, i) => entry('work', `w${i}`, i + 1, i === 0 ? 'pikachu' : null)),
    projects: Array.from({ length: nProjects }, (_, i) => entry('project', `p${i}`, i + 1, 'noctowl')),
  }
}

let root
let container
function render(dex, fanArt = true) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  act(() => root.render(<Pokedex dex={dex} fanArt={fanArt} headingLevel={3} />))
}

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  window.localStorage.clear()
  resetProgressMemory()
  // Reset the router too (it keeps the last navigation's hash), so no test opens a dex by hash.
  window.history.replaceState(null, '', '/')
  act(() => window.dispatchEvent(new PopStateEvent('popstate')))
})

const $ = (sel) => container.querySelector(sel)
const $$ = (sel) => [...container.querySelectorAll(sel)]
const button = (text) => $$('button').find((b) => b.textContent.replace(/[◀▶]/g, '').trim().startsWith(text))
const click = (el) => act(() => el.click())
const focused = () => document.activeElement
const tiles = () => $$('[id^="pokedex-tile-"]')

describe('Pokedex', () => {
  it('starts closed: the title and one key to view experience and projects, no screen', () => {
    render(makeDex(2, 1))
    expect($('#pokedex > p').textContent).toBe('Pokédex')
    expect($('#pokedex-open').textContent).toBe('View experience and projects')
    expect($('[id^="pokedex-"][id$="-heading"]')).toBeNull()
    expect($('[class*="lid"]')).toBeNull() // no lid on first render
    expect(focused()).toBe(document.body) // nothing moves focus on load
  })

  it('Open shows the start screen, focuses its heading and offers each dex with its count', () => {
    render(makeDex(2, 1))
    click($('#pokedex-open'))
    expect(focused().id).toBe('pokedex-start-heading')
    expect(focused().textContent).toBe('What would you like to see?')
    expect($('#pokedex-pick-experience').textContent).toBe('Experience 2')
    expect($('#pokedex-pick-projects').textContent).toBe('Projects 1')
    expect($('[aria-hidden="true"][class*="lid"]')).not.toBeNull() // the lid swings away
  })

  it('the screen scrolls: a focusable region named by the current heading', () => {
    render(makeDex(2, 1))
    click($('#pokedex-open'))
    const view = $('[role="region"]')
    expect(view.tabIndex).toBe(0)
    expect(view.getAttribute('aria-labelledby')).toBe('pokedex-start-heading')
    click($('#pokedex-pick-experience'))
    click(tiles()[0])
    expect($('[role="region"]').getAttribute('aria-labelledby')).toBe('pokedex-entry-heading')
  })

  it('a dex is a grid of Pokémon: sprite, number, a label naming the entry and the role', () => {
    const dex = makeDex(2, 1)
    dex.work[1] = { ...dex.work[1], start: '2020-08', end: '2024-05' }
    render(dex)
    click($('#pokedex-open'))
    click($('#pokedex-pick-experience'))
    expect(focused().id).toBe('pokedex-experience-heading')
    expect(tiles()).toHaveLength(2)
    const [first, second] = tiles()
    expect(first.querySelector('img').dataset.sprite).toBe('pikachu')
    expect(second.querySelector('svg').dataset.sprite).toBe('egg') // no pokemon: the egg
    // Organization and years, then the role on its own line; a span of years shows as a range.
    expect(first.textContent).toBe('#001Org w0 2025work w0')
    expect(second.textContent).toBe('#002Org w1 2020–2024work w1')
    // The name starts with the visible text, then the role; no stray space before the comma.
    expect(first.getAttribute('aria-label')).toBe('#001 Org w0 2025, work w0')
    expect(second.getAttribute('aria-label')).toBe('#002 Org w1 2020–2024, work w1')
    expect($('#pokedex-experience')).not.toBeNull() // the screen is the #pokedex-{view} target
  })

  it('a Pokémon opens its showcase; back returns to its tile; previous and next step through', () => {
    render(makeDex(3, 1))
    click($('#pokedex-open'))
    click($('#pokedex-pick-experience'))
    click(tiles()[1])
    expect(focused().id).toBe('pokedex-entry-heading')
    expect(focused().textContent).toBe('work w1')
    expect($('[class*="detail"] p').textContent).toBe('#002')
    click(button('Next'))
    expect(focused().textContent).toBe('work w2')
    expect(button('Next').disabled).toBe(true)
    click(button('Previous'))
    click(button('Previous'))
    expect(focused().textContent).toBe('work w0')
    expect(button('Previous').disabled).toBe(true)
    click(button('Experience'))
    expect(focused().id).toBe('pokedex-tile-0')
  })

  it('Menu goes back to the start screen; Close swings the lid shut, then shows the cover', () => {
    render(makeDex(1, 1))
    click($('#pokedex-open'))
    click($('#pokedex-pick-projects'))
    click(button('Menu'))
    expect(focused().id).toBe('pokedex-pick-projects')
    click(button('Close'))
    const closingLid = $('[data-state="closing"]')
    expect(closingLid).not.toBeNull() // the closing animation plays over the screen
    expect($('[role="region"]').inert).toBe(true) // nothing under the lid can be used meanwhile
    const end = new Event('transitionend', { bubbles: true })
    Object.defineProperty(end, 'propertyName', { value: 'transform' })
    act(() => closingLid.dispatchEvent(end))
    expect($('[data-state="closing"]')).toBeNull()
    expect(focused().id).toBe('pokedex-open')
    expect(tiles()).toHaveLength(0)
  })

  it('Close during the opening swing turns the same lid around instead of replacing it', () => {
    render(makeDex(1, 1))
    click($('#pokedex-open'))
    const lid = $('[data-state="open"]')
    expect(lid).not.toBeNull()
    click(button('Close'))
    expect($('[data-state="closing"]')).toBe(lid) // same element: the transition retargets
    expect($$('[class*="lid"]')).toHaveLength(1)
  })

  it('closes even if the closing animation never reports its end', () => {
    vi.useFakeTimers()
    try {
      render(makeDex(1, 1))
      click($('#pokedex-open'))
      click(button('Close'))
      expect($('#pokedex-open')).toBeNull()
      act(() => vi.advanceTimersByTime(1100))
      expect($('#pokedex-open')).not.toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('#pokedex-{view} opens that dex directly, on load and on navigation', () => {
    window.history.replaceState(null, '', '/experience/#pokedex-projects')
    act(() => window.dispatchEvent(new PopStateEvent('popstate')))
    render(makeDex(2, 1))
    expect($('#pokedex-projects')).not.toBeNull()
    expect(tiles()).toHaveLength(1)
    expect($('[class*="lid"]')).toBeNull() // no lid on a deep link
    act(() => {
      window.history.replaceState(null, '', '/experience/#pokedex-experience')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(tiles()).toHaveLength(2)
  })

  it('fan art off: eggs and the neutral name', () => {
    render(makeDex(1, 0), false)
    expect($('#pokedex > p').textContent).toBe('Index')
    click($('#pokedex-open'))
    click($('#pokedex-pick-experience'))
    expect(tiles()[0].querySelector('svg').dataset.sprite).toBe('egg')
  })

  it('offers only the dexes that have entries, and renders nothing when both are empty', () => {
    render(makeDex(0, 2))
    click($('#pokedex-open'))
    expect($('#pokedex-pick-experience')).toBeNull()
    expect($('#pokedex-pick-projects')).not.toBeNull()
    act(() => root.unmount())
    container.remove()
    render(makeDex(0, 0))
    expect(container.innerHTML).toBe('')
  })

  it('keeps every entry of both dexes in a hidden print copy, grouped under each dex', () => {
    render(makeDex(2, 1))
    const print = $('[class*="print"]')
    expect(print.hidden).toBe(true)
    const outline = [...print.querySelectorAll('h3, h4')].map((h) => `${h.tagName} ${h.textContent}`)
    expect(outline).toEqual(['H3 Experience', 'H4 work w0', 'H4 work w1', 'H3 Projects', 'H4 project p0'])
  })

  it('shows each entry\'s flavor text in its showcase (SPEC-v6 P-06)', () => {
    const d = makeDex(1, 0)
    d.work[0].dexText = 'It studies hard.'
    render(d)
    click($('#pokedex-open'))
    click($('#pokedex-pick-experience'))
    click(tiles()[0])
    expect($('[class*="flavor"]').textContent).toBe('It studies hard.')
  })

  it('tracks seen and caught on the start screen, and keeps them across visits (SPEC-v6 P-07)', () => {
    render(makeDex(2, 1))
    const tallyText = () => $('[class*="tally"]').textContent.replace(/\s+/g, ' ').trim()
    click($('#pokedex-open'))
    expect(tallyText()).toBe('Seen 0 of 3 · Caught 0 of 3')
    click($('#pokedex-pick-experience'))
    click(tiles()[1])
    click(button('Experience'))
    click(button('Menu'))
    expect(tallyText()).toBe('Seen 2 of 3 · Caught 1 of 3')
    act(() => root.unmount())
    container.remove()
    render(makeDex(2, 1))
    click($('#pokedex-open'))
    expect(tallyText()).toBe('Seen 2 of 3 · Caught 1 of 3')
  })

  it('announces completion once, when the last entry is caught (SPEC-v6 P-07)', () => {
    render(makeDex(1, 1))
    const status = () => $('[role="status"]').textContent
    click($('#pokedex-open'))
    click($('#pokedex-pick-experience'))
    click(tiles()[0])
    expect(status()).toBe('')
    click(button('Experience'))
    click(button('Menu'))
    click($('#pokedex-pick-projects'))
    click(tiles()[0])
    expect(status()).toBe('Pokédex complete! You caught all 2.')
    expect($('[class*="complete"]').textContent).toContain('Pokédex complete!')
    click(button('Projects'))
    click(button('Menu'))
    click($('#pokedex-pick-experience'))
    click(tiles()[0])
    expect($('[class*="complete"]')).toBeNull() // the banner belongs to the entry that completed the dex
    click(button('Experience'))
    click(button('Menu'))
    expect($('[class*="tally"]').textContent).toContain('★ Complete')
    act(() => root.unmount())
    container.remove()
    render(makeDex(1, 1))
    click($('#pokedex-open'))
    click($('#pokedex-pick-projects'))
    click(tiles()[0])
    expect(status()).toBe('') // never announced again
  })

  it('still counts progress when storage is blocked', () => {
    const original = window.localStorage.setItem
    window.localStorage.setItem = () => { throw new Error('blocked') }
    try {
      render(makeDex(1, 0))
      click($('#pokedex-open'))
      click($('#pokedex-pick-experience'))
      click(tiles()[0])
      click(button('Experience'))
      click(button('Menu'))
      expect($('[class*="tally"]').textContent).toContain('Caught 1 of 1')
    } finally {
      window.localStorage.setItem = original
    }
  })
})
