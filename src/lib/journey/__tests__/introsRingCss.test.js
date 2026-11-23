// CSS guard for I1 (spec v4.9, V4-58/V4-59): the heading's dashed ring may only turn on, or
// transition at all, under [data-out] on the intro slot (the ball has left the rail; rail.js
// markOut writes it with the rail link's). A rule that shows the ring without it, or a
// transition on the base ring (a fade that could outlive the ball's time away), would let the
// ring show while the ball rests in the rail.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

const css = readFileSync(fileURLToPath(new URL('../../../pages/JourneyPage.module.css', import.meta.url)), 'utf8')

/** Every innermost `selector { declarations }` rule, comments removed (@media bodies included). */
function rules(source) {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, '')
  return [...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
    selectors: selector.split(',').map((s) => s.trim()),
    body,
  }))
}

const declarations = (body) =>
  body
    .split(';')
    .map((d) => d.split(':'))
    .filter((parts) => parts.length > 1)
    .map(([prop, ...value]) => [prop.trim(), value.join(':').trim()])

const turnsOn = ([prop, value]) => prop === 'opacity' && Number.parseFloat(value) !== 0
const transitions = ([prop]) => prop === 'transition' || prop.startsWith('transition-')

const ringRules = rules(css).flatMap(({ selectors, body }) =>
  selectors.filter((s) => s.includes('.slotRing')).map((selector) => ({ selector, decls: declarations(body) })),
)

test('the ring has rules to check', () => {
  expect(ringRules.length).toBeGreaterThan(0)
})

test('every .slotRing rule that turns it on or transitions needs [data-out] on the slot', () => {
  const offending = ringRules
    .filter(({ decls }) => decls.some((d) => turnsOn(d) || transitions(d)))
    .filter(({ selector }) => !selector.includes('.intro[data-out]'))
    .map(({ selector }) => selector)
  expect(offending).toEqual([])
})

test('some rule turns the ring on (the waiting slot keeps its ring)', () => {
  expect(ringRules.some(({ decls }) => decls.some(turnsOn))).toBe(true)
})
