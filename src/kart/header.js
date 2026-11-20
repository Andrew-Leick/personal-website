// Kart page header and footer, mirroring SiteHeader / SiteFooter without React (SPEC-v5 V5-01, V5-15).

const THEMES = ['light', 'dark'] // keep in sync with src/components/ThemeToggle/themes.js
const STORAGE_KEY = 'theme' // same key and values as src/hooks/useTheme.js
const DARK_QUERY = '(prefers-color-scheme: dark)'
const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Tiny DOM builder shared by the kart UI modules. Strings become text nodes (never HTML).
 * Props: `class`, `on<event>` handlers, booleans (true = empty attribute), the rest as attributes.
 * @param {string} tag
 * @param {Record<string, any>|null} [props]
 * @param {...(Node|string|null|false|undefined)} kids
 * @returns {HTMLElement}
 */
export function h(tag, props, ...kids) {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v)
    else el.setAttribute(k, v === true ? '' : v)
  }
  el.append(...kids.filter((kid) => kid != null && kid !== false))
  return el
}

/** Pixel sprite as inline SVG (the site's PixelSprite path recipe): one row run per "o". */
function sprite(grid, className) {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', `0 0 ${grid[0].length} ${grid.length}`)
  svg.setAttribute('class', className)
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('shape-rendering', 'crispEdges')
  const d = grid.map((row, y) => row.replace(/o+/g, (run, x) => `M${x} ${y}h${run.length}v1h-${run.length}z`).replace(/\./g, '')).join('')
  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute('d', d)
  path.setAttribute('fill', 'currentColor')
  svg.append(path)
  return svg
}

// Same glyphs as src/components/Icon/Icon.jsx (moon / sun).
const ICONS = {
  moon: 'M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z',
  sun: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41',
}

function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('class', 'kart-icon')
  svg.setAttribute('aria-hidden', 'true')
  svg.innerHTML = `<path d="${ICONS[name]}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
  return svg
}

function readSaved() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return THEMES.includes(value) ? value : null
  } catch {
    return null
  }
}

function systemTheme() {
  try {
    return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  const meta = document.querySelector('meta[name="theme-color"]')
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim()
  if (meta && bg) meta.setAttribute('content', bg)
}

/**
 * Calls `cb('light'|'dark')` whenever `<html data-theme>` changes.
 * @param {(theme: 'light'|'dark') => void} cb
 * @returns {() => void} unsubscribe
 */
export function onThemeChange(cb) {
  const observer = new MutationObserver(() => cb(currentTheme()))
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}

/**
 * @param {HTMLElement} el the [data-kart=header] element
 * @param {{ name: string, homeHref: string, items: {id: string, href: string, label: string}[], currentId?: string }} opts
 */
export function renderHeader(el, { name, homeHref, items, currentId = 'kart' }) {
  // Same selection as useTheme with site.defaultTheme "system": saved choice, else the OS setting (live).
  applyTheme(readSaved() ?? systemTheme())
  try {
    window.matchMedia(DARK_QUERY).addEventListener('change', (e) => {
      if (!readSaved()) applyTheme(e.matches ? 'dark' : 'light')
    })
  } catch {
    // matchMedia unavailable
  }

  const toggle = h('button', {
    type: 'button',
    class: 'kart-toggle',
    onclick: () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark'
      try {
        window.localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // Storage blocked: the choice lasts for this page view.
      }
      applyTheme(next)
    },
  })
  const syncToggle = (theme) => {
    const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
    toggle.setAttribute('aria-label', label)
    toggle.title = label
    toggle.replaceChildren(icon(theme === 'dark' ? 'sun' : 'moon'))
  }
  syncToggle(currentTheme())
  onThemeChange(syncToggle)

  el.replaceChildren(
    h(
      'div',
      { class: 'container kart-header-in' },
      h('a', { class: 'kart-name', href: homeHref }, name),
      h(
        'nav',
        { class: 'kart-nav', 'aria-label': 'Primary' },
        h(
          'ul',
          null,
          ...items.map((item) =>
            h(
              'li',
              null,
              h(
                'a',
                { href: item.href, 'aria-current': item.id === currentId ? 'page' : null },
                item.id === currentId ? sprite(['o...', 'oo..', 'ooo.', 'oooo', 'ooo.', 'oo..', 'o...'], 'kart-cursor') : null,
                item.label,
              ),
            ),
          ),
        ),
      ),
      toggle,
    ),
  )
}

/**
 * Footer: contact links, résumé, copyright, back to top, credits.
 * @param {HTMLElement} el the [data-kart=footer] element
 * @param {{ name: string, links: {id: string, label: string, url: string}[], resumeUrl?: string|null }} opts
 */
export function renderFooter(el, { name, links, resumeUrl }) {
  const ext = (href, text) => h('a', { href, target: href.startsWith('mailto:') ? null : '_blank', rel: 'noopener noreferrer' }, text)
  el.replaceChildren(
    h(
      'div',
      { class: 'container kart-footer-in' },
      h(
        'div',
        { class: 'kart-row' },
        h('ul', { class: 'kart-links', 'aria-label': 'Contact links' }, ...links.map((l) => h('li', null, ext(l.url, l.label)))),
        resumeUrl ? ext(resumeUrl, 'Resume (PDF)') : null,
      ),
      h('div', { class: 'kart-row' }, h('p', null, `© ${new Date().getFullYear()} ${name}`), h('a', { href: '#top' }, 'Back to top')),
      h(
        'p',
        { class: 'kart-fine' },
        'Mario, Mario Kart DS and its models are trademarks of Nintendo. Models from The Models Resource; fan use on a non-commercial site, not affiliated with or endorsed by Nintendo. Fonts: Press Start 2P and VT323 (SIL Open Font License).',
      ),
    ),
  )
}
