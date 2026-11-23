// Kart page boot (SPEC-v5 4.3, V5-03 to V5-16; v5.1 V5-20 to V5-27): content -> stops, header/footer,
// frame, scene, state machine, loop. One "racer" per player: kart, progress, checkpoint splits, view.
import './kart.css'
import data from 'virtual:kart-data' // site content resolved at build time (vite-plugin-content kartData)
import { onThemeChange, renderFooter, renderHeader } from './header.js'
import { fitFrame } from './layout.js'
import { createOverlay } from './overlay.js'
import { createBottom, formatTime, renderNotes } from './bottom.js'
import { createScene } from './scene.js'
import { createGround } from './ground.js'
import { COURSE, GATES_PER_LAP, START, gateBoxes, gateFor, gatePose, lapCount } from './course.js'
import { createProgress } from './progress.js'
import { boost, createKart, step } from './physics.js'
import { createInput } from './input.js'
import { createGame } from './game.js'
import { checkpointDists, createSplits, formatDelta, parsePr } from './splits.js'
import { createLeaderboard } from './leaderboard.js'

const STEP = 1 / 60
const BANNER_S = 1.5
const RESPAWN_MS = 1500 // V5-27
const FREEZE_MIN_MS = 400 // V5-21: a key still held from driving can't skip the card
const GRID_OFFSET = 3.5 // 2 players: each kart starts this far left/right of the start line's center
const COAST = { throttle: 0, brake: 0, steer: 0 }

const $ = (name) => document.querySelector(`[data-kart="${name}"]`)
const media = (q) => window.matchMedia?.(q).matches ?? false
function load(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}
function save(key, value) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage blocked: the value lasts for this page view.
  }
}

const { homeHref, links, pages, stops } = data
const profile = { name: data.name, resumeUrl: data.resumeUrl }
const n = stops.length
const cps = checkpointDists(COURSE.length, lapCount(n))
const reducedMotion = media('(prefers-reduced-motion: reduce)')
const coarse = media('(pointer: coarse)')
const savedGas = load('kart.autoGas')
let autoGas = savedGas == null ? coarse : savedGas === '1'
let pr = parsePr(load('kart.pr'), cps.length)
const board = createLeaderboard({
  getItem: load,
  setItem: save,
})
/** @type {'story'|'race'} */
let mode = 'story' // V5-20: Story is the default on every visit
/** @type {1|2} */
let players = 1

renderHeader($('header'), {
  name: profile.name,
  homeHref,
  items: [...pages.map((p) => ({ id: p.id, href: p.href, label: p.label })), { id: 'kart', href: data.kartHref, label: 'Grand Prix' }],
  currentId: 'kart',
})
renderFooter($('footer'), { name: profile.name, links, resumeUrl: profile.resumeUrl })
const notes = renderNotes($('notes'), stops)
const frameEl = $('frame')
const refit = fitFrame(frameEl)

const overlays = [createOverlay($('top'))]
const bottom = createBottom($('bottom'), { stops, course: COURSE, links, resumeUrl: profile.resumeUrl, homeHref, reducedMotion })
const input = createInput({ touchRoot: bottom.touchRoot, autoGas })
const game = createGame({ best: pr?.timeMs ?? null })

overlays[0].loading(true)
let scene
let ground
try {
  const theme = document.documentElement.dataset.theme ?? 'light'
  scene = await createScene($('top'), { theme, reducedMotion })
  ground = createGround(scene.courseRoot)
} catch (err) {
  console.error(err)
  overlays[0].loading(false)
  overlays[0].error("The course didn't load. Try reloading the page.", homeHref)
}

if (scene) boot()

function boot() {
  const racers = [0, 1].map((p) => ({
    p,
    kart: createKart(START),
    tracker: createProgress(COURSE, n),
    splits: createSplits(cps),
    finishMs: /** @type {number|null} */ (null),
    wrongWay: false,
    boosting: false,
    bannerT: 0,
  }))
  const active = () => racers.slice(0, players)
  const revealed = new Set() // stops someone has driven through (2 players: the first reveal counts)
  const respawnAt = new Array(GATES_PER_LAP).fill(0)
  let raf = 0
  let last = 0
  let acc = 0
  let label = null
  let frozenAt = 0

  if (import.meta.env.DEV) window.kartDebug = { racers, game, COURSE, get kart() { return racers[0].kart }, get tracker() { return racers[0].tracker } } // QA hook; stripped from builds
  onThemeChange((t) => {
    scene.setTheme(t)
    scene.render() // repaint now: the loop does not render while paused, frozen or on the title
  })
  scene.setGates(Array.from({ length: GATES_PER_LAP }, (_, slot) => ({ slot, boxes: gateBoxes(slot), heading: gatePose(slot).heading })))

  /** A row is shown while some racer still on course has a stop at that slot on their lap. */
  const slotNeeded = (slot) => active().some((r) => r.finishMs == null && (r.tracker.lap - 1) * GATES_PER_LAP + slot < n)
  function showGates() {
    for (let slot = 0; slot < GATES_PER_LAP; slot++) if (!respawnAt[slot]) scene.showGate(slot, slotNeeded(slot))
  }
  /** The racer furthest along: drives the shared HUD (lap, NEXT). */
  const leader = () => active().reduce((a, b) => (b.tracker.dist > a.tracker.dist ? b : a))

  function banner(r, text, seconds = BANNER_S) {
    overlays[r.p].banner(text)
    r.bannerT = seconds
  }
  function setBoost(r, on) {
    r.boosting = on
    scene.setBoost(on, r.p)
    if (!reducedMotion) overlays[r.p].speedLines(on)
  }
  function syncHud() {
    const lead = leader()
    bottom.setHud({ lap: lead.tracker.lap, laps: lead.tracker.laps, timeMs: game.timeMs, gate: revealed.size, gates: n })
    bottom.setMinimap(racers[0].kart, lead.tracker.nextStop, players === 2 ? racers[1].kart : null)
    const tags = players === 2 && game.state !== 'title'
    for (const r of active()) overlays[r.p].tag(tags ? `P${r.p + 1} · LAP ${r.tracker.lap}/${r.tracker.laps}` : null)
  }
  function draw(dt) {
    for (const r of active()) {
      scene.setKart(r.kart, r.p)
      scene.follow(r.kart, dt, r.p)
    }
    scene.update(dt)
    for (const r of active()) scene.render(r.p)
  }
  function captureFor() {
    const s = game.state
    input.setCapture(s === 'countdown' || s === 'racing' || s === 'frozen' || s === 'paused')
  }

  /** Karts on the grid: centered alone, side by side for two (P1 left). */
  function placeKarts() {
    // Steering right turns toward heading + PI/2, so "right" of the start line is (-sin h, cos h).
    const rx = -Math.sin(START.heading)
    const rz = Math.cos(START.heading)
    for (const r of racers) {
      const side = players === 2 ? (r.p === 0 ? -GRID_OFFSET : GRID_OFFSET) : 0
      Object.assign(r.kart, createKart({ ...START, x: START.x + rx * side, z: START.z + rz * side }))
    }
  }

  /** V5-25: switch between 1 and 2 players (layout, second view, racer 2). */
  function applyPlayers(count) {
    players = count
    const top2 = $('top2')
    if (count === 2 && !overlays[1]) {
      scene.addView(top2)
      overlays[1] = createOverlay(top2)
    }
    top2.hidden = count !== 2
    frameEl.dataset.players = String(count)
    scene.setPlayers(count)
    if (count === 1) overlays[0].tag(null)
    refit()
    placeKarts()
    showGates()
    syncHud()
    draw(0)
  }

  function resetRace() {
    placeKarts()
    for (const r of racers) {
      r.tracker.reset()
      r.splits.reset()
      r.finishMs = null
      r.wrongWay = false
      if (r.boosting) setBoost(r, false)
    }
    for (const o of overlays) {
      o.banner(null)
      o.split(null)
      o.hideCard()
    }
    revealed.clear()
    frameEl.classList.remove('is-frozen')
    respawnAt.fill(0)
    acc = 0
    showGates()
    bottom.hidePause()
    bottom.hideResults()
    bottom.showCard(null)
    bottom.setNext(leader().tracker.nextStop)
    syncHud()
    captureFor()
    run()
  }
  function startRace() {
    if (!game.start()) return
    overlays[0].hideTitle()
    resetRace()
  }
  function restart() {
    if (!game.restart()) return
    resetRace()
  }
  function pause() {
    if (!game.pause()) return
    input.clear()
    for (const o of overlays) o.countdown(null)
    label = null
    bottom.showPause({ onResume: resume, onRestart: restart, onNotes: () => notes.open(), homeHref })
  }
  function resume() {
    if (!game.resume()) return
    bottom.hidePause()
    run()
  }

  /** V5-21: Story freeze frame on the revealing racer's top screen. */
  function freeze(r, stop) {
    if (!game.freeze()) return
    frozenAt = performance.now()
    frameEl.classList.add('is-frozen')
    syncHud()
    draw(0) // the frozen frame shows the boxes bursting around the kart
    overlays[r.p].card(stops[stop], stop, n, { who: players === 2 ? `P${r.p + 1}` : null, onContinue: unfreeze })
  }
  function unfreeze() {
    if (game.state !== 'frozen' || performance.now() - frozenAt < FREEZE_MIN_MS) return
    game.unfreeze()
    frameEl.classList.remove('is-frozen')
    for (const o of overlays) o.hideCard()
    run()
  }

  function endRace() {
    const times = active().map((r) => r.finishMs)
    const fastest = Math.min(...times)
    const winner = active().find((r) => r.finishMs === fastest)
    const ranked = mode === 'race'
    const result = game.finish({ timeMs: fastest, ranked })
    if (!result) return
    if (result.isBest && winner.splits.times.length === cps.length) {
      pr = { timeMs: fastest, splits: [...winner.splits.times] }
      save('kart.pr', JSON.stringify(pr))
    }
    const racersList = players === 2 ? active().map((r) => ({ label: `P${r.p + 1}`, timeMs: r.finishMs })).sort((a, b) => a.timeMs - b.timeMs) : []
    captureFor()
    syncHud()
    bottom.showResults({ ...result, ranked, racers: racersList }, { onRestart: restart, board })
    bottom.announce(players === 2 ? `${racersList[0].label} wins in ${formatTime(fastest)}` : `Finished in ${formatTime(fastest)}`)
  }

  function onEvent(r, e) {
    const who = players === 2 ? `Player ${r.p + 1}: ` : ''
    if (e.type === 'gate') {
      const { slot } = gateFor(e.stop)
      scene.burstGate(slot)
      respawnAt[slot] = performance.now() + RESPAWN_MS
      if (!reducedMotion) overlays[r.p].flash()
      if (r.tracker.boxHit(e.stop, r.kart.x, r.kart.z)) {
        boost(r.kart)
        setBoost(r, true)
      }
      const first = !revealed.has(e.stop)
      revealed.add(e.stop)
      bottom.setNext(leader().tracker.nextStop)
      if (!first) return
      bottom.announce(`${who}Item box ${e.stop + 1} of ${n}: ${stops[e.stop].text}`)
      if (mode === 'story') freeze(r, e.stop)
      else bottom.showCard(e.stop)
    } else if (e.type === 'lap') {
      showGates()
      banner(r, `LAP ${e.lap}`)
      bottom.announce(`${who}Lap ${e.lap}`)
    } else if (e.type === 'wrongway') {
      r.wrongWay = e.on
      if (e.on) bottom.announce(`${who}Wrong way`)
      banner(r, e.on ? 'WRONG WAY' : null, e.on ? Infinity : 0)
    } else if (e.type === 'finish') {
      r.finishMs = game.timeMs
      if (r.boosting) setBoost(r, false)
      banner(r, 'FINISH!', Infinity)
      showGates()
      if (active().every((x) => x.finishMs != null)) endRace()
      else bottom.announce(`${who}finished in ${formatTime(r.finishMs)}`)
    }
  }

  /** V5-23: checkpoint crossed -> split vs the personal record (Race mode only). */
  function checkSplits(r) {
    const hit = r.splits.update(r.tracker.dist, game.timeMs, pr)
    if (!hit || mode !== 'race') return
    if (hit.deltaMs == null) overlays[r.p].split(formatTime(hit.timeMs), null)
    else {
      overlays[r.p].split(formatDelta(hit.deltaMs), hit.deltaMs <= 0 ? 'ahead' : 'behind')
      if (players === 1) bottom.announce(`Checkpoint ${hit.index + 1}: ${Math.abs(hit.deltaMs / 1000).toFixed(2)} seconds ${hit.deltaMs <= 0 ? 'ahead of' : 'behind'} your record`)
    }
  }

  /** Edge-triggered start/pause/restart for the current state. */
  function handleEdges(snap) {
    const s = game.state
    if (s === 'title' && snap.start) startRace()
    else if ((s === 'countdown' || s === 'racing') && snap.pause) pause()
    else if (s === 'frozen' && (snap.start || snap.pause)) unfreeze()
    else if (s === 'paused' && (snap.pause || snap.start)) resume()
    if (snap.restart && s !== 'title') restart()
  }

  // SPEC 4.3. Outside countdown/racing only input is polled (gamepad needs polling); nothing simulates or renders.
  function frame(now) {
    raf = 0
    const snaps = input.poll(players)
    handleEdges(snaps[0])
    captureFor()
    const live = game.state === 'countdown' || game.state === 'racing'
    if (!live) {
      if (game.state === 'finished') {
        // Let FINISH! hold a moment, then clear it.
        for (const r of active()) {
          if (r.bannerT === Infinity) r.bannerT = BANNER_S
          if (r.bannerT > 0 && (r.bannerT -= Math.min(now - last, 250) / 1000) <= 0) overlays[r.p].banner(null)
        }
      }
      last = now
      if (!document.hidden) raf = requestAnimationFrame(frame)
      return
    }
    const dt = last ? Math.min(now - last, 250) / 1000 : STEP
    last = now
    acc += dt
    while (acc >= STEP && (game.state === 'countdown' || game.state === 'racing')) {
      if (game.tick(STEP) === 'go') bottom.announce('Go')
      if (game.driving) {
        for (const r of active()) {
          step(r.kart, r.finishMs == null ? snaps[r.p] : COAST, ground, STEP)
          const events = r.tracker.update(r.kart, STEP)
          checkSplits(r) // before events: the finish line is also the last checkpoint
          for (const e of events) onEvent(r, e)
          if (r.boosting && r.kart.boostT <= 0) setBoost(r, false)
          if (game.state !== 'racing') break // a Story freeze or the finish stops the step here
        }
      }
      acc -= STEP
    }
    if (game.state === 'frozen') {
      acc = 0
      raf = requestAnimationFrame(frame) // keep polling input so Enter or gamepad Start can continue
      return // freeze() drew the frame
    }
    if (game.label !== label) {
      label = game.label
      for (const r of active()) overlays[r.p].countdown(label)
    }
    for (const r of active()) {
      if (r.bannerT > 0 && r.bannerT !== Infinity && (r.bannerT -= dt) <= 0) overlays[r.p].banner(r.wrongWay ? 'WRONG WAY' : null)
    }
    for (let slot = 0; slot < GATES_PER_LAP; slot++) {
      if (respawnAt[slot] && performance.now() >= respawnAt[slot]) {
        respawnAt[slot] = 0
        scene.showGate(slot, slotNeeded(slot))
      }
    }
    syncHud()
    draw(dt)
    raf = requestAnimationFrame(frame)
  }
  function run() {
    if (raf || document.hidden) return
    last = 0
    raf = requestAnimationFrame(frame)
  }

  // V5-11: pause on blur and when hidden; resume the idle poll when visible again.
  window.addEventListener('blur', () => {
    input.clear()
    pause()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      input.clear()
      pause()
      cancelAnimationFrame(raf)
      raf = 0
    } else run()
  })

  game.loaded()
  overlays[0].loading(false)
  overlays[0].title({
    onStart: startRace,
    onNotes: () => notes.open(),
    showAutoGas: coarse,
    autoGas,
    onAutoGas: (on) => {
      autoGas = on
      input.setAutoGas(on)
      save('kart.autoGas', on ? '1' : '0')
    },
    reducedMotion,
    mode,
    players,
    allowTwo: !coarse, // V5-20: two players share a keyboard
    onChoice: (c) => {
      mode = c.mode
      if (c.players !== players) applyPlayers(c.players)
    },
  })
  applyPlayers(1)
  bottom.setNext(leader().tracker.nextStop)
  run()
}
