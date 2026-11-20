# v5 kart: module contracts (for parallel workers)

Companion to `SPEC-v5-kart.md`. M0 is **done** (do not redo): `three@0.187` is installed, `vite.config.js` has the two entries, the plugin renders the kart head, `kart.json` + `validateKart` + `getKart()` / `getKartHref()` exist, `routes-check` and the per-entry `check-size` work, and the assets are in `public/kart/models/{mario,kart,itembox,course}/`. The `kart/index.html` skeleton exists with these mount points: `[data-kart=header|frame|top|bottom|notes|footer]`.

**Coordinates**: world units = the course OBJ's units, used unscaled. Y is up. The kart drives on XZ. `heading` is in radians: heading 0 faces +X, and heading increases toward +Z (`dx = cos(h)`, `dz = sin(h)`). Times are in seconds unless named `…Ms`.

**Rules for every worker**
- Only edit the files you own. If you need a change in someone else's file, put it in your final report. Do not edit it.
- Pure modules must not import `three` or touch the DOM, so Vitest (`environment: 'node'`) can test them.
- `npm run lint` must show 0 warnings, and `npx vitest run` must pass for your tests.
- Do not commit. The coordinator commits.
- Plain JS with JSDoc comments, matching the repo style. No new dependencies.

## W1 `track`: `src/kart/course.js`, `progress.js`, `physics.js`, `ground.js` + tests

```js
// course.js (pure)
export const ROAD_HALF_WIDTH        // number, approximate road half width at gates
export const GATES_PER_LAP = 4
export const BOX_RADIUS             // collision radius of one item box
export const COURSE                 // { samples: {x,z,heading,dist}[], length, checkpoint, gateSlots: number[4] /* dist along course */ }
export const START                  // { x, z, heading }: the MKDS start line pose, facing race direction
export const SURFACE_BY_MATERIAL    // { lambert201: 'road'|'offroad'|'wall'|'decor', ... } (all 24)
export function lapCount(nStops)    // ceil(n / GATES_PER_LAP)
export function gateFor(stopIndex)  // { lap /*1-based*/, slot }
export function gatePose(slot)      // { x, z, heading /* race direction */, halfWidth }
export function gateBoxes(slot)     // [{ x, z }] 5 boxes across the road at that slot
export function nearestSample(samples, x, z, hint, window) // index; searches only ±window around hint (wraps)
export function signedProgressDelta(prevDist, nextDist, length) // wrapped, in (-length/2, length/2]

// progress.js (pure)
export function createProgress(course, nStops) // -> tracker
tracker.reset()
tracker.update(kart, dt) // -> events[]: {type:'gate', stop}, {type:'lap', lap}, {type:'finish'}, {type:'wrongway', on}
tracker.lap               // 1-based current lap
tracker.laps              // lapCount(nStops)
tracker.nextStop          // index of the next stop to fire, or null when all have fired
tracker.boxHit(stop, x, z) // true if (x,z) is inside a box of that stop's gate row

// physics.js (pure)
export const MAX_SPEED  // tuned so a clean lap takes 28–35 s
export function createKart(start) // { x, y, z, heading, speed, steer, boostT, bumpT }
export function boost(kart)
export function step(kart, input, ground, dt) // input = { throttle, brake, steer }; ground = W1 ground API (or a fake in tests)

// ground.js (three.js allowed)
export function createGround(courseRoot) // courseRoot: Object3D from scene.courseRoot
ground.at(x, z)   // { y, surface: 'road'|'offroad'|'wall'|'out', normalY }
ground.blocked(x, z, dx, dz, dist) // true if a wall face (normalY < 0.5) lies within dist along (dx,dz)
```

## W2 `scene`: `src/kart/scene.js` (+ a tiny pure helper and a test, if any)

```js
export async function createScene(hostEl, { theme, reducedMotion }) // appends a 256×192 canvas, loads every model
// returns:
scene.canvas            // the <canvas> (role="img", aria-label set by scene)
scene.courseRoot        // Object3D with the course meshes (materials keep their MTL names, e.g. "lambert201")
scene.setKart({ x, y, z, heading, steer, bumpT, boostT })   // places the Mario+kart group, lean, bounce
scene.follow(kart, dt)  // chase camera (rigid when reducedMotion)
scene.setGates(rows)    // rows: [{ slot, boxes: [{x,z}], heading }] -> builds item box rows (shared geometry)
scene.showGate(slot, visible)
scene.burstGate(slot)   // 6-step scale-up + fade (instant hide when reducedMotion)
scene.setBoost(on)      // +6° FOV kick (none when reducedMotion)
scene.setTheme('light'|'dark')
scene.update(dt)        // box spin and bob, bursts, Mario blink
scene.render()
scene.dispose()
```
Look: `antialias:false`, `setPixelRatio(1)`, `setSize(256,192,false)`, NearestFilter on every texture, no mipmaps, `MeshLambertMaterial`. The kart MTL has `d 0`, which MTLLoader reads as fully transparent, so force it opaque. Model URLs: `${import.meta.env.BASE_URL}kart/models/...`.

## W3 `ui`: `src/kart/bottom.js`, `overlay.js`, `header.js`, `layout.js`, `kart.css`, `kart/index.html` (markup only; keep the head and the `data-kart` ids)

```js
// header.js
export function renderHeader(el, { name, homeHref, items /* [{id,href,label}] */, currentId: 'kart' }) // includes the theme toggle (same localStorage key and values as src/hooks/useTheme.js)
export function renderFooter(el, { name, links, resumeUrl })
export function onThemeChange(cb) // MutationObserver on <html data-theme>; cb('light'|'dark'); returns unsubscribe

// layout.js
export function fitFrame(frameEl) // integer scale (fractional ≥ 2 if integer wastes > 25%), stacked vs side by side; sets --kart-scale; re-fits on resize; returns cleanup

// overlay.js (DOM over the top screen)
export function createOverlay(topEl)
overlay.loading(on); overlay.error(message, homeHref)
overlay.title({ onStart, onNotes, showAutoGas, autoGas, onAutoGas, reducedMotion }) // reducedMotion -> notes is primary, "Drive anyway" is secondary
overlay.hideTitle()
overlay.countdown(label /* '3'|'2'|'1'|'GO!'|null */)
overlay.flash(); overlay.speedLines(on); overlay.banner(text|null) // 'WRONG WAY', 'LAP 2', 'FINISH!'

// bottom.js (the DS bottom screen)
export function createBottom(el, { stops /* [{id,label,text,href}] */, course /* COURSE */, links, resumeUrl, homeHref, reducedMotion })
bottom.touchRoot        // element where input.js mounts the touch buttons
bottom.setHud({ lap, laps, timeMs, gate /* fired count */, gates })
bottom.showCard(stopIndex); bottom.setNext(stopIndex|null)
bottom.setMinimap({ x, z, heading }, nextStop)
bottom.showPause({ onResume, onRestart, onNotes, homeHref }); bottom.hidePause()
bottom.showResults({ timeMs, bestMs, isBest }, { onRestart }) // focuses its heading; lists every stop with More links, then resume/email/GitHub/LinkedIn
bottom.hideResults()
bottom.announce(text)   // aria-live polite
export function renderNotes(el, stops) // the course notes section (V5-16 list); returns { open() } (opens <details> and focuses it)
export function formatTime(ms) // "m:ss.cc" (pure; export it, and test it)
```

## W4 `game`: `src/kart/input.js`, `src/kart/main.js`, `src/kart/game.js` (pure state machine + timer + best time, tested)

```js
// input.js
export function createInput({ touchRoot }) // keyboard + touch buttons (mounted in touchRoot, coarse pointer only) + Gamepad
input.poll()            // { throttle, brake, steer, start, pause, restart } (start, pause, restart are edge-triggered)
input.setAutoGas(on); input.setCapture(on) // capture: preventDefault on arrows/Space (V5-13)
input.clear()           // called on blur
```
`main.js` wires everything: `getSiteContent()` → `buildStops()` (W5), header and footer, `fitFrame`, overlay loading, `createScene`, `createGround`, the state machine, the fixed-step loop (SPEC 4.3), `progress` events → scene, bottom and overlay, pause on blur/hidden, restart, best time (`localStorage` `kart.best`), auto gas (`kart.autoGas`), and the reduced-motion flow. Code against these contracts. Until a module lands, keep a local stub and delete it once the real one exists.

## W5 `site`: `src/kart/stops.js` (+ test), `src/App.jsx`, `src/pages/JourneyPage.jsx`, `src/pages/HomePage.jsx` (+ their CSS modules if needed), `docs/CONTENT-GUIDE.md`, `README.md`

```js
// stops.js (pure)
export function buildStops(kart, sectionHref /* (id) => href|null */) // -> [{ id, label, text, href }]
```
Site links: "Grand Prix" in the header and footer nav (one `kartItem` in `App.jsx`), and "Take the scenic route" in the hero actions (journey + pages layouts). The main JS budget leaves ~1.2 KB of headroom (88.76 / 90 KB): keep it small.
