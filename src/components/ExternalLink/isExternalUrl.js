/** True for an http(s) URL on another origin than the current page. */
export function isExternalUrl(href) {
  if (typeof href !== 'string' || !/^https?:\/\//i.test(href)) return false
  try {
    return new URL(href).origin !== window.location.origin
  } catch {
    return true
  }
}
