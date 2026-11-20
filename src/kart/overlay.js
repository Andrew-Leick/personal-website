// DOM overlay over the top screen: loading, error, title, countdown, flash, speed lines, banners
// (SPEC-v5 V5-03, V5-09, section 8), and v5.1's mode choice, Story freeze card, split pill and
// player tag (V5-20, V5-21, V5-23, V5-25). Motion lives in kart.css and is off under reduced motion.
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
  const tag = h('div', { class: 'kart-tag', hidden: true })
  const split = h('div', { class: 'kart-split', hidden: true })
  topEl.append(h('div', { class: 'kart-ov' }, lines, flash, count, banner, tag, split, panel))

  /** Re-creates the text node's wrapper so the CSS step animation replays. */
  const pop = (host, text) => host.replaceChildren(text ? h('span', null, text) : '')
  const showPanel = (...kids) => {
    panel.replaceChildren(...kids.filter((kid) => kid != null && kid !== false))
    panel.classList.remove('kart-ov-card')
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
     * Title screen with the mode and player choices (V5-20). Re-renders itself when a choice changes.
     * @param {{ onStart: () => void, onNotes: () => void, showAutoGas?: boolean, autoGas?: boolean,
     *   onAutoGas?: (on: boolean) => void, reducedMotion?: boolean, mode?: 'story'|'race',
     *   players?: 1|2, allowTwo?: boolean, onChoice?: (c: { mode: 'story'|'race', players: 1|2 }) => void }} opts
     */
    title(opts) {
      const { onStart, onNotes, showAutoGas = false, onAutoGas, reducedMotion = false, allowTwo = false, onChoice } = opts
      let { autoGas: gas = false, mode = 'story', players = 1 } = opts
      const notes = (e) => {
        e?.preventDefault()
        onNotes()
      }
      /** A row of toggle buttons; aria-pressed marks the current one. */
      const choice = (label, options, current, pick) =>
        h(
          'div',
          { class: 'kart-choice', role: 'group', 'aria-label': label },
          ...options.map(([value, text]) =>
            h('button', { type: 'button', class: 'kart-btn', 'aria-pressed': String(value === current), onclick: () => pick(value) }, text),
          ),
        )
      const render = (focusLabel) => {
        const help =
          players === 2
            ? ['P1: W gas · S brake · A D steer', 'P2: ↑ gas · ↓ brake · ← → steer']
            : ['↑ X gas · ↓ Z brake · ← → steer', 'Esc pause · R restart']
        const choices = [
          choice('Mode', [['story', 'Story'], ['race', 'Race']], mode, (m) => {
            mode = m
            onChoice?.({ mode, players })
            render('Mode')
          }),
          allowTwo &&
            choice('Players', [[1, '1 Player'], [2, '2 Players']], players, (n) => {
              players = n
              onChoice?.({ mode, players })
              render('Players')
            }),
        ]
        const gasBtn =
          showAutoGas &&
          h('button', {
            type: 'button',
            class: 'kart-btn',
            'aria-pressed': String(gas),
            onclick: () => {
              gas = !gas
              onAutoGas?.(gas)
              render()
            },
          }, `Auto gas: ${gas ? 'ON' : 'OFF'}`)
        showPanel(
          h('p', { class: 'kart-ov-big' }, 'Grand Prix'),
          ...(reducedMotion
            ? [
                h('p', null, 'This race is a motion experience. Every fact is also in the course notes.'),
                h('button', { type: 'button', class: 'kart-btn kart-btn-primary', onclick: notes }, 'Course notes'),
                ...choices,
                h('button', { type: 'button', class: 'kart-btn', onclick: onStart }, 'Drive anyway'),
              ]
            : [
                ...choices,
                h('button', { type: 'button', class: 'kart-btn kart-btn-primary', onclick: onStart }, 'Press Enter / Tap to start'),
                h('p', { class: 'kart-help' }, help[0], h('br'), help[1]),
                gasBtn,
                h('a', { href: '#kart-notes', onclick: notes }, 'Skip the race: read the course notes'),
              ]),
        )
        // Keep keyboard focus on the toggle group that was just used.
        if (focusLabel) panel.querySelector(`[aria-label="${focusLabel}"] [aria-pressed="true"]`)?.focus()
      }
      render()
    },
    /**
     * Story freeze frame (V5-21): the fact on the top screen with a Continue button.
     * @param {{ label: string, text: string }} stop @param {number} i @param {number} total
     * @param {{ who?: string|null, onContinue: () => void }} opts
     */
    card(stop, i, total, { who = null, onContinue }) {
      showPanel(
        h('p', { class: 'kart-ov-head' }, h('span', null, who ? `${who} · ${stop.label}` : stop.label), h('span', null, `${i + 1}/${total}`)),
        h('p', { class: 'kart-ov-fact' }, stop.text),
        h('button', { type: 'button', class: 'kart-btn kart-btn-primary', onclick: onContinue }, 'Continue'),
        h('p', { class: 'kart-help' }, 'Enter to keep driving'),
      )
      panel.classList.add('kart-ov-card')
    },
    hideCard() {
      panel.hidden = true
      panel.classList.remove('kart-ov-card')
    },
    /**
     * Checkpoint pill (V5-23): the delta vs the personal record, or the plain split time without one.
     * @param {string|null} text @param {'ahead'|'behind'|null} [pace]
     */
    split(text, pace = null) {
      split.hidden = !text
      if (!text) return
      split.classList.toggle('is-ahead', pace === 'ahead')
      split.classList.toggle('is-behind', pace === 'behind')
      pop(split, text)
    },
    /** 2 players: corner tag such as "P1 · LAP 1/2". @param {string|null} text */
    tag(text) {
      tag.hidden = !text
      if (text && tag.textContent !== text) tag.textContent = text
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
