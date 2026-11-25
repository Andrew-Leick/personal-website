// The DS bottom screen: HUD strip, fact card or minimap, NEXT strip, touch area, pause and
// results panels, aria-live region (SPEC-v5 V5-06, V5-11, V5-16, 5.3). Plus the course notes (section 9).
import { h } from './header.js'
import { MAX_ENTRIES, SHOWN } from './leaderboard.js'

const MAP_W = 128
const MAP_H = 96

/**
 * Pure: milliseconds -> "m:ss.cc" (centiseconds floored; negatives and NaN show 0:00.00).
 * @param {number} ms
 */
export function formatTime(ms) {
  const cs = Math.floor(Math.max(0, ms || 0) / 10)
  const s = Math.floor(cs / 100)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`
}

/** Every stop as a list item: label, text, More link (results and course notes). */
function stopList(stops) {
  return h(
    'ol',
    { class: 'kart-stops' },
    ...stops.map((s) =>
      h(
        'li',
        null,
        h('p', { class: 'kart-label' }, s.label),
        h('p', null, s.text),
        s.href && h('a', { href: s.href }, 'More', h('span', { class: 'kart-vh' }, ` about ${s.label}`)),
      ),
    ),
  )
}

/**
 * Leaderboard block for the results (V5-28): a join form per finisher, then the top 10 by name and time.
 * @param {{ entries: () => object[], add: (sub: object) => object }} board
 * @param {{ label: string|null, timeMs: number }[]} finishers
 * @param {(text: string) => void} announce
 */
function leaderboard(board, finishers, announce) {
  const list = h('ol', { class: 'kart-lb-list' })
  const renderList = (mine = []) => {
    const top = board.entries().slice(0, SHOWN)
    list.replaceChildren(
      ...(top.length
        ? top.map((e, i) => h('li', mine.includes(e.id ?? e.at) ? { class: 'is-mine', 'aria-current': 'true' } : null, h('span', null, `${i + 1}. ${e.name}`), h('span', null, formatTime(e.timeMs))))
        : [h('li', null, 'No times yet. Be the first.')]),
    )
    fine.textContent = board.online ? 'Times are shared online. Emails are never shown.' : 'Saved on this device only. Emails are never shown.'
  }
  const fine = h('p', { class: 'kart-fine' })
  const mine = []
  let uid = 0
  const form = ({ label, timeMs }) => {
    const id = `kart-lb-${++uid}`
    const field = (name, text, type, autocomplete, max) => {
      const input = h('input', { id: `${id}-${name}`, name, type, autocomplete, maxlength: String(max), required: true, 'aria-describedby': `${id}-err` })
      return [input, h('label', { for: input.id }, text), input]
    }
    const [nameIn, ...nameField] = field('name', 'Name', 'text', 'name', 20)
    const [emailIn, ...emailField] = field('email', 'Email', 'email', 'email', 254)
    const err = h('p', { id: `${id}-err`, class: 'kart-lb-err', role: 'alert' })
    const f = h(
      'form',
      { class: 'kart-lb-form', novalidate: true },
      h('p', { class: 'kart-time' }, `${label ? `${label} · ` : ''}${formatTime(timeMs)}`),
      ...nameField,
      ...emailField,
      err,
      h('button', { type: 'submit', class: 'kart-btn kart-btn-primary' }, 'Join leaderboard'),
    )
    const submit = f.querySelector('button[type=submit]')
    f.addEventListener('submit', async (e) => {
      e.preventDefault()
      if (submit.disabled) return
      submit.disabled = true
      const res = await board.add({ name: nameIn.value, email: emailIn.value, timeMs })
      submit.disabled = false
      for (const input of [nameIn, emailIn]) input.removeAttribute('aria-invalid')
      if (!res.ok) {
        const bad = res.field === 'name' ? nameIn : emailIn
        err.textContent = res.error
        bad.setAttribute('aria-invalid', 'true')
        bad.focus()
        return
      }
      mine.push(res.entry.id ?? res.entry.at)
      renderList(mine)
      const msg = res.rank && res.rank <= SHOWN ? `${res.entry.name} placed #${res.rank}!` : res.rank ? `${res.entry.name} is #${res.rank}.` : `${res.entry.name} joined, outside the top ${MAX_ENTRIES}.`
      const done = h('p', { class: 'kart-time', tabindex: '-1' }, msg)
      f.replaceWith(done)
      done.focus()
      announce(msg)
    })
    return f
  }
  renderList()
  // The online board loads in the background; until then (or offline) this device's times show.
  board.load?.().then(() => renderList(mine))
  return h(
    'section',
    { class: 'kart-lb', 'aria-label': 'Leaderboard' },
    h('h3', { class: 'kart-label' }, 'LEADERBOARD'),
    ...finishers.map(form),
    fine,
    list,
  )
}

/**
 * @param {HTMLElement} el the [data-kart=bottom] element
 * @param {{ stops: {id: string, label: string, text: string, href: string|null}[],
 *   course: { samples: {x: number, z: number, dist: number}[], gateSlots: number[] },
 *   links: {id: string, kind?: string, label: string, url: string}[], resumeUrl?: string|null,
 *   homeHref: string, reducedMotion?: boolean }} opts
 */
export function createBottom(el, { stops, course, links, resumeUrl, homeHref, reducedMotion = false }) {
  const lap = h('span')
  const time = h('span')
  const gate = h('span')
  const map = h('canvas', { class: 'kart-map', width: MAP_W, height: MAP_H, 'aria-hidden': 'true' })
  const cardLabel = h('span')
  const cardCount = h('span')
  const cardText = h('p')
  const card = h('div', { class: 'kart-card pixel-dialog', hidden: true }, h('p', { class: 'kart-label' }, cardLabel, cardCount), cardText)
  const next = h('p', { class: 'kart-next' })
  const touchRoot = h('div', { class: 'kart-touchroot' })
  const panel = h('div', { class: 'kart-panel pixel-dialog', hidden: true })
  const live = h('div', { class: 'kart-vh', 'aria-live': 'polite' })
  el.replaceChildren(h('div', { class: 'kart-hud' }, lap, time, gate), h('div', { class: 'kart-mid' }, map, card), next, touchRoot, panel, live)

  // Minimap projection: fit the centerline's XZ extent into the canvas with a 4px margin.
  const xs = course.samples.map((s) => s.x)
  const zs = course.samples.map((s) => s.z)
  const [minX, minZ] = [Math.min(...xs), Math.min(...zs)]
  const k = Math.min((MAP_W - 8) / (Math.max(...xs) - minX), (MAP_H - 8) / (Math.max(...zs) - minZ))
  const ox = (MAP_W - (Math.max(...xs) - minX) * k) / 2
  const oz = (MAP_H - (Math.max(...zs) - minZ) * k) / 2
  const px = (x) => Math.round(ox + (x - minX) * k)
  const pz = (z) => Math.round(oz + (z - minZ) * k)
  const at = (d) => course.samples.find((s) => s.dist >= d) ?? course.samples[0]
  const gatePts = course.gateSlots.map(at)
  // Checkpoints (V5-23): 25/50/75% of the lap and the start/finish line.
  const cpPts = [0, 0.25, 0.5, 0.75].map((f) => at(f * course.length))
  const ctx = map.getContext('2d')
  let mapKey = ''

  /** Writes text only when it changed (the loop calls these every frame). */
  const set = (node, text) => {
    if (node.textContent !== text) node.textContent = text
  }
  const showPanel = (full, ...kids) => {
    panel.replaceChildren(...kids.filter((kid) => kid != null && kid !== false))
    panel.hidden = false
    el.classList.toggle('is-full', full)
  }
  const hidePanel = () => {
    panel.hidden = true
    el.classList.remove('is-full')
  }
  /** @param {string} text */
  const announce = (text) => {
    live.textContent = ''
    // A fresh text node in the next frame, so a repeated message is read again.
    requestAnimationFrame(() => (live.textContent = text))
  }
  const btn = (text, onclick, primary) => h('button', { type: 'button', class: primary ? 'kart-btn kart-btn-primary' : 'kart-btn', onclick }, text)

  return {
    touchRoot,

    /** @param {{ lap: number, laps: number, timeMs: number, gate: number, gates: number }} hud */
    setHud(hud) {
      set(lap, `LAP ${hud.lap}/${hud.laps}`)
      set(time, formatTime(hud.timeMs))
      set(gate, `${hud.gate}/${hud.gates}`)
    },

    /** @param {number|null} i stop index; null clears the card (back to the minimap, e.g. on restart) */
    showCard(i) {
      const stop = i == null ? null : stops[i]
      card.hidden = !stop
      map.hidden = !!stop
      if (!stop) return
      cardLabel.textContent = stop.label
      cardCount.textContent = `${i + 1}/${stops.length}`
      cardText.textContent = stop.text
      // The fact drops onto the screen in 3 hard steps (pixel style), not eased.
      if (!reducedMotion) card.animate?.([{ transform: 'translateY(-1.5em)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 180, easing: 'steps(3, end)' })
    },

    /** @param {number|null} i */
    setNext(i) {
      set(next, i == null || !stops[i] ? '' : `NEXT: ${stops[i].label}`)
    },

    /**
     * @param {{ x: number, z: number }} pos @param {number|null} nextStop
     * @param {{ x: number, z: number }|null} [pos2] racer 2 (2 players), drawn green
     */
    setMinimap(pos, nextStop, pos2 = null) {
      if (map.hidden) return
      const theme = document.documentElement.dataset.theme
      const key = `${px(pos.x)},${pz(pos.z)},${nextStop},${theme},${pos2 ? `${px(pos2.x)},${pz(pos2.z)}` : ''}`
      if (key === mapKey) return
      mapKey = key
      const cs = getComputedStyle(el)
      const color = (name) => cs.getPropertyValue(name).trim()
      ctx.clearRect(0, 0, MAP_W, MAP_H)
      ctx.lineWidth = 4
      ctx.lineJoin = 'round'
      ctx.strokeStyle = color('--color-text-muted')
      ctx.beginPath()
      course.samples.forEach((s, j) => (j % 4 ? 0 : ctx.lineTo(px(s.x), pz(s.z))))
      ctx.closePath()
      ctx.stroke()
      gatePts.forEach((g, slot) => {
        ctx.fillStyle = nextStop != null && nextStop % gatePts.length === slot ? color('--color-focus-ring') : color('--color-dialog-border-inner')
        ctx.fillRect(px(g.x) - 2, pz(g.z) - 2, 5, 5)
      })
      ctx.fillStyle = color('--color-text')
      for (const c of cpPts) ctx.fillRect(px(c.x) - 1, pz(c.z) - 1, 3, 3)
      const dot = (p, fill) => {
        ctx.fillStyle = color('--color-border-strong')
        ctx.fillRect(px(p.x) - 3, pz(p.z) - 3, 7, 7)
        ctx.fillStyle = fill
        ctx.fillRect(px(p.x) - 2, pz(p.z) - 2, 5, 5)
      }
      if (pos2) dot(pos2, '#3cb043')
      dot(pos, color('--color-accent'))
    },

    /** @param {{ onResume: () => void, onRestart: () => void, onNotes: () => void, homeHref?: string }} opts */
    showPause({ onResume, onRestart, onNotes, homeHref: home = homeHref }) {
      const resume = btn('Resume', onResume, true)
      showPanel(
        false,
        h('h2', { class: 'kart-label' }, 'PAUSED'),
        h('div', { class: 'kart-actions' }, resume, btn('Restart', onRestart), btn('Course notes', onNotes), h('a', { class: 'kart-btn', href: home }, 'Back to site')),
      )
      resume.focus({ preventScroll: true })
    },
    hidePause: hidePanel,

    /**
     * @param {{ timeMs: number, bestMs: number|null, isBest: boolean, ranked?: boolean,
     *   racers?: { label: string, timeMs: number }[] }} result racers: 2 players, fastest first
     * @param {{ onRestart: () => void, board?: { entries: () => object[], add: (sub: object) => object } }} actions
     *   board: Race runs only; each finisher may join once
     */
    showResults({ timeMs, bestMs, isBest, ranked = true, racers = [] }, { onRestart, board }) {
      const heading = h('h2', { class: 'kart-label', tabindex: '-1' }, 'FINISH!')
      const order = ['email', 'github', 'linkedin']
      const sorted = [...links].sort((a, b) => (order.indexOf(a.kind ?? a.id) + 1 || 9) - (order.indexOf(b.kind ?? b.id) + 1 || 9))
      const ext = (href, text) => h('li', null, h('a', { href, target: href.startsWith('mailto:') ? null : '_blank', rel: 'noopener noreferrer' }, text))
      showPanel(
        true,
        heading,
        racers.length > 1
          ? h('ol', { class: 'kart-racers' }, ...racers.map((r, i) => h('li', { class: 'kart-time' }, `${r.label} ${formatTime(r.timeMs)}`, i === 0 && h('strong', { class: 'kart-best' }, 'WINS'))))
          : h('p', { class: 'kart-time' }, `TIME ${formatTime(timeMs)}`),
        isBest && h('p', { class: 'kart-time' }, h('strong', { class: 'kart-best' }, 'NEW RECORD')),
        ranked && bestMs != null && h('p', null, `Record: ${formatTime(bestMs)}`),
        !ranked && h('p', null, 'Story run. Switch to Race mode to chase a record and join the leaderboard.'),
        ranked && board && leaderboard(board, racers.length > 1 ? racers : [{ label: null, timeMs }], announce),
        stopList(stops),
        h('ul', { class: 'kart-links', 'aria-label': 'Contact links' }, resumeUrl && ext(resumeUrl, 'Resume (PDF)'), ...sorted.map((l) => ext(l.url, l.label))),
        h('div', { class: 'kart-actions' }, btn('Drive again', onRestart, true), h('a', { class: 'kart-btn', href: homeHref }, 'Back to site')),
      )
      heading.focus()
    },
    hideResults: hidePanel,

    announce,
  }
}

/**
 * The course notes section (always present; same list as the results).
 * @param {HTMLElement} el the [data-kart=notes] section (aria-labelledby="kart-notes-heading")
 * @param {{ label: string, text: string, href: string|null }[]} stops
 * @returns {{ open: () => void }}
 */
export function renderNotes(el, stops) {
  const summary = h('summary', null, `All ${stops.length} facts from the race`)
  const details = h('details', null, summary, stopList(stops))
  el.replaceChildren(h('div', { class: 'container' }, h('h2', { id: 'kart-notes-heading', class: 'kart-label' }, 'Course notes'), details))
  return {
    open() {
      details.open = true
      summary.focus()
    },
  }
}
