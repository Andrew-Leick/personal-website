// Race-mode leaderboard, stored on this device only (localStorage `kart.board`; SPEC-v5 V5-28).
// shortcut: local to one browser; to share it across visitors, swap load/save for a hosted API (e.g. Supabase).
// Names and times are shown; emails are stored but never displayed.

export const BOARD_KEY = 'kart.board'
export const MAX_ENTRIES = 50
export const SHOWN = 10
const NAME_MAX = 20
const EMAIL_MAX = 254
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Pure: trim and check a submission.
 * @returns {{ name: string, email: string } | { error: string, field: 'name'|'email' }}
 */
export function validateEntry(name, email) {
  const n = String(name ?? '').trim().replace(/\s+/g, ' ')
  const e = String(email ?? '').trim()
  if (!n) return { error: 'Enter a name.', field: 'name' }
  if (n.length > NAME_MAX) return { error: `Use ${NAME_MAX} characters or fewer.`, field: 'name' }
  if (!EMAIL_RE.test(e) || e.length > EMAIL_MAX) return { error: 'Enter an email like name@example.com.', field: 'email' }
  return { name: n, email: e }
}

/** Pure: stored JSON -> valid entries, fastest first. Bad or missing data is an empty board. */
export function parseBoard(raw) {
  try {
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return []
    return list
      .filter((x) => x && typeof x.name === 'string' && typeof x.email === 'string' && Number.isFinite(x.timeMs) && x.timeMs > 0)
      .sort((a, b) => a.timeMs - b.timeMs || a.at - b.at)
      .slice(0, MAX_ENTRIES)
  } catch {
    return []
  }
}

/**
 * Pure: insert in time order (ties: earlier entry first), keeping at most max entries.
 * @returns {{ entries: object[], rank: number|null }} rank is 1-based, null if it fell off the end
 */
export function insert(entries, entry, max = MAX_ENTRIES) {
  const i = entries.findIndex((x) => x.timeMs > entry.timeMs)
  const at = i === -1 ? entries.length : i
  const next = [...entries.slice(0, at), entry, ...entries.slice(at)].slice(0, max)
  return { entries: next, rank: at < max ? at + 1 : null }
}

/** @param {{ getItem(k: string): string|null, setItem(k: string, v: string): void }|null} storage */
export function createLeaderboard(storage) {
  const read = () => {
    try {
      return parseBoard(storage?.getItem(BOARD_KEY) ?? null)
    } catch {
      return []
    }
  }
  return {
    /** Fastest first. */
    entries: read,
    /**
     * @param {{ name: string, email: string, timeMs: number }} sub
     * @returns {{ ok: true, rank: number|null, entries: object[], entry: object } | { ok: false, error: string, field: 'name'|'email' }}
     */
    add({ name, email, timeMs }) {
      const v = validateEntry(name, email)
      if ('error' in v) return { ok: false, ...v }
      const entry = { name: v.name, email: v.email, timeMs, at: Date.now() }
      const { entries, rank } = insert(read(), entry)
      try {
        storage?.setItem(BOARD_KEY, JSON.stringify(entries))
      } catch {
        // Storage blocked or full: the entry shows for this page view only.
      }
      return { ok: true, rank, entries, entry }
    },
  }
}
