// PURE: checkpoint splits and personal-record pace (SPEC-v5 V5-23, V5-24).

export const CHECKPOINTS_PER_LAP = 4

/** Race distances of every checkpoint: 25/50/75/100% of each lap. */
export function checkpointDists(length, laps) {
  return Array.from({ length: laps * CHECKPOINTS_PER_LAP }, (_, i) => ((i + 1) * length) / CHECKPOINTS_PER_LAP)
}

/**
 * @param {string|null} raw localStorage `kart.pr`
 * @param {number} count checkpoints in a race
 * @returns {{ timeMs: number, splits: number[] }|null} null if missing, malformed or for another course length
 */
export function parsePr(raw, count) {
  try {
    const pr = JSON.parse(raw)
    const ok = (ms) => Number.isFinite(ms) && ms > 0
    return pr && ok(pr.timeMs) && Array.isArray(pr.splits) && pr.splits.length === count && pr.splits.every(ok) ? pr : null
  } catch {
    return null
  }
}

/** Signed seconds with two decimals: -420 -> "-0.42", 1234 -> "+1.23". Ties count as ahead. */
export function formatDelta(ms) {
  const cs = Math.round(Math.abs(ms) / 10)
  return `${ms > 0 && cs > 0 ? '+' : '-'}${Math.floor(cs / 100)}.${String(cs % 100).padStart(2, '0')}`
}

/**
 * One racer's checkpoint crossings.
 * @param {number[]} dists from checkpointDists
 */
export function createSplits(dists) {
  const times = []
  return {
    times,
    reset() {
      times.length = 0
    },
    /**
     * Record the first crossing of the next checkpoint(s).
     * @param {number} raceDist unwrapped distance driven (progress tracker `dist`)
     * @param {number} timeMs race time now
     * @param {{ splits: number[] }|null} pr
     * @returns {{ index: number, timeMs: number, deltaMs: number|null }|null} the latest checkpoint crossed this call
     */
    update(raceDist, timeMs, pr) {
      let hit = null
      while (times.length < dists.length && raceDist >= dists[times.length]) {
        const index = times.length
        times.push(timeMs)
        hit = { index, timeMs, deltaMs: pr ? timeMs - pr.splits[index] : null }
      }
      return hit
    },
  }
}
