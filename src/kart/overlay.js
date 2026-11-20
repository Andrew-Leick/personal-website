// DOM overlay over the top screen: loading, error, title, countdown, flash, speed lines, banners
// (SPEC-v5 V5-03, V5-09, section 8). Motion lives in kart.css and is off under reduced motion.
import { h } from './header.js'

/**
 * @param {HTMLElement} topEl the [data-kart=top] element (holds the scene canvas)
 */
export function createOverlay(topEl) {
  const lines = h('div', { class: 'kart-lines', hidden: true })
  const flash = h('div', { class: 'kart-flash' })
  const count = h('div', { class: 'kart-count', 'aria-hidden': 'true' })
  const banner = h('div', { class: 'kart-banner', 'aria-hidden': 'true' })
  const panel = h('div', { class: 'kart-ov-panel pixel-dialog', hidden: true })
  topEl.append(h('div', { class: 'kart-ov' }, lines, flash, count, banner, panel))

  /** Re-creates the text node's wrapper so the CSS step animation replays. */
  const pop = (host, text) => host.replaceChildren(text ? h('span', null, text) : '')
  const showPanel = (...kids) => {
    panel.replaceChildren(...kids.filter((kid) => kid != null && kid !== false))
    panel.hidden = false
  }
  let bannerText = null

  return {
    /** @param {boolean} on */
    loading(on) {
      if (on) showPanel(h('p', { class: 'kart-ov-big', role: 'status' }, 'Loading…'))
      else panel.hidden = true
    },
    /** @param {string} message @param {string} homeHref */
    error(message, homeHref) {
      showPanel(h('p', { role: 'alert' }, message), h('a', { class: 'kart-btn', href: homeHref }, 'Back to site'))
    },
    /**
     * @param {{ onStart: () => void, onNotes: () => void, showAutoGas?: boolean, autoGas?: boolean,
     *   onAutoGas?: (on: boolean) => void, reducedMotion?: boolean }} opts
     */
    title({ onStart, onNotes, showAutoGas = false, autoGas = false, onAutoGas, reducedMotion = false }) {
      let gas = autoGas
      const gasBtn =
        showAutoGas &&
        h('button', {
          type: 'button',
          class: 'kart-btn',
          'aria-pressed': String(gas),
          onclick: () => {
            gas = !gas
            gasBtn.setAttribute('aria-pressed', String(gas))
            gasBtn.textContent = `Auto gas: ${gas ? 'ON' : 'OFF'}`
            onAutoGas?.(gas)
          },
        }, `Auto gas: ${gas ? 'ON' : 'OFF'}`)
      const notes = (e) => {
        e?.preventDefault()
        onNotes()
      }
      showPanel(
        h('p', { class: 'kart-ov-big' }, 'Grand Prix'),
        ...(reducedMotion
          ? [
              h('p', null, 'This race is a motion experience. Every fact is also in the course notes.'),
              h('button', { type: 'button', class: 'kart-btn kart-btn-primary', onclick: notes }, 'Course notes'),
              h('button', { type: 'button', class: 'kart-btn', onclick: onStart }, 'Drive anyway'),
            ]
          : [
              h('button', { type: 'button', class: 'kart-btn kart-btn-primary', onclick: onStart }, 'Press Enter / Tap to start'),
              h('p', { class: 'kart-help' }, '↑ X gas · ↓ Z brake · ← → steer', h('br'), 'Esc pause · R restart'),
              gasBtn,
              h('a', { href: '#kart-notes', onclick: notes }, 'Skip the race: read the course notes'),
            ]),
      )
    },
    hideTitle() {
      panel.hidden = true
    },
    /** @param {'3'|'2'|'1'|'GO!'|null} label */
    countdown(label) {
      pop(count, label)
    },
    flash() {
      flash.classList.remove('on')
      void flash.offsetWidth // restart the animation
      flash.classList.add('on')
    },
    /** @param {boolean} on */
    speedLines(on) {
      lines.hidden = !on
    },
    /** @param {string|null} text 'WRONG WAY', 'LAP 2', 'FINISH!' or null */
    banner(text) {
      if (text === bannerText) return
      bannerText = text
      pop(banner, text)
      banner.classList.toggle('kart-blink', text === 'WRONG WAY')
    },
  }
}
