// Pokédex progress (SPEC-v6 P-07): which entries the reader has seen (their tile shown in a list)
// and caught (their showcase opened), kept across visits in localStorage. Storage can be blocked
// (private mode, settings): then progress lasts for this page view only.

const KEY = 'pokedex-progress'
let memory = null // fallback copy when storage is unavailable

/** @returns {{ seen: Set<string>, caught: Set<string>, complete: boolean }} */
export function loadProgress() {
  let raw = memory
  try {
    raw = window.localStorage.getItem(KEY) ?? memory
  } catch {
    // storage blocked: keep the in-memory copy
  }
  try {
    const data = raw ? JSON.parse(raw) : {}
    const list = (value) => (Array.isArray(value) ? value.filter((key) => typeof key === 'string') : [])
    return { seen: new Set(list(data.seen)), caught: new Set(list(data.caught)), complete: data.complete === true }
  } catch {
    return { seen: new Set(), caught: new Set(), complete: false }
  }
}

function save(progress) {
  const raw = JSON.stringify({ seen: [...progress.seen], caught: [...progress.caught], complete: progress.complete })
  memory = raw
  try {
    window.localStorage.setItem(KEY, raw)
  } catch {
    // storage blocked: the in-memory copy above is enough for this visit
  }
}

/**
 * Records `seen` and `caught` entry keys. `total` is every entry key in the dex: catching the
 * last uncaught one completes the dex, which `justCompleted` reports exactly once, ever.
 * Returns the same object when nothing changed, so React can skip the update.
 */
export function record(progress, { seen = [], caught = [] }, total) {
  const newSeen = [...seen, ...caught].filter((key) => !progress.seen.has(key))
  const newCaught = caught.filter((key) => !progress.caught.has(key))
  if (newSeen.length === 0 && newCaught.length === 0) return { progress, justCompleted: false }
  const next = {
    seen: new Set([...progress.seen, ...newSeen]),
    caught: new Set([...progress.caught, ...newCaught]),
    complete: progress.complete,
  }
  const justCompleted = !next.complete && total.length > 0 && total.every((key) => next.caught.has(key))
  if (justCompleted) next.complete = true
  save(next)
  return { progress: next, justCompleted }
}

/** Counts limited to the entries the dex has now (old keys from removed entries don't count). */
export function tally(progress, total) {
  return {
    seen: total.filter((key) => progress.seen.has(key)).length,
    caught: total.filter((key) => progress.caught.has(key)).length,
    total: total.length,
    complete: progress.complete,
  }
}

/** Test helper: forget the in-memory copy. */
export function resetProgressMemory() {
  memory = null
}
