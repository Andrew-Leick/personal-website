// Small Web Animations helpers shared by the journey's sequences.

/** `[data-part="name"]` inside `root`, or null. */
export const part = (root, name) => root?.querySelector(`[data-part="${name}"]`) ?? null

/** Cancel every animation running on `el` (it falls back to its CSS state). */
export function cancelAnimations(el) {
  el?.getAnimations?.().forEach((animation) => animation.cancel())
}

/** Resolves when all the given animations have finished or been cancelled. Skips nulls. */
export function settled(animations) {
  return Promise.all(animations.filter(Boolean).map((a) => a.finished.catch(() => undefined))).then(() => undefined)
}

export const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))
