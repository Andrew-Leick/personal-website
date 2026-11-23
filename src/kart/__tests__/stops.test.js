import { describe, expect, it } from 'vitest'
import { loadAndValidate } from '../../../scripts/lib/content-files.mjs'
import { normalizeContent } from '../../lib/content/normalize.js'
import { sectionHrefOf } from '../../lib/content/routes.js'
import { buildStops } from '../stops.js'

describe('buildStops', () => {
  it('maps the shipped kart.json in order, every stop linked', () => {
    const content = normalizeContent(loadAndValidate().raw)
    const kart = content.kart
    const stops = buildStops(kart, (id) => sectionHrefOf(id, content))
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
