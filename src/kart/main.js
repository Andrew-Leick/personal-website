// Kart page boot (SPEC-v5 4.3, V5-03 to V5-16): content -> stops, header/footer, frame, scene, state machine, loop.
import './kart.css'
import { getHomeHref, getKart, getKartHref, getSectionHref, getSiteContent } from '../lib/content/index.js'
import { buildStops } from './stops.js'
import { onThemeChange, renderFooter, renderHeader } from './header.js'
import { fitFrame } from './layout.js'
import { createOverlay } from './overlay.js'
import { createBottom, formatTime, renderNotes } from './bottom.js'
import { createScene } from './scene.js'
import { createGround } from './ground.js'
import { COURSE, GATES_PER_LAP, START, gateBoxes, gateFor, gatePose } from './course.js'
import { createProgress } from './progress.js'
import { boost, createKart, step } from './physics.js'
import { createInput } from './input.js'
import { createGame, parseBest } from './game.js'

const STEP = 1 / 60
const BANNER_S = 1.5

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

const content = getSiteContent()
const { profile, links, pages } = content
const homeHref = getHomeHref()
const stops = buildStops(getKart(), getSectionHref)
const n = stops.length
const reducedMotion = media('(prefers-reduced-motion: reduce)')
const coarse = media('(pointer: coarse)')
const savedGas = load('kart.autoGas')
let autoGas = savedGas == null ? coarse : savedGas === '1'

renderHeader($('header'), {
  name: profile.name,
  homeHref,
  items: [...pages.map((p) => ({ id: p.id, href: p.href, label: p.label })), { id: 'kart', href: getKartHref(), label: 'Grand Prix' }],
  currentId: 'kart',
})
renderFooter($('footer'), { name: profile.name, links, resumeUrl: profile.resumeUrl })
const notes = renderNotes($('notes'), stops)
fitFrame($('frame'))

const overlay = createOverlay($('top'))
const bottom = createBottom($('bottom'), { stops, course: COURSE, links, resumeUrl: profile.resumeUrl, homeHref, reducedMotion })
const input = createInput({ touchRoot: bottom.touchRoot, autoGas })
const game = createGame({ best: parseBest(load('kart.best')) })

overlay.loading(true)
let scene
let ground
try {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  scene = await createScene($('top'), { theme, reducedMotion })
  ground = createGround(scene.courseRoot)
} catch (err) {
  console.error(err)
  overlay.loading(false)
  overlay.error("The course didn't load. Try reloading the page.", homeHref)
}

if (scene) boot()

function boot() {
  const kart = createKart(START)
  const tracker = createProgress(COURSE, n)
  let raf = 0
  let last = 0
  let acc = 0
  let label = null
  let bannerT = 0
  let wrongWay = false
  let boosting = false

  if (import.meta.env.DEV) window.kartDebug = { kart, game, tracker, COURSE } // QA hook for headless runs; stripped from builds
  onThemeChange((t) => scene.setTheme(t))
  scene.setGates(Array.from({ length: GATES_PER_LAP }, (_, slot) => ({ slot, boxes: gateBoxes(slot), heading: gatePose(slot).heading })))

  /** Show each slot's boxes when the current lap has a stop at it (MK-style respawn per lap). */
  function showLapGates(lap) {
    for (let slot = 0; slot < GATES_PER_LAP; slot++) scene.showGate(slot, (lap - 1) * GATES_PER_LAP + slot < n)
  }
  function banner(text, seconds = BANNER_S) {
    overlay.banner(text)
    bannerT = seconds
  }
  function setBoost(on) {
    boosting = on
    scene.setBoost(on)
    if (!reducedMotion) overlay.speedLines(on)
  }
  function syncHud() {
    bottom.setHud({ lap: tracker.lap, laps: tracker.laps, timeMs: game.timeMs, gate: tracker.nextStop ?? n, gates: n })
    bottom.setMinimap(kart, tracker.nextStop)
  }
  function draw(dt) {
    scene.setKart(kart)
    scene.follow(kart, dt)
    scene.update(dt)
    scene.render()
  }
  function captureFor() {
    input.setCapture(game.state === 'countdown' || game.state === 'racing' || game.state === 'paused')
  }

  function resetRace() {
    Object.assign(kart, createKart(START))
    tracker.reset()
    acc = 0
    wrongWay = false
    if (boosting) setBoost(false)
    banner(null, 0)
    showLapGates(1)
    bottom.hidePause()
    bottom.hideResults()
    bottom.showCard(null)
    bottom.setNext(tracker.nextStop)
    syncHud()
    captureFor()
    run()
  }
  function startRace() {
    if (!game.start()) return
    overlay.hideTitle()
    resetRace()
  }
  function restart() {
    if (!game.restart()) return
    resetRace()
  }
  function pause() {
    if (!game.pause()) return
    input.clear()
    overlay.countdown(null)
    label = null
    bottom.showPause({ onResume: resume, onRestart: restart, onNotes: () => notes.open(), homeHref })
  }
  function resume() {
    if (!game.resume()) return
    bottom.hidePause()
    run()
  }

  function onEvent(e) {
    if (e.type === 'gate') {
      scene.burstGate(gateFor(e.stop).slot)
      if (!reducedMotion) overlay.flash()
      bottom.showCard(e.stop)
      bottom.setNext(tracker.nextStop)
      bottom.announce(`Item box ${e.stop + 1} of ${n}: ${stops[e.stop].text}`)
      if (tracker.boxHit(e.stop, kart.x, kart.z)) {
        boost(kart)
        setBoost(true)
      }
    } else if (e.type === 'lap') {
      showLapGates(e.lap)
      banner(`LAP ${e.lap}`)
      bottom.announce(`Lap ${e.lap}`)
    } else if (e.type === 'wrongway') {
      wrongWay = e.on
      if (e.on) bottom.announce('Wrong way')
      banner(e.on ? 'WRONG WAY' : null, e.on ? Infinity : 0)
    } else if (e.type === 'finish') {
      const result = game.finish()
      if (!result) return
      if (result.isBest) save('kart.best', String(result.timeMs))
      if (boosting) setBoost(false)
      banner('FINISH!')
      captureFor()
      syncHud()
      bottom.showResults(result, { onRestart: restart })
      bottom.announce(`Finished in ${formatTime(result.timeMs)}`)
    }
  }

  /** Edge-triggered start/pause/restart for the current state. */
  function handleEdges(snap) {
    const s = game.state
    if (s === 'title' && snap.start) startRace()
    else if ((s === 'countdown' || s === 'racing') && snap.pause) pause()
    else if (s === 'paused' && (snap.pause || snap.start)) resume()
    if (snap.restart && s !== 'title') restart()
  }

  // SPEC 4.3. In title/paused/finished only input is polled (gamepad needs polling); nothing simulates or renders.
  function frame(now) {
    raf = 0
    const snap = input.poll()
    handleEdges(snap)
    captureFor()
    const live = game.state === 'countdown' || game.state === 'racing'
    if (!live) {
      if (bannerT > 0 && game.state === 'finished') {
        // Let FINISH! hold, then clear it.
        bannerT -= Math.min(now - last, 250) / 1000
        if (bannerT <= 0) overlay.banner(null)
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
        step(kart, snap, ground, STEP)
        for (const e of tracker.update(kart, STEP)) onEvent(e)
        if (boosting && kart.boostT <= 0) setBoost(false)
      }
      acc -= STEP
    }
    if (game.label !== label) overlay.countdown((label = game.label))
    if (bannerT > 0 && bannerT !== Infinity && (bannerT -= dt) <= 0) overlay.banner(wrongWay ? 'WRONG WAY' : null)
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
  overlay.loading(false)
  overlay.title({
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
  })
  bottom.setNext(tracker.nextStop)
  syncHud()
  draw(0)
  run()
}
