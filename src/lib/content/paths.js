// Resolve local asset paths (stored in data relative to public/, no leading slash)
// against the deploy base URL.

/**
 * The deploy base URL. Vite replaces import.meta.env.BASE_URL at build/dev time;
 * outside Vite (plain Node scripts) it falls back to "/".
 */
export const BASE_URL = (import.meta.env && import.meta.env.BASE_URL) || '/'

/**
 * @param {string|null|undefined} path  e.g. "content/resume/andrew-leick-resume.pdf"
 * @param {string} [base]               e.g. "/" or "/personal-website/"
 * @returns {string|null}               e.g. "/content/resume/andrew-leick-resume.pdf"
 */
export function resolveAsset(path, base = BASE_URL) {
  if (path === null || path === undefined) return null
  const b = base.endsWith('/') ? base : `${base}/`
  return b + String(path).replace(/^\/+/, '')
}
