// PURE (no DOM, no three): the race state machine, timer and best time (SPEC-v5 V5-03, V5-04, V5-11, V5-12).
// loading -> title -> countdown -> racing <-> paused -> finished; restart goes back to countdown.
// v5.1: racing <-> frozen (Story freeze frame: the clock stops, V5-21).

/** Seconds per countdown step: 3, 2, 1, then GO! (shown for the first step of racing). */
export const COUNT_STEP = 0.6
const LABELS = ['3', '2', '1']

/**
 * @param {{ best?: number|null }} [opts]
 */
export function createGame({ best = null } = {}) {
  let t = 0 // seconds in the current countdown, or since GO while racing
  let resumeTo = null
  const game = {
    /** @type {'loading'|'title'|'countdown'|'racing'|'frozen'|'paused'|'finished'} */
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
    /** Story freeze frame: stop the clock and the karts until unfreeze() (V5-21). */
    freeze() {
      if (game.state !== 'racing') return false
      game.state = 'frozen'
      return true
    },
    unfreeze() {
      if (game.state !== 'frozen') return false
      game.state = 'racing'
      return true
    },
    resume() {
      if (game.state !== 'paused') return false
      game.state = resumeTo
      resumeTo = null
      return true
    },
    /**
     * Called when the race is over. Updates `best` (ranked runs only) and returns the result.
     * @param {{ timeMs?: number, ranked?: boolean }} [opts] timeMs: the time to rank (2 players: the faster one)
     */
    finish({ timeMs = game.timeMs, ranked = true } = {}) {
      if (game.state !== 'racing') return null
      const isBest = ranked && (game.best == null || timeMs < game.best)
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
