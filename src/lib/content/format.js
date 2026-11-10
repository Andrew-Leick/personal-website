// Date formatting helpers. Deterministic: no Intl, no locale dependence.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Placeholder accepted in any date field. */
export const DATE_PLACEHOLDER = 'TODO'

const DATE_RE = /^(\d{4})(?:-(0[1-9]|1[0-2]))?$/

/**
 * Parse "YYYY" or "YYYY-MM". Returns null for null, "TODO" or anything else.
 * @param {string|null|undefined} value
 * @returns {{ year: number, month: number|null }|null}
 */
export function parseDate(value) {
  if (typeof value !== 'string') return null
  const m = DATE_RE.exec(value)
  if (!m) return null
  return { year: Number(m[1]), month: m[2] ? Number(m[2]) : null }
}

/** True for "YYYY", "YYYY-MM" (month 01-12). */
export function isValidDate(value) {
  return parseDate(value) !== null
}

/**
 * "2025-06" -> "Jun 2025", "2025" -> "2025", "TODO" -> "TODO", null -> null.
 * Unrecognized strings are returned unchanged.
 * @param {string|null} value
 * @returns {string|null}
 */
export function formatMonth(value) {
  if (value === null || value === undefined) return null
  const d = parseDate(value)
  if (!d) return String(value)
  return d.month ? `${MONTHS[d.month - 1]} ${d.year}` : String(d.year)
}

/**
 * Format a date range with an en dash.
 *   formatDateRange("2025-06", null)                        -> "Jun 2025 – Present"
 *   formatDateRange("2025-06", "2025-06")                   -> "Jun 2025"
 *   formatDateRange("2023-09", "2027-06", { expected: true }) -> "Sep 2023 – Expected Jun 2027"
 *   formatDateRange(null, null)                             -> null
 * @param {string|null} start
 * @param {string|null} end  null means "Present" when start is set
 * @param {{ expected?: boolean }} [options]
 * @returns {string|null}
 */
export function formatDateRange(start, end, options = {}) {
  const expected = Boolean(options && options.expected)
  const s = start == null ? null : formatMonth(start)
  const e = end == null ? null : formatMonth(end)
  const endText = e === null ? null : expected ? `Expected ${e}` : e
  if (s === null && endText === null) return null
  if (s === null) return endText
  if (end === null || end === undefined) return `${s} – Present`
  if (start === end && !expected && isValidDate(start)) return s
  return `${s} – ${endText}`
}
