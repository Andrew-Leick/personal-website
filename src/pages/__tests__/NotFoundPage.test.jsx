// @vitest-environment happy-dom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, test } from 'vitest'
import NotFoundPage from '../NotFoundPage.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root
let container
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function render(navItems) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  act(() => root.render(createElement(NotFoundPage, { navItems })))
}

test('the battle menu maps FIGHT, BAG, POKéMON and RUN to the pages, each naming its destination (SPEC-v6 P-08)', () => {
  render([
    { id: 'home', href: '/', label: 'Home' },
    { id: 'experience', href: '/experience/', label: 'Experience' },
    { id: 'education', href: '/education/', label: 'Education' },
    { id: 'about', href: '/about/', label: 'About' },
  ])
  const nav = container.querySelector('nav[aria-label="Where to?"]')
  expect(nav).not.toBeNull()
  const links = [...nav.querySelectorAll('a')].map((a) => [a.textContent, a.getAttribute('href')])
  expect(links).toEqual([
    ['FIGHTExperience', '/experience/'],
    ['BAGEducation', '/education/'],
    ['POKéMONAbout', '/about/'],
    ['RUNHome', '/'],
  ])
})

test('pages the menu does not know keep their own label', () => {
  render([
    { id: 'home', href: '/', label: 'Home' },
    { id: 'blog', href: '/blog/', label: 'Blog' },
  ])
  const texts = [...container.querySelectorAll('nav a')].map((a) => a.textContent)
  expect(texts).toEqual(['RUNHome', 'BlogBlog'])
})
