import { resolveRoute } from '../lib/content/index.js'
import { navigate } from './history.js'

function isModified(event) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

/**
 * Internal page link (REQ-844). Always a real <a href> so it works without JS,
 * in a new tab and when copied. Navigates client-side only for a plain
 * primary-button click on a same-origin URL that resolveRoute() recognizes,
 * when the link has no target or download attribute.
 */
export default function Link({ href, onClick, beforeNavigate, children, ...rest }) {
  function handleClick(event) {
    onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || isModified(event)) return
    if (rest.target || rest.download != null) return

    let url
    try {
      url = new URL(href, window.location.href)
    } catch {
      return
    }
    if (url.origin !== window.location.origin) return
    if (resolveRoute(url.pathname).kind === 'not-found') return

    event.preventDefault()
    // v4: let the caller finish a short animation (the Poké Ball opening) first.
    if (beforeNavigate) {
      Promise.resolve()
        .then(beforeNavigate)
        .catch(() => undefined)
        .then(() => navigate(url.href))
    } else {
      navigate(url.href)
    }
  }

  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  )
}
