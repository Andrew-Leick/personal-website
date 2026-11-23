// @vitest-environment happy-dom
// Spec v4.9 (V4-57..V4-59). The CSS draws a heading's dashed ring for
// `.title[data-pending]:not([data-landed]) .intro[data-out]` (see introsRingCss.test.js), so
// here "ring on" is that attribute state. After every mutation batch (the states a frame could
// paint) a MutationObserver checks
//   I1: ring on ⇒ the rail link is [data-out] or a [data-flight] copy is in the air
//       (never a ring beside a ball resting in the rail), and the slot's [data-out] equals the link's;
// and after every tick the tests check
//   I2: a waiting heading whose slot is on screen has had its ball thrown (no visible slot waits).
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import useSectionReveal from '../../../hooks/useSectionReveal.js'
import { startIntros, stopIntros, tickIntros } from '../intros.js'
import { beginGlide, endGlide, registerBall } from '../state.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// Reduced motion is switched per test (motion.js caches its MediaQueryList, so mock the module).
const motion = vi.hoisted(() => ({ reduced: false }))
vi.mock('../../motion.js', () => ({ prefersReducedMotion: () => motion.reduced }))

// Every element measures as a laid-out 40px box at `top` 10 (on screen), except a heading, its
// slot and the slot's contents, which sit at `tops[id]` (set it far off to scroll a heading away).
// The phone dock (when a test adds one) sits at `dockTop`.
const tops = {}
let dockTop = 0
const box = (top, height = 40) => ({ x: 10, y: top, left: 10, top, right: 50, bottom: top + height, width: 40, height })
Element.prototype.getBoundingClientRect = function () {
  if (this.matches('[data-rail-dock]')) return { ...box(dockTop, 64), right: 400, width: 400 }
  const intro = this.closest?.('[data-intro]') ?? (this.matches('h2') ? this.querySelector('[data-intro]') : null)
  if (intro) return box(tops[intro.getAttribute('data-intro')] ?? 10)
  return box(10)
}

let ids = []
let observer = null
let violations = []
let log = []

function section(id) {
  const h2 = document.createElement('h2')
  h2.innerHTML = `<span data-intro="${id}"><span data-ring></span><span data-part="ball"><span data-part="top"></span></span><span data-part="flash"></span><span data-part="pokemon"></span></span>`
  const link = document.createElement('a')
  link.setAttribute('data-rail-link', id)
  link.innerHTML = '<span data-rail-ball><span data-part="ball"></span></span>'
  document.body.append(h2, link)
  registerBall(id, link.firstElementChild)
}

const slot = (id) => document.querySelector(`[data-intro="${id}"]`)
const heading = (id) => slot(id).closest('h2')
const link = (id) => document.querySelector(`[data-rail-link="${id}"]`)
const marks = (id) => [slot(id).hasAttribute('data-out'), link(id).hasAttribute('data-out')]
const flights = () => document.querySelectorAll('[data-flight]').length
const ringOn = (id) => {
  const h = heading(id)
  return h.hasAttribute('data-pending') && !h.hasAttribute('data-landed') && slot(id).hasAttribute('data-out')
}
const onScreen = (id) => (tops[id] ?? 10) < window.innerHeight && (tops[id] ?? 10) + 40 > 0
const show = (id) => { tops[id] = 10 }
const hide = (id) => { tops[id] = -5000 }

function check(where) {
  for (const id of ids) {
    const [s, l] = marks(id)
    if (s !== l) violations.push(`${where}: ${id} slot data-out=${s}, link data-out=${l}`)
    if (ringOn(id) && !l && flights() === 0) violations.push(`${where}: ${id} ring on with its ball in the rail`)
  }
}

/** Run a frame of the engine, then I2: no waiting heading on screen keeps its ball in the rail. */
function frame() {
  tickIntros()
  for (const id of ids) {
    if (onScreen(id) && heading(id).hasAttribute('data-pending') && !link(id).hasAttribute('data-out')) {
      violations.push(`tick: ${id} slot on screen, ball still in the rail`)
    }
  }
}

function setup(sectionIds, visible = sectionIds) {
  ids = sectionIds
  ids.forEach((id) => (visible.includes(id) ? show(id) : hide(id)))
  ids.forEach(section)
  observer.observe(document.body, { subtree: true, childList: true, attributes: true })
  startIntros(ids)
}

beforeEach(() => {
  violations = []
  log = []
  observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'attributes' && r.attributeName === 'data-out') {
        log.push(`${r.target.getAttribute('data-rail-link') ?? `slot:${r.target.getAttribute('data-intro')}`}:${r.target.hasAttribute('data-out')}`)
      }
    }
    check('mutation')
  })
})

afterEach(() => {
  stopIntros()
  check('after stop')
  observer.disconnect()
  expect(violations).toEqual([])
  for (const id of ids) expect(marks(id)).toEqual([false, false])
  document.body.innerHTML = ''
  Object.keys(tops).forEach((id) => delete tops[id])
  motion.reduced = false
  dockTop = 0
})

const settle = () => vi.waitFor(() => expect(flights()).toBe(0), { timeout: 3000 })
const wait = () => new Promise((resolve) => setTimeout(resolve, 30))

test('a waiting heading off screen keeps its ball in the rail (and draws no ring)', () => {
  setup(['a', 'b'], [])
  frame()
  for (const id of ids) {
    expect(heading(id).hasAttribute('data-pending')).toBe(true)
    expect(marks(id)).toEqual([false, false])
    expect(ringOn(id)).toBe(false)
  }
})

test('a slot coming on screen is thrown in that same frame: ring and throw start together', () => {
  setup(['a', 'b'], ['a'])
  frame()
  expect(flights()).toBe(1)
  expect(marks('a')).toEqual([true, true])
  expect(ringOn('a')).toBe(true)
  expect(ringOn('b')).toBe(false)
})

test('two headings on screen: both balls are thrown, both rings show', () => {
  setup(['a', 'b'], ['a', 'b'])
  frame()
  expect(flights()).toBe(2)
  expect(ringOn('a')).toBe(true)
  expect(ringOn('b')).toBe(true)
})

test('the ring goes as the ball lands, and the ball stays out while the heading is shown', async () => {
  setup(['a'])
  frame()
  await vi.waitFor(() => expect(heading('a').hasAttribute('data-landed')).toBe(true), { timeout: 3000 })
  expect(ringOn('a')).toBe(false)
  expect(marks('a')).toEqual([true, true])
  await vi.waitFor(() => expect(heading('a').hasAttribute('data-pending')).toBe(false), { timeout: 3000 })
  frame()
  expect(marks('a')).toEqual([true, true])
})

test('a heading scrolled away sends its ball home; back on screen, it is thrown again', async () => {
  setup(['a'])
  frame()
  await vi.waitFor(() => expect(heading('a').hasAttribute('data-pending')).toBe(false), { timeout: 3000 })
  hide('a')
  frame()
  await settle()
  expect(marks('a')).toEqual([false, false])
  expect(heading('a').hasAttribute('data-pending')).toBe(true)
  show('a')
  frame()
  expect(flights()).toBe(1)
  expect(ringOn('a')).toBe(true)
})

test('scrolled away mid-flight: the ball turns around, data-out holds until it is home', async () => {
  setup(['a'])
  frame()
  hide('a')
  frame()
  expect(flights()).toBe(1)
  expect(marks('a')).toEqual([true, true])
  await settle()
  expect(marks('a')).toEqual([false, false])
})

test('back on screen while flying home: it turns toward the heading and never drops data-out', async () => {
  setup(['a'])
  frame()
  hide('a')
  frame() // turned around toward the rail
  log = []
  show('a')
  frame() // and back toward the heading
  expect(ringOn('a')).toBe(true)
  await vi.waitFor(() => expect(heading('a').hasAttribute('data-pending')).toBe(false), { timeout: 3000 })
  expect(log.filter((entry) => entry.endsWith(':false'))).toEqual([])
  expect(marks('a')).toEqual([true, true])
})

test('visibility ping-pong settles clean', async () => {
  setup(['a', 'b', 'c'], [])
  for (const visible of [['a'], ['a', 'b'], ['b'], ['b', 'c'], [], ['c'], ['a']]) {
    ids.forEach((id) => (visible.includes(id) ? show(id) : hide(id)))
    frame()
    await wait()
  }
  await settle()
  await vi.waitFor(() => expect(heading('a').hasAttribute('data-pending')).toBe(false), { timeout: 3000 })
  expect(marks('a')).toEqual([true, true])
  expect(marks('b')).toEqual([false, false])
  expect(marks('c')).toEqual([false, false])
})

test('during a glide nothing is thrown or recalled; at its end visible slots are thrown', () => {
  setup(['a', 'b'], ['a', 'b'])
  beginGlide('b')
  tickIntros()
  expect(flights()).toBe(0)
  expect(marks('a')).toEqual([false, false])
  expect(ringOn('a')).toBe(false) // passed headings show no ring: their balls never left the rail
  endGlide()
  frame()
  expect(marks('a')).toEqual([true, true])
  expect(marks('b')).toEqual([true, true])
})

test('stopIntros mid-flight clears every mark with the flights', () => {
  setup(['a', 'b'])
  frame()
  stopIntros()
  expect(flights()).toBe(0)
  expect(marks('a')).toEqual([false, false])
  expect(document.querySelectorAll('[data-pending], [data-landed]').length).toBe(0)
})

test('reduced motion: the ball lands at once, so the ring never shows', async () => {
  motion.reduced = true
  setup(['a', 'b'], ['a'])
  frame()
  expect(flights()).toBe(0)
  expect(ringOn('a')).toBe(false)
  // It finishes after two animation frames (nextPaint), which can take longer than a fixed wait.
  await vi.waitFor(() => expect(heading('a').hasAttribute('data-pending')).toBe(false), { timeout: 3000 })
})

test('reduced motion turning on mid-visit stops the intros (useSectionReveal)', async () => {
  const listeners = new Set()
  const query = {
    matches: false,
    addEventListener: (type, fn) => listeners.add(fn),
    removeEventListener: (type, fn) => listeners.delete(fn),
  }
  const original = window.matchMedia
  window.matchMedia = () => query
  ids = ['a', 'b']
  show('a')
  hide('b')
  ids.forEach(section)
  observer.observe(document.body, { subtree: true, childList: true, attributes: true })
  const pages = ids.map((id) => ({ id }))
  const Probe = () => {
    useSectionReveal({ enabled: true, pages })
    return null
  }
  const root = createRoot(document.createElement('div'))
  try {
    await act(async () => root.render(createElement(Probe)))
    expect(document.querySelectorAll('[data-pending]').length).toBe(2)
    frame()
    expect(flights()).toBe(1)

    query.matches = true
    motion.reduced = true
    listeners.forEach((fn) => fn({ matches: true }))
    // Finished headings, every ball home, nothing in the air.
    expect(document.querySelectorAll('[data-pending], [data-landed]').length).toBe(0)
    expect(flights()).toBe(0)
    expect(marks('a')).toEqual([false, false])

    await act(async () => root.unmount())
    expect(listeners.size).toBe(0)
  } finally {
    window.matchMedia = original
  }
})

test('behind the solid phone dock a slot is not seen; behind a dock still fading in, it is', () => {
  setup(['a'])
  const dock = document.createElement('span')
  dock.setAttribute('data-rail-dock', '')
  document.body.append(dock)
  dockTop = 5 // the slot (top 10) is entirely behind the dock
  tickIntros()
  expect(flights()).toBe(0)
  dock.style.opacity = '0.5' // the dock is still fading in: the slot shows through, so throw it
  frame()
  expect(flights()).toBe(1)
  expect(ringOn('a')).toBe(true)
})

test('a slot clearing the solid dock top by a pixel is thrown; with the dock hidden the window counts', () => {
  setup(['a', 'b'], ['a'])
  const dock = document.createElement('span')
  dock.setAttribute('data-rail-dock', '')
  document.body.append(dock)
  dockTop = 11 // one pixel of a's slot (top 10) above the dock
  frame()
  expect(flights()).toBe(1)
  dock.style.display = 'none'
  tops.b = 700 // below the old dock top, inside the window (happy-dom innerHeight 768)
  frame()
  expect(flights()).toBe(2)
})
