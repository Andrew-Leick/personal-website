import { useEffect, useRef, useState } from 'react'
import { getHomeHref, getKartHref, getSiteContent } from './lib/content/index.js'
import SiteFooter from './components/SiteFooter/SiteFooter.jsx'
import SiteHeader from './components/SiteHeader/SiteHeader.jsx'
import SkipLink from './components/SkipLink/SkipLink.jsx'
import useKonami from './hooks/useKonami.js'
import useTheme from './hooks/useTheme.js'
import JourneyPage from './pages/JourneyPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import useRoute from './router/useRoute.js'
import useRouteEffects from './router/useRouteEffects.js'

const BEFORE_GAMEBOY_KEY = 'theme-before-gameboy'

/** The theme to return to when the Game Boy theme is switched off: the one saved, else the system's. */
function readBeforeGameboy() {
  try {
    const saved = window.localStorage.getItem(BEFORE_GAMEBOY_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // storage blocked: fall back to the system theme
  }
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function saveBeforeGameboy(theme) {
  try {
    window.localStorage.setItem(BEFORE_GAMEBOY_KEY, theme)
  } catch {
    // storage blocked: switching back uses the system theme
  }
}

/** Route switch (SPEC-v2 5.1, v4): skip link, header, main (the journey or Not found), footer. */
export default function App() {
  const content = getSiteContent()
  const { site, profile, links, pages } = content
  const { theme, toggleTheme, setTheme } = useTheme(site.defaultTheme)

  // The hidden Game Boy theme (SPEC-v6 P-11): the Konami code switches to it, and typed again,
  // back to the theme before it (remembered across reloads). A polite live region says which. Any
  // other theme change (the header toggle, the OS setting) empties it, so a stale note is never
  // re-announced and the next Konami switch is always announced.
  const [themeNote, setThemeNote] = useState('')
  const fromKonami = useRef(false)
  useKonami(() => {
    fromKonami.current = true
    if (theme === 'gameboy') {
      setTheme(readBeforeGameboy())
      setThemeNote('Game Boy mode off')
    } else {
      saveBeforeGameboy(theme)
      setTheme('gameboy')
      setThemeNote('Game Boy mode on')
    }
  })
  useEffect(() => {
    if (fromKonami.current) fromKonami.current = false
    else setThemeNote('')
  }, [theme])
  const { route, nav } = useRoute()
  useRouteEffects(route, nav)

  const homeHref = getHomeHref()
  const pageItems = pages.map((page) => ({ id: page.id, href: page.href, label: page.label }))
  // v5: a separate entry (/kart/), never a journey section; Link does a full navigation to it.
  const kartItem = { id: 'kart', href: getKartHref(), label: 'Grand Prix' }
  const navItems = [{ id: 'home', href: homeHref, label: 'Home' }, ...pageItems, kartItem]
  const currentId = route.kind === 'home' ? 'home' : route.kind === 'page' ? route.page.id : null

  // The journey: Home and every page are one document. It must stay mounted while the
  // scroll spy moves the URL, so <main> is keyed by journey vs not-found, not by page.
  const notFound = route.kind === 'not-found'

  return (
    <>
      <SkipLink />
      <p className="visually-hidden" role="status">
        {themeNote}
      </p>
      <SiteHeader
        name={profile.name}
        homeHref={homeHref}
        pages={[...pageItems, kartItem]}
        currentId={currentId}
        showThemeToggle={site.themeToggle}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <main id="main" tabIndex={-1} key={notFound ? 'not-found' : 'journey'}>
        {notFound ? <NotFoundPage navItems={navItems.filter((item) => item !== kartItem)} /> : <JourneyPage content={content} />}
      </main>
      <SiteFooter
        name={profile.name}
        navItems={navItems}
        currentId={currentId}
        links={links}
        resumeUrl={profile.resumeUrl}
        fanArt={site.fanArt}
      />
    </>
  )
}
