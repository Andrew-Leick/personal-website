// PURE (no DOM, no three): the race state machine, timer and best time (SPEC-v5 V5-03, V5-04, V5-11, V5-12).
// loading -> title -> countdown -> racing <-> paused -> finished; restart goes back to countdown.

/** Seconds per countdown step: 3, 2, 1, then GO! (shown for the first step of racing). */
export const COUNT_STEP = 0.6
const LABELS = ['3', '2', '1']

/**
 * @param {string|null} raw localStorage `kart.best` value
 * @returns {number|null} best time in ms, or null if missing or invalid
 */
export function parseBest(raw) {
  const ms = Number(raw)
  return raw != null && raw !== '' && Number.isFinite(ms) && ms > 0 ? ms : null
}

/**
 * @param {{ best?: number|null }} [opts]
 */
export function createGame({ best = null } = {}) {
  let t = 0 // seconds in the current countdown, or since GO while racing
  let resumeTo = null
  const game = {
    /** @type {'loading'|'title'|'countdown'|'racing'|'paused'|'finished'} */
    state: 'loading',
    best,
    /** @type {{ timeMs: number, bestMs: number, isBest: boolean }|null} */
    result: null,
    /** Race time in ms (0 until GO, frozen while paused and after the finish). */
    get timeMs() {
      return game.state === 'countdown' || resumeTo === 'countdown' ? 0 : Math.round(t * 1000)
    },
    /** '3' | '2' | '1' | 'GO!' | null: the countdown label to show now. */
    get label() {
      const s = resumeTo ?? game.state
      if (s === 'countdown') return LABELS[Math.min(2, Math.floor(t / COUNT_STEP + 1e-9))]
      if (s === 'racing' && t < COUNT_STEP - 1e-9) return 'GO!'
      return null
    },
    /** True while the kart may move (input reaches physics). */
    get driving() {
      return game.state === 'racing'
    },
    loaded() {
      if (game.state === 'loading') game.state = 'title'
    },
    start() {
      if (game.state !== 'title') return false
      reset()
      return true
    },
    /** Restart from countdown, racing, paused or finished (V5-12). */
    restart() {
      if (game.state === 'loading' || game.state === 'title') return false
      reset()
      return true
    },
    pause() {
      if (game.state !== 'racing' && game.state !== 'countdown') return false
      resumeTo = game.state
      game.state = 'paused'
      return true
    },
    resume() {
      if (game.state !== 'paused') return false
      game.state = resumeTo
      resumeTo = null
      return true
    },
    /** Called on the progress 'finish' event. Updates `best` and returns the result. */
    finish() {
      if (game.state !== 'racing') return null
      const timeMs = game.timeMs
      const isBest = game.best == null || timeMs < game.best
      if (isBest) game.best = timeMs
      game.state = 'finished'
      game.result = { timeMs, bestMs: game.best, isBest }
      return game.result
    },
    /**
     * Advance the clock by dt seconds (call once per fixed step).
     * @returns {'go'|null} 'go' on the tick the race starts
     */
    tick(dt) {
      if (game.state === 'countdown') {
        t += dt
        if (t >= LABELS.length * COUNT_STEP - 1e-9) { // epsilon: 108 × (1/60) sums to just under 1.8
          t = Math.max(0, t - LABELS.length * COUNT_STEP)
          game.state = 'racing'
          return 'go'
        }
      } else if (game.state === 'racing') t += dt
      return null
    },
  }
  function reset() {
    t = 0
    resumeTo = null
    game.result = null
    game.state = 'countdown'
  }
  return game
}
