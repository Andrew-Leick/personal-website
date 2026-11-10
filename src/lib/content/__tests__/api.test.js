// The public API, loaded through Vite exactly as the frontend uses it (real data files).
import { describe, expect, test } from 'vitest'
import * as api from '../index.js'

describe('public API (7.2)', () => {
  test('exports exactly the specified functions', () => {
    expect(Object.keys(api).sort()).toEqual(
      ['formatDateRange', 'formatMonth', 'getEducation', 'getExperience', 'getLinks', 'getProfile', 'getProjects', 'getSections', 'getSite', 'getSiteContent', 'getSkills', 'isPlaceholder'].sort(),
    )
    for (const fn of Object.values(api)) expect(typeof fn).toBe('function')
  })

  test('getSiteContent bundles every getter result', () => {
    const c = api.getSiteContent()
    expect(c).toEqual({
      site: api.getSite(), profile: api.getProfile(), links: api.getLinks(), experience: api.getExperience(),
      education: api.getEducation(), projects: api.getProjects(), skills: api.getSkills(), sections: api.getSections(),
    })
    expect(Object.isFrozen(c)).toBe(true)
  })

  test('real data has the 7.3 shapes', () => {
    const site = api.getSite()
    expect(Object.keys(site).sort()).toEqual(['defaultTheme', 'description', 'locale', 'ogImage', 'ogImageAlt', 'siteUrl', 'themeToggle', 'title'])
    const profile = api.getProfile()
    expect(Object.keys(profile).sort()).toEqual(['about', 'availability', 'contactBlurb', 'currently', 'email', 'headline', 'location', 'name', 'photo', 'resumeUrl', 'summary'].sort())
    for (const l of api.getLinks()) expect(Object.keys(l).sort()).toEqual(['id', 'isExternal', 'kind', 'label', 'showInHero', 'url'])
    for (const e of api.getExperience()) expect(Object.keys(e).sort()).toEqual(['dateLabel', 'employmentType', 'end', 'highlights', 'id', 'location', 'organization', 'organizationUrl', 'role', 'start', 'summary', 'technologies'])
    for (const e of api.getEducation()) expect(Object.keys(e).sort()).toEqual(['coursework', 'dateLabel', 'degree', 'degreeLabel', 'end', 'expected', 'field', 'gpa', 'honors', 'id', 'institution', 'institutionUrl', 'location', 'minor', 'start'])
    for (const p of api.getProjects()) expect(Object.keys(p).sort()).toEqual(['context', 'contextLabel', 'dateLabel', 'end', 'featured', 'githubStats', 'highlights', 'id', 'image', 'links', 'order', 'primaryUrl', 'role', 'start', 'status', 'statusLabel', 'summary', 'teamSize', 'technologies', 'title'])
    for (const g of api.getSkills()) expect(Object.keys(g).sort()).toEqual(['id', 'items', 'name'])
    for (const s of api.getSections()) expect(s.index).toMatch(/^\d{2}$/)
  })

  test('Andrew decided: no locations rendered', () => {
    expect(api.getProfile().location).toBeNull()
    for (const e of [...api.getExperience(), ...api.getEducation()]) expect(e.location).toBeNull()
  })
})
