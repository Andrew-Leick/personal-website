import { useCallback, useEffect, useState } from 'react'
import { THEMES } from '../components/ThemeToggle/themes.js'

const STORAGE_KEY = 'theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function readSaved() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return THEMES.includes(value) ? value : null
  } catch {
    return null
  }
}

function writeSaved(theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Storage blocked (e.g. private mode): the choice lasts for this page view.
  }
}

function systemTheme() {
  try {
    return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/** Spec 4.6 selection logic: saved choice, then site default, then system. */
function resolveTheme(defaultTheme) {
  const saved = readSaved()
  if (saved) return saved
  if (defaultTheme && defaultTheme !== 'system' && THEMES.includes(defaultTheme)) {
    return defaultTheme
  }
  return systemTheme()
}

function syncThemeColorMeta() {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) return
  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-bg')
    .trim()
  if (bg) meta.setAttribute('content', bg)
}

function applyTheme(theme) {
  // Suppress transitions during the swap so controls do not cross-fade while
  // the rest of the page snaps to the new colors.
  const style = document.createElement('style')
  style.textContent = '*, *::before, *::after { transition: none !important; }'
  document.head.appendChild(style)
  document.documentElement.dataset.theme = theme
  // Force a style flush so the new colors apply with transitions disabled.
  void getComputedStyle(document.body).opacity
  syncThemeColorMeta()
  requestAnimationFrame(() => style.remove())
}

/**
 * Current theme plus a `toggleTheme` that alternates light/dark and saves the
 * choice. A custom theme (not light/dark) toggles to dark first.
 */
export default function useTheme(defaultTheme) {
  const [theme, setTheme] = useState(() => resolveTheme(defaultTheme))

  // Apply on mount and on every change (also corrects anything the inline
  // bootstrap script set that is not in THEMES, and applies site.defaultTheme).
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Follow the OS setting live while the visitor has made no choice and the
  // site default is "system".
  useEffect(() => {
    if (defaultTheme && defaultTheme !== 'system' && THEMES.includes(defaultTheme)) {
      return undefined
    }
    let query
    try {
      query = window.matchMedia(DARK_QUERY)
    } catch {
      return undefined
    }
    const onChange = () => {
      if (!readSaved()) setTheme(query.matches ? 'dark' : 'light')
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [defaultTheme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      writeSaved(next)
      return next
    })
  }, [])

  return { theme, toggleTheme }
}
