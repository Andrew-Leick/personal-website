// Race-mode leaderboard (SPEC-v5 V5-28). Shared online through Supabase (createOnlineBoard), with this
// device's board (localStorage `kart.board`, createLeaderboard) as the fallback when it can't be reached.
// Names and times are shown; emails are stored but never displayed or returned by the API.

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

/**
 * The hosted board: a Supabase project whose table is closed to browsers; only two functions are
 * open, kart_board_top (name, time, date) and kart_board_submit (validated, rate-limited, returns the
 * rank). The publishable key is meant to ship in the browser; the database rules do the protecting.
 */
export const ONLINE = {
  url: 'https://qakracvvfgckpvhfgjaa.supabase.co/rest/v1/rpc',
  key: 'sb_publishable_DBYHz-vSq6QsSulNbP1Riw_xH1MTdZ7',
}

/** The database's reasons for a refused submit, as form errors. */
const REFUSED = {
  name: { error: 'Use 1 to 20 characters.', field: 'name' },
  email: { error: 'Enter an email like name@example.com.', field: 'email' },
  time: { error: 'That time can\u2019t be right, so it wasn\u2019t saved.', field: 'name' },
  rate: { error: 'Too many entries right now. Try again in a few minutes.', field: 'name' },
  failed: { error: 'Couldn\u2019t save online. Try again.', field: 'name' },
}

/**
 * The online board, falling back to `local` (createLeaderboard) whenever the network fails.
 * `entries()` is what was last loaded; `load()` refreshes it; `add()` resolves like the local one.
 * @param {ReturnType<typeof createLeaderboard>} local
 * @param {{ url: string, key: string }} online
 * @param {typeof fetch} fetchImpl
 */
export function createOnlineBoard(local, online = ONLINE, fetchImpl = globalThis.fetch) {
  let cached = null // null until the online board has loaded once
  const rpc = async (fn, body) => {
    const res = await fetchImpl(`${online.url}/${fn}`, {
      method: 'POST',
      headers: { apikey: online.key, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => null)
    return { ok: res.ok, data }
  }
  const toEntry = (row) => ({ id: row.id, name: row.name, timeMs: row.time_ms, at: Date.parse(row.created_at) })
  return {
    /** Whether the times shown come from the online board. */
    get online() {
      return cached !== null
    },
    entries: () => cached ?? local.entries(),
    async load() {
      try {
        const { ok, data } = await rpc('kart_board_top', { n: MAX_ENTRIES })
        if (ok && Array.isArray(data)) cached = data.map(toEntry)
      } catch {
        // offline: keep showing this device's board
      }
      return this.entries()
    },
    async add({ name, email, timeMs }) {
      const v = validateEntry(name, email)
      if ('error' in v) return { ok: false, ...v }
      try {
        const { ok, data } = await rpc('kart_board_submit', { p_name: v.name, p_email: v.email, p_time_ms: Math.round(timeMs) })
        if (!ok) return { ok: false, ...(REFUSED[data?.message] ?? REFUSED.failed) }
        const row = data[0]
        await this.load()
        return { ok: true, rank: row.rank, entries: this.entries(), entry: { id: row.id, name: v.name, timeMs, at: Date.parse(row.created_at) } }
      } catch {
        // offline: save it on this device instead
        cached = null
        return { ...local.add({ name: v.name, email: v.email, timeMs }), offline: true }
      }
    },
  }
}
