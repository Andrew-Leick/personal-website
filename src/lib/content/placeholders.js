// Placeholder detection, shared by the content API and the validator.

const URL_RE = /^(https?:|mailto:)/i

/**
 * A placeholder is a string starting with "TODO:", the bare date placeholder "TODO",
 * or a URL (http(s):// or mailto:) that contains "TODO" anywhere.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isPlaceholder(value) {
  if (typeof value !== 'string') return false
  const v = value.trim()
  if (v.startsWith('TODO:') || v === 'TODO') return true
  return URL_RE.test(v) && v.includes('TODO')
}

/** Ids starting with "todo-" mark whole example entries as placeholders. */
export function isPlaceholderId(value) {
  return typeof value === 'string' && value.startsWith('todo-')
}
