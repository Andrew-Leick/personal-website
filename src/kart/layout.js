// DS frame fitting (SPEC-v5 V5-02, V5-14, V5-25): integer scale; stacked, side by side, or duo
// (2 players: two top screens side by side, the bottom screen below).

const W = 256
const H = 192
const GAP = 16 // px between the two screens (matches .kart-ds gap)
const BORDER = 4 // px: 2px screen border on each side
const MARGIN = 16 // px kept free below the frame

/** Largest integer scale, unless it wastes more than 25% of the room; then the exact fit. */
function snap(fit) {
  const i = Math.floor(fit)
  return i >= 1 && (fit - i) / fit <= 0.25 ? i : fit
}

/**
 * Pure: the scale and layout for an available box (CSS px).
 * Stacked when the viewport is portrait or stacking scales at least as large.
 * @param {number} availW
 * @param {number} availH
 * @param {1|2} [players]
 * @returns {{ scale: number, layout: 'stacked'|'side'|'duo' }}
 */
export function computeFit(availW, availH, players = 1) {
  if (players === 2) return { scale: snap(Math.min((availW - GAP - 2 * BORDER) / (2 * W), (availH - GAP - 2 * BORDER) / (2 * H))), layout: 'duo' }
  const stacked = snap(Math.min((availW - BORDER) / W, (availH - GAP - 2 * BORDER) / (2 * H)))
  const side = snap(Math.min((availW - GAP - 2 * BORDER) / (2 * W), (availH - BORDER) / H))
  return availH > availW || stacked >= side ? { scale: stacked, layout: 'stacked' } : { scale: side, layout: 'side' }
}

/**
 * The frame fits below the header (its page offset) so the whole DS shows without scrolling.
 * Sets `--kart-scale` and `data-layout` on the frame and re-fits on resize (rAF-throttled).
 * The racer count comes from the frame's `data-players` ("2" for two players).
 * @param {HTMLElement} frameEl
 * @returns {() => void} refit now (call after changing data-players)
 */
export function fitFrame(frameEl) {
  let raf = 0
  const fit = () => {
    raf = 0
    const parent = frameEl.parentElement ?? document.body
    const cs = getComputedStyle(parent)
    const availW = parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    const { scale, layout } = computeFit(availW, window.innerHeight - MARGIN - (frameEl.getBoundingClientRect().top + window.scrollY), frameEl.dataset.players === '2' ? 2 : 1)
    frameEl.style.setProperty('--kart-scale', String(Math.max(0.5, Math.floor(scale * 1000) / 1000)))
    frameEl.dataset.layout = layout
  }
  const onResize = () => {
    if (!raf) raf = requestAnimationFrame(fit)
  }
  fit()
  window.addEventListener('resize', onResize)
  window.addEventListener('orientationchange', onResize)
  return fit
}
