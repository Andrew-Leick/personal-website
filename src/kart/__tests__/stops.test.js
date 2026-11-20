import { describe, expect, it } from 'vitest'
import { getKart, getSectionHref } from '../../lib/content/index.js'
import { buildStops } from '../stops.js'

describe('buildStops', () => {
  it('maps the shipped kart.json in order, every stop linked', () => {
    const kart = getKart()
    const stops = buildStops(kart, getSectionHref)
    expect(stops.map((s) => s.id)).toEqual(kart.stops.map((s) => s.id))
    for (const stop of stops) {
      expect(Object.keys(stop)).toEqual(['id', 'label', 'text', 'href'])
      expect(stop.href).toMatch(/#/)
    }
  })

  it('uses the given resolver and tolerates missing content', () => {
    const kart = { stops: [{ id: 'a', label: 'A', text: 't', ref: 'skills' }] }
    expect(buildStops(kart, (id) => `/x/#${id}`)).toEqual([{ id: 'a', label: 'A', text: 't', href: '/x/#skills' }])
    expect(buildStops(null, () => null)).toEqual([])
  })
})
