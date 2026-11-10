import { getHomeHref, getSiteContent } from './lib/content/index.js'
import SiteFooter from './components/SiteFooter/SiteFooter.jsx'
import SiteHeader from './components/SiteHeader/SiteHeader.jsx'
import SkipLink from './components/SkipLink/SkipLink.jsx'
import useTheme from './hooks/useTheme.js'
import ContentPage from './pages/ContentPage.jsx'
import HomePage from './pages/HomePage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import useRoute from './router/useRoute.js'
import useRouteEffects from './router/useRouteEffects.js'

/** Route switch (SPEC-v2 5.1): skip link, header, main (page), footer. */
export default function App() {
  const content = getSiteContent()
  const { site, profile, links, pages } = content
  const { theme, toggleTheme } = useTheme(site.defaultTheme)
  const { route, nav } = useRoute()
  useRouteEffects(route, nav)

  const homeHref = getHomeHref()
  const pageItems = pages.map((page) => ({ id: page.id, href: page.href, label: page.label }))
  const navItems = [{ id: 'home', href: homeHref, label: 'Home' }, ...pageItems]
  const currentId = route.kind === 'home' ? 'home' : route.kind === 'page' ? route.page.id : null

  let body
  if (route.kind === 'home') body = <HomePage content={content} />
  else if (route.kind === 'page') body = <ContentPage page={route.page} content={content} />
  else body = <NotFoundPage navItems={navItems} />

  return (
    <>
      <SkipLink />
      <SiteHeader
        name={profile.name}
        homeHref={homeHref}
        pages={pageItems}
        currentId={currentId}
        showThemeToggle={site.themeToggle}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <main id="main" tabIndex={-1} key={currentId ?? 'not-found'}>
        {body}
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
