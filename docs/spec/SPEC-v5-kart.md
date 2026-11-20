# Portfolio Site v5: Kart minigame ("Grand Prix")

| | |
| :- | :- |
| Repo | this worktree (Vite 8.3 + React 19, Node 24, branch `Andrew-Leick/Mario-Kart-Minigame`) |
| Date | 2026-11-19 (rev. 2: Andrew's answers applied) |
| Status | **Approved plan. Nothing is built.** |

## 0. Precedence and reading order

v5 adds one separate page to the site, plus entry links on the site. It does **not** change the v4 journey's behavior. `SPEC.md` through `SPEC-v4.md` still apply everywhere outside `/kart/`. `CONTENT-FACTS.md` still governs every word of content. The game may only state facts that are in that file, and Andrew approved the copy in section 7.

Read before building: `README.md` ("How it fits together", "Scripts"), `docs/spec/SPEC-v4.md` (sections 2 and 4), `docs/CONTENT-GUIDE.md`, this file.
Helpful skills: `nintendo-game-designer` (installed at `.claude/skills/`; feel and teaching), `animate` (HUD motion), `ponytail` (scope).

### Andrew's decisions (2026-11-19)

| # | Decision |
| :- | :- |
| D1 | Name **"Grand Prix"**, URL `/kart/`. The hero link reads **"Take the scenic route"**. "Grand Prix" also goes in the **header nav** (it may be removed later, so keep it to one line) and the footer nav. |
| D2 | The 8 draft facts in section 7.3 are approved. |
| D3 | The driver is **Mario**, using the real **Mario Kart DS** models (The Models Resource). The style should match the main page as closely as possible: a low-res render with crisp, unfiltered pixels, like the site's pixel sprites. |
| D4 | The kart page **follows the site's light/dark theme**. |
| D5 | List `/kart/` in the sitemap. |
| D6 | Trademark isn't a concern ("just for fun, stays local"). Nintendo assets are allowed. See section 2.4 for the one deploy caveat. |

## 1. Goal

A short, playable Mario Kart DS-style race on its own page. You drive Mario around **Figure-8 Circuit** (MKDS's first course). Rows of **item boxes** across the road are the fact gates. Driving through one bursts the boxes and puts a fact about Andrew on the **bottom screen**, which is laid out like a DS, so the facts never cover the road. After the last lap, the results list every fact with links into the site and contact links.

Design rules (from the Nintendo skill):
- **Playable in 5 seconds.** One key or tap starts the race. The instructions are 3 lines or fewer.
- **About 60 s total**: 2 laps of about 30 s. No opponents, no lives, no losing.
- **You can't miss a fact.** Crossing a gate line fires it anywhere across the road. Hitting a box directly is only a bonus (a mushroom-style boost), so steering still matters.
- **The "delicious" moment** is driving through the item boxes: the box bursts, a white flash, the fact drops onto the bottom screen.
- **Everything is available without playing** (section 9).

## 2. Research and decisions

### 2.1 Rendering

| Option | Verdict |
| :- | :- |
| **Three.js, real 3D, rendered at DS resolution (chosen)** | Uses the MKDS models as-is: the course, Mario, the kart, item boxes. It renders to a **256×192** buffer (one DS screen) with **nearest-neighbour textures, no mipmaps, no antialiasing**, upscaled with `image-rendering: pixelated`. That looks like MKDS and sits next to the site's pixelated Pokémon sprites. The loaders (`ColladaLoader`, `OBJLoader`, `MTLLoader`) ship in `three/addons` (checked in three 0.187.0). |
| Mode 7 floor + Mario pre-rendered into sprite sheets | The look of SNES / GBA Mario Kart, not MKDS. It needs an offline bake pipeline (render the 3D model from N angles) and still loses the 3D course. More work for a look Andrew didn't ask for. Rejected. |
| Phaser / Kaplay | 2D frameworks: no 3D course. Rejected. |

Cost: three.js adds about 130–180 KB gzip, **only on `/kart/`** (separate entry, section 2.2). The main site's JS doesn't change (88.17 / 90 KB, measured 2026-11-19).

### 2.2 How the page attaches to the site

**A separate Vite HTML entry, `kart/index.html`.** It has its own bundle and URL, and portfolio visitors download none of it. It doesn't touch the router, the journey or the scroll spy. Vite 8 config key: `build.rolldownOptions.input` (`rollupOptions` is deprecated); MPA docs: https://vite.dev/guide/build.html.

Rejected alternatives:
- A lazy route inside the React SPA would touch `resolveRoute`, `App.jsx`, the journey `<main>` keying and route effects. Its chunk would also count against the 90 KB main budget in `check-size`.
- A `site.json` page would be rendered as a journey section.

**The kart page does not use React** (that would be +58 KB gzip for a canvas and a few panels). It is plain ES modules plus three.js.

### 2.3 Assets (Mario Kart DS, from The Models Resource)

Found and inspected 2026-11-19. The site sits behind Cloudflare (direct `curl` gets a 403), but the downloads work in a browser and from the Wayback Machine:

```bash
# Replace ID. The browser URL is https://www.models-resource.com/download/ID/
curl -L -o ID.zip "http://web.archive.org/web/2024id_/https://www.models-resource.com/download/ID/"
```

| ID | Model | Contents (checked) | Use |
| :- | :- | :- | :- |
| 6237 | Mario | `Mario/P_MR.dae` (COLLADA, **skinned**, 304 vertices), `P_main.png` 64×32, `P_face_1.png` / `P_face_2.png` 32×32 (eye frames), plus a lower-detail `CPU/E_MR.dae` | Driver: `P_MR.dae` |
| 6315 | Standard MR (Mario's kart) | `Standard MR/kart_MR_a.obj` + `.mtl` (181 faces; parts `kart_body`, `kart_tire`, `kart_emblem`), 3 small PNGs | Kart |
| 8596 | Item Box | `Item box/box.obj` + `.mtl` + `box_mat.png` | Fact gates |
| 17105 | Figure-8 Circuit | `cross_course/cross_course.obj` + `.mtl` (1,180 faces, 24 `lambert###` materials, 24 PNGs). Extent: x −285…186, z −167…214, y 35…108 | Course |

Put them, unzipped, under **`public/kart/models/{mario,kart,itembox,course}/`** and commit them (about 0.6 MB in total). Add `public/kart/models/CREDITS.txt` with the source URLs and the date. Don't add Mario Circuit (27151) or other courses in v5.

### 2.4 Deploy caveat (not a blocker)

`.github/workflows/deploy.yml` publishes to GitHub Pages on every push to `main`. If Andrew wants the Nintendo assets to stay local (D6), don't merge this branch to `main` until he decides. The build itself doesn't change because of this.

## 3. Behavior (requirements)

| ID | Requirement |
| :- | :- |
| V5-01 | `/kart/` serves a standalone page with a header that mirrors the site's (name → Home, nav Experience / Projects / About / **Grand Prix** with `aria-current="page"`, theme toggle), the **DS frame** (V5-02), the course-notes region (section 9) and a footer. The React app doesn't load there. |
| V5-02 | **DS frame**: a **top screen** (`<canvas>`, three.js, 256×192 internal) and a **bottom screen** (a 256×192 DOM panel, section 5.3). It is stacked vertically like a DS when the viewport is portrait or tall enough (`height ≥ 2×192×scale + chrome`), otherwise side by side. Scaling uses the largest **integer** factor that fits. If that wastes more than 25% of the available width, use a fractional factor of at least 2. Pixels are always `pixelated`. The device pixel ratio never changes the internal resolution (`renderer.setPixelRatio(1)`). |
| V5-03 | States: `loading` → `title` → `countdown` → `racing` ⇄ `paused` → `finished`. **Loading**: "Loading…" until the models are in. **Title**: "Grand Prix", "Press Enter / Tap to start", ≤ 3 lines of controls, an "Auto gas" toggle on touch devices, and the "Skip the race" link (section 9). **Countdown**: 3, 2, 1, GO! at 0.6 s each (the MK countdown). **Finished**: the results (V5-16). |
| V5-04 | **Laps = `ceil(stops / GATES_PER_LAP)`** (`GATES_PER_LAP = 4`, so 8 stops make 2 laps). Stop *i* is on lap `floor(i / 4) + 1` at gate slot `i % 4`. The HUD shows "LAP 1/2". A race timer runs from GO to the final finish (`m:ss.cc`). The best time is stored in `localStorage` `kart.best`, inside try/catch like `useTheme`. |
| V5-05 | **Fact gates**: each slot is a row of 4–5 rotating item boxes (the MKDS model) spanning the road. Crossing the slot's line forward, in order, on the right lap fires that stop once per run: the boxes burst (scale up and fade in 6 steps, plus a white flash), the bottom screen shows the card (V5-06), and the text goes to the `aria-live` region. Before you reach it, the boxes respawn with the next lap's stop, as in MK. |
| V5-06 | **Bottom-screen card**: styled like the site's `DialogBox` (Press Start 2P label, VT323 body, site tokens). It shows `label`, `text` and "3/8". It stays until the next gate fires. Between gates, the lower strip shows "NEXT: {label}". It never overlaps the top screen. |
| V5-07 | Box bonus: driving into a box's collision sphere while crossing gives a 1.0 s boost (×1.25 max speed, +FOV kick of 6°, speed lines). Purely a bonus. |
| V5-08 | **Surfaces** come from the course's materials (section 6.3): road (full speed), off-road (grass and dirt, capped speed and drag), wall (bump). Steep faces (normal.y < 0.5) count as walls whatever their material. Leaving the mesh (no ground hit) is treated as a wall bump back inside. Item boxes and decor don't block you. |
| V5-09 | Wrong way: if progress falls by more than 6% of the lap length over a rolling 1 s window, show "WRONG WAY" until progress increases again. |
| V5-10 | A lap counts only after the half-lap checkpoint has been crossed (no reverse shortcut). The figure-8 crossing must not confuse progress (the local search in 6.2). |
| V5-11 | Pause: `Esc` / `P`, the bottom-screen pause button, gamepad Start, or automatically on `visibilitychange` (hidden) and window `blur`. It stops the timer and the render loop and shows Resume / Restart / Course notes / Back to site. |
| V5-12 | Restart: `R`, or a button on the pause or results panel. It goes back to the countdown and resets laps, gates, timer and position. No reload. |
| V5-13 | Arrow keys and Space call `preventDefault` only during `countdown`, `racing` or `paused` **and** while focus isn't in a link or form control. On the title and results screens the page scrolls normally. |
| V5-14 | Resizes and orientation changes re-fit the frame (rAF-throttled). |
| V5-15 | **Theme** (D4): the page uses the site's tokens and themes and the same `localStorage` key `theme`. Light theme: daytime course (sky `--pk-sky-1`-like blue, full sun). Dark theme: dusk (deep blue-violet sky from the night palette, lower ambient light, matching fog, item boxes glow slightly brighter). A `MutationObserver` on `<html data-theme>` re-applies sky, fog and lights live, with no reload. The theme toggle in the kart header writes the same key the site uses. |
| V5-16 | **Results** (on the bottom screen, which grows into a full panel below the frame if needed; focus moves to its heading): the time, the best time and a "NEW BEST" flag. Then **every** stop as a list item (`label`, `text`, and a "More" link to its site section), then the résumé, email, GitHub and LinkedIn from `links.json`, then "Drive again" and "Back to site". |
| V5-17 | No audio in v5. Later option: synthesized blips via WebAudio, muted by default. |

## 4. Architecture

### 4.1 Files to add

```
kart/index.html            Vite entry: theme bootstrap (copy of index.html's, comment "keep in sync"), font preload +
                           @font-face (same as index.html), <!-- content:head -->, <!-- content:noscript -->,
                           page skeleton (header, DS frame, course notes, footer), <script type="module" src="/src/kart/main.js">
src/kart/main.js           Boot: content -> stops; load models; build scene; wire input, loop, bottom screen; state machine
src/kart/scene.js          three.js: renderer (256x192, no AA, pixelRatio 1), camera, lights, sky/fog per theme,
                           loaders (Collada/OBJ/MTL), nearest-filter all textures, Mario-in-kart group, item box rows
src/kart/course.js         PURE. Centerline control points (traced over the Figure-8 mesh), GATE_SLOTS, GATES_PER_LAP,
                           CHECKPOINT, SURFACE_BY_MATERIAL; sampleCourse(), nearestSample(), signedProgressDelta(), gateFor()
src/kart/physics.js        PURE. step(kart, input, ground, dt) on the XZ plane; constants exported
src/kart/ground.js         Downward raycast under the kart -> { y, surface } (material lookup + normal test); edge -> 'out'
src/kart/input.js          Keyboard + touch + Gamepad -> one snapshot per frame
src/kart/bottom.js         DOM bottom screen: timer, lap, card, NEXT strip, minimap canvas, banners, pause/results, aria-live
src/kart/stops.js          PURE. getKart() + content -> [{ id, label, text, href }] in order
src/kart/header.js         Kart page header: nav items from content, theme toggle (same key and values as the site)
src/kart/kart.css          Page, frame and bottom-screen styles; imports src/styles/tokens.css + themes/{light,dark}.css
src/kart/__tests__/*.test.js
src/data/kart.json         Stop copy (section 7)
public/kart/models/**      MKDS assets + CREDITS.txt (section 2.3)
```

Pure modules have no DOM or three.js imports, so Vitest (`environment: 'node'`) can test them.

### 4.2 Files to change (every reach of the change)

| File | Change |
| :- | :- |
| `package.json` | Add the dependency `three` (`^0.187.0`). Only `src/kart/**` imports it. |
| `vite.config.js` | `build: { rolldownOptions: { input: { main: 'index.html', kart: 'kart/index.html' } } }` (paths resolved from the config dir). |
| `scripts/vite-plugin-content.js` | `transformIndexHtml`: when `ctx.path === '/kart/index.html'` (dev and build), render the head for `{ kind: 'kart' }`. `sitemapUrls`: append `${siteUrl}kart/` (D5). `writeBundle` stays the same. |
| `src/lib/content/head.js` | `headFor` adds a `kart` branch: title `"Grand Prix \| {name}"` (from `kart.title`), `kart.description`, canonical `${siteUrl}kart/`, robots `index`, no JSON-LD. |
| `src/lib/content/types.js` | Add `kart` to `Route.kind` and a `Kart` typedef. |
| `src/lib/content/routes.js` | Add `'kart'` to `RESERVED_PAGE_IDS`. |
| `src/lib/content/validate.js` | Add `kart` to `FILES` and a `validateKart` (7.2). |
| `src/lib/content/normalize.js`, `index.js` | Normalize `kart`. Export `getKart()` and `getKartHref()` (= `BASE_URL + 'kart/'`). The kart page imports content **only** through `index.js`. |
| `src/App.jsx` | `const kartItem = { id: 'kart', href: getKartHref(), label: 'Grand Prix' }`. Pass `[...pageItems, kartItem]` as the header's `pages` (D1; removing it later is a one-line change) and add it to the footer `navItems`. `Link` already does a full navigation for routes it doesn't know. Check that the journey scroll spy and `aria-current` logic ignore the `kart` id (they key off page ids, so it should never be current). |
| `src/pages/JourneyPage.jsx`, `src/pages/HomePage.jsx` | In the hero `actions` row, add a "Take the scenic route" link to `getKartHref()` using the existing `LinkButton` styles. |
| `scripts/lib/routes-check.mjs` | Exempt `kart` from "emitted but not a shown page". Check `kart/index.html`'s title, canonical, no noindex and no JSON-LD against `headFor({kind:'kart'})`. Skip the "differs from index.html outside the head" rule for it. |
| `scripts/check-size.mjs` | Budget **per HTML entry**. For each of `dist/index.html` and `dist/kart/index.html`, sum the gzip size of its `<script type="module" src>`, `<link rel="modulepreload">` and `<link rel="stylesheet">` files. **Main**: the existing budgets, unchanged. **Kart**: JS ≤ **220 KB** gzip (three.js; tighten it to the measured value + 10% after M1), CSS ≤ 5 KB. Models in `public/kart/` load at runtime and are excluded. Print one table per entry. |
| `scripts/__tests__/` | Test the per-entry asset collection with a small HTML fixture. |
| `docs/CONTENT-GUIDE.md`, `README.md` | `kart.json`, the new page, the assets and credits, the per-entry budgets. |

### 4.3 Frame loop

```
rAF(now):
  input.poll()                                   // gamepad needs polling
  acc += min(now - last, 250ms)
  while acc >= 1/60:
    g = ground.at(kart.x, kart.z)                // raycast: height + surface
    physics.step(kart, input, g, 1/60); progress.update(kart); gates.check(); acc -= 1/60
  kartGroup.position/rotation <- kart (+ lean); camera.follow(kart)
  boxes.spin(); renderer.render(scene, camera)
  bottom.update(state)                           // writes DOM only when a value changes
```

No allocations in the loop: reuse `Vector3` and `Raycaster` instances. Stop the loop when it's not `countdown` or `racing`, or when the page is hidden.

## 5. Controls and screens

### 5.1 Keyboard and gamepad

| Action | Keyboard | Gamepad (standard mapping) |
| :- | :- | :- |
| Accelerate | `↑` / `W` / `X` | A (0), RT (7) |
| Brake / reverse | `↓` / `S` / `Z` | B (1), LT (6) |
| Steer | `←` `→` / `A` `D` | Left stick X (dead zone 0.2, analog), D-pad (14, 15) |
| Start / confirm | `Enter` / `Space` | A (0), Start (9) |
| Pause | `Esc` / `P` | Start (9) while racing |
| Restart | `R` | Select (8) |

Input is a snapshot: `throttle`, `brake`, `steer -1..1`, and edge-triggered `start`, `pause` and `restart`. Clear held keys on `blur`.

### 5.2 Touch

- Coarse pointer → **Auto gas on** by default (toggle on the title screen, remembered in `localStorage`).
- Touch buttons on the bottom screen, like using the DS touchscreen: ◀ ▶ on the left, BRAKE on the right, pause at the top right. They're real `<button>`s using `pointerdown`/`up`/`cancel`, `touch-action: none`, at least 48 CSS px.
- No tilt steering in v5.

### 5.3 Bottom screen layout (256×192 internal, DOM, scaled with the top screen)

- **Top strip**: `LAP 1/2`, timer, gate counter `3/8`.
- **Middle**: the fact card (V5-06), or the minimap when no card is up yet: a 2D canvas showing the course silhouette (from the centerline samples), a red Mario dot and box markers.
- **Lower strip**: `NEXT: {label}` and the touch controls (coarse pointers only).
- The panel surface, border and text use site tokens, so it changes with the theme.

## 6. Engine details

### 6.1 Scene and look (`scene.js`)

- `WebGLRenderer({ antialias: false, powerPreference: 'low-power' })`, `setPixelRatio(1)`, `setSize(256, 192, false)`. CSS does the upscale.
- For **every** loaded texture: `magFilter = minFilter = NearestFilter`, `generateMipmaps = false`, and `colorSpace = SRGBColorSpace`. Materials become `MeshLambertMaterial` (vertex-lit, DS-like). Use no shadows, or a single blob shadow under the kart (a dark transparent quad).
- **Mario**: `ColladaLoader` → `P_MR.dae`, in its bind pose (no animation in v5). He's parented to the kart group with a hand-tuned offset and scale (constants in `scene.js`). Optional: swap `P_face_1` / `P_face_2` every 3–5 s to blink.
- **Kart**: `MTLLoader` + `OBJLoader` → `kart_MR_a.obj`. The wheels are one submesh, so they don't spin in v5.
- **Lean**: roll the kart group by up to ±8° with steering, and a 2-frame stepped bounce on bumps.
- **Camera**: MKDS-style chase camera, FOV 60°, behind and above the kart (starting offset: 0.12 lap-units back, height chosen so Mario sits in the lower third of the frame). It lerps toward the target heading (factor 0.15 per tick) so turns swing the view a little.
- **Sky and fog** follow the theme (V5-15): `scene.background` color + `Fog` color and range. One `HemisphereLight` + one `DirectionalLight` with intensities per theme.
- **Item box**: `box.obj`, translucent material (`opacity ~0.85`), spinning on two axes, gently bobbing. One shared geometry for all instances.

### 6.2 Course (`course.js`, pure)

- **Centerline**: 12–20 control points traced in course coordinates (XZ) over the Figure-8 road, as a closed Catmull-Rom spline. Trace them by rendering the OBJ top-down (an orthographic camera in a throwaway dev page, or by reading the road-material vertices) and **commit only the numbers**. It's sampled every 1 unit into `samples[] = {x, z, heading, dist}` plus `LENGTH`.
- The path **crosses itself**. Progress tracking keeps `progressIndex` and each tick searches only ±N samples around it (wrapping), with N covering about 0.5 s of travel. The local search is what stops it snapping onto the other branch at the crossing.
- `GATE_SLOTS`: 4 distances on the straighter stretches, spread out (≥ 6 s apart at `MAX_SPEED`), none within 10% of the crossing or the start line. `CHECKPOINT = LENGTH / 2`. The start/finish is where the MKDS start line is.
- Helpers: `nearestSample(samples, x, z, hint)`, `signedProgressDelta(prev, next, LENGTH)`, `gateFor(stopIndex) → { lap, slot }`.

### 6.3 Ground and surfaces (`ground.js`)

- Each tick: one `Raycaster` from `(x, yTop, z)` straight down against the course mesh (1,180 faces, so brute force is fine; `firstHitOnly`). The hit gives the ground `y` (the kart sits on it, smoothed), the material name and the face normal.
- `SURFACE_BY_MATERIAL` in `course.js` maps each of the 24 `lambert###` materials to `road` / `offroad` / `wall` / `decor`. Fill it in by inspecting each PNG texture. A face with `normal.y < 0.5` is a `wall`. No hit, or a `wall` hit under the kart, means `out`: push back along −velocity until the kart is on a valid surface again, then bump.
- Forward wall check: one short horizontal ray along the velocity (length = speed × dt + kart radius) against faces with `normal.y < 0.5`. A hit means a bump.

### 6.4 Physics (`physics.js`, pure, fixed 1/60 s)

State `{ x, z, y, heading, speed, boostT, bumpT }`. **Units are course units.** Tune `MAX_SPEED` so a clean lap at full throttle takes **28–35 s**. The rest are ratios of it:

| Constant | Value |
| :- | :- |
| `MAX_SPEED` (road) | tuned (see above) |
| Off-road cap | 0.4 × `MAX_SPEED` |
| `ACCEL` | 0.75 × `MAX_SPEED` per s |
| `BRAKE` | 1.75 × `MAX_SPEED` per s |
| `REVERSE_MAX` | 0.25 × `MAX_SPEED` |
| `COAST_DRAG` | 0.33 × `MAX_SPEED` per s |
| Off-road extra drag (above the cap) | 1.5 × `MAX_SPEED` per s |
| `TURN_RATE` | 2.0 rad/s × `clamp(speed / (0.4 × MAX_SPEED), 0, 1)`, inverted in reverse |
| Boost | ×1.25 cap and +0.5 × `MAX_SPEED` instant, for 1.0 s |
| Bump | speed ×= −0.3, `bumpT = 0.15 s` |

No drift or mini-turbo in v5 (the most "MK" upgrade for later).

## 7. Content: `src/data/kart.json`

### 7.1 Shape

```json
{
  "title": "Grand Prix",
  "description": "Drive Mario around Figure-8 Circuit and pick up facts about Andrew Leick from the item boxes.",
  "stops": [
    { "id": "stanford", "label": "STANFORD", "text": "B.S. Electrical Engineering at Stanford. GPA 3.83/4.0, graduating June 2028.", "ref": "education" }
  ]
}
```

`ref` is a placed section id (`about`, `experience`, `projects`, `education`, `skills`, `contact`), resolved with the existing `sectionHrefOf`. Entry-level anchors are out of scope: experience entries have no element `id` today (checked 2026-11-19).

### 7.2 Validation (`validateKart`, errors unless noted)

- `title`: 1–24 chars.
- `description`: 50–160 chars.
- `stops`: 3–12 items (laps = `ceil(n/4)`, so at most 3 laps).
- `id`: matches `ID_RE` and is unique.
- `label`: 1–12 chars, uppercase A–Z, 0–9, space, `'` and `&`.
- `text`: 20–110 chars.
- `ref`: resolves to a placed section.
- `TODO:` placeholders follow the existing warning/strict rules.

### 7.3 Stops (approved, D2; every line traced to `CONTENT-FACTS.md`)

| # | id | label | text | ref |
| :- | :- | :- | :- | :- |
| 1 | stanford | STANFORD | B.S. Electrical Engineering at Stanford. GPA 3.83/4.0, graduating June 2028. | education |
| 2 | amazon-2026 | AMAZON '26 | SDE Intern, 2026: built a log correlation platform. Investigations: 30–60 min to under 10. | experience |
| 3 | amazon-scale | 200+ TB | Its ingestion pipeline handles 100K+ requests/minute and 200+ TB of logs a month on AWS. | experience |
| 4 | amazon-2025 | AMAZON '25 | SDE Intern, 2025: centralized contract storage with Node.js Lambdas, Redshift and QuickSight. | experience |
| 5 | gtri | GTRI | Georgia Tech Research Institute, 2023: 1 of 64 picked from 2,200. Robot mapping with Python and ROS. | experience |
| 6 | first | FIRST | FIRST Robotics team president: led 25 students and a $20,000+ budget. | experience |
| 7 | nfl | NFL CV | NFL Play Reconstruction: built the jersey number, team and offense/defense classifiers. | projects |
| 8 | skills | SKILLS | Java, Python, C/C++, TypeScript, and AWS from Lambda to Athena. | skills |

All 8 fit within 110 characters (63–100, checked). Lap 1 covers stops 1–4, lap 2 covers 5–8. The finish screen adds the contact block (`links.json`) and the résumé. Don't add facts, numbers or adjectives, and no locations.

## 8. Style notes

- The match with the main page comes from **low resolution + nearest filtering + integer upscale + site fonts and tokens on every UI surface** (bottom screen, panels, header, buttons). Don't add post effects (bloom, CRT filters).
- UI text: Press Start 2P for labels and numbers, VT323 for body, both already in `public/fonts/`.
- The countdown and "GO!" are drawn as DOM over the top screen in Press Start 2P with a hard 2px outline, stepped (not eased) scale-in. With reduced motion they appear without scaling.
- Speed lines and the box flash are DOM/CSS overlays on the top screen, not shaders.

## 9. Accessibility and reduced motion

- Top-screen canvas: `role="img"`, `aria-label="Race view: Mario on Figure-8 Circuit"`. Everything that matters is in the DOM.
- **Course notes** (`<section aria-labelledby>` below the frame): a `<details>`, closed while playing, with the same list as the results. It is always present. The title screen has a "Skip the race: read the course notes" link that opens it and focuses it.
- `aria-live="polite"`: gate facts ("Item box 3 of 8: …"), "Go", "Lap 2", "Wrong way", "Finished in 1:02.45".
- Fully playable by keyboard. Real buttons with the site's focus ring. No focus trap.
- `prefers-reduced-motion: reduce`: the title says the game is a motion experience and offers **Course notes** (primary) and **Drive anyway**. If they drive: no camera swing (rigid follow), no FOV kick, no speed lines, no flash (the boxes just disappear), and cards appear without motion.
- No flashing faster than 3 Hz. Text on the bottom screen meets 4.5:1 in both themes.
- `<noscript>`: the existing `renderNoscript` output via the marker.

## 10. Performance

- Fixed 60 Hz simulation with an accumulator, so speed is the same on 120/144 Hz screens. Frame delta clamped to 250 ms.
- The 256×192 render keeps the GPU cost tiny on any device. Expect fewer than 30 draw calls (course materials + kart + Mario + boxes).
- Models load in parallel behind "Loading…" (about 0.6 MB, cached after the first visit). Show an error panel with "Back to site" if a load fails.
- Budgets: see `check-size` in 4.2. The main entry must stay unchanged, and `dist/index.html` must reference no kart or three chunk.

## 11. Tests and verification

Unit tests (`src/kart/__tests__/`, node env), one small file per pure module:
- `course`: the spline closes, `LENGTH` > 0, `GATE_SLOTS` are increasing and spaced ≥ 6 s at `MAX_SPEED` and away from the crossing and start. At the crossing, `nearestSample` with a hint stays on its own branch (both directions). `gateFor` maps 8 stops to 2 laps × 4 slots.
- `physics`: road and off-road caps, no turning at speed 0, reverse inverts steering, the boost expires, the bump reverses speed.
- Progress: a lap completes only after the checkpoint, wrong-way fires on sustained reverse, gates fire once, in order, on the right lap.
- `stops` + `validateKart`: refs resolve, lengths are enforced, 13 stops is an error, the shipped `kart.json` passes `validate:strict`.
- `check-size` per-entry collection.

`npm run ci` must pass (lint 0 warnings, test, validate, build, check:size, check:routes).

Manual / headless Chrome pass, recorded in `docs/qa/REPORT-v5.md`:
- 1280×800, 1440×900, 390×844, 844×390: DS frame layout (stacked vs side by side), integer scaling, crisp pixels, touch controls on coarse pointers only.
- Light and dark: the sky, fog, lights and bottom screen match. Toggling the theme mid-race updates live.
- A full race by keyboard: 8 gates in order across 2 laps, a card and an aria-live message for each, the results list complete with working links.
- Figure-8 crossing in both directions: no progress jump. Wrong way, reverse over the line (no lap credit), wall bump, an off-road excursion, driving off the mesh edge.
- Pause via Esc, tab switch and blur, with the timer frozen. Restart resets everything.
- Reduced motion: notes-first title, and "Drive anyway" works.
- `/kart/` direct load in dev and `npm run preview`. Header, hero and footer links from the site reach it. "Back to site" lands on Home.
- Gamepad if one is available. A real phone (Safari and Chrome) by hand.
- Lap time with full throttle and a clean line is 28–35 s.

## 12. Build plan (each milestone ends with `npm run ci` green and a commit)

| # | Milestone | Owns | Done when |
| :- | :- | :- | :- |
| M0 | Scaffold + assets | `kart/index.html`, `vite.config.js`, `package.json` (three), plugin `kart` head + sitemap, `head.js`, `routes.js`, `types.js`, `routes-check.mjs`, `check-size.mjs` (+ test), `public/kart/models/**` + CREDITS | `/kart/` shows the frame and a spinning item box at 256×192, crisp and themed, with the right `<title>` and canonical in dev and build. The size report shows two entries, with main JS still at 88.17 KB. |
| M1 | Drivable prototype | `scene.js`, `course.js`, `ground.js`, `physics.js`, `input.js` (keyboard), minimal `main.js` (+ tests) | Mario drives Figure-8 with surfaces, walls, laps and the crossing all correct. It feels good (Nintendo skill: tune before adding anything). Lap time is in range. Tighten the kart JS budget. |
| M2 | Content + bottom screen | `kart.json`, `validateKart`, normalize + `getKart`, `stops.js`, `bottom.js`, gates, results, course notes, aria-live (+ tests) | V5-03 to V5-16 behave as written. |
| M3 | Juice + theme | box burst + flash, countdown, boost, speed lines, lean, blink, theme lighting (V5-15) | Matches section 8 in both themes. |
| M4 | Inputs + access | touch controls, gamepad, auto gas, reduced motion, pause on blur/hidden | Section 9 passes. Phone portrait and landscape work. |
| M5 | Site integration + docs | `App.jsx` (header + footer item), hero links, `CONTENT-GUIDE.md`, `README.md`, `REPORT-v5.md` | The section 11 manual pass is recorded. |

M0 lands first. After it, M1 and the data part of M2 (`kart.json`, validator, `stops.js`) can run in parallel. `main.js`, `scene.js` and `bottom.js` each have one owner. For agent teams, see `docs/agent-teams.md` section 9.

## 13. Out of scope for v5

CPU racers, other characters or courses, firing items, drift/mini-turbo, audio, tilt, Mario animations beyond the blink, leaderboards, analytics, and any change to the journey's behavior.
