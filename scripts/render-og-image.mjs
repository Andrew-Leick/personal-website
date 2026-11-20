#!/usr/bin/env node
// Renders public/og-image.png, the 1200x630 link preview (SPEC-v6 P-02), from the site's own fonts,
// sprites and colors: the trainer beside the name and headline, and the hero's "Choose your starter"
// dialog box with the three starters. Uses headless Chrome over the DevTools protocol (Node's global
// WebSocket, no dependencies). Not part of `npm run ci`; run `npm run og-image` after changing the
// name, headline, trainer sprite or colors. CHROME_PATH overrides the browser location.

import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const pub = join(root, 'public')
const out = join(pub, 'og-image.png')
const chrome = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9400 + Math.floor(Math.random() * 400)

const profile = JSON.parse(readFileSync(join(root, 'src/data/profile.json'), 'utf8'))
const tokens = readFileSync(join(root, 'src/styles/tokens.css'), 'utf8')
const trainer = readFileSync(join(root, 'src/components/PixelSprite/trainer.js'), 'utf8')

/** A token's literal value from tokens.css (the primitives and sprite colors are plain hex). */
const token = (name) => {
  const m = tokens.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{3,8})`))
  if (!m) throw new Error(`token ${name} not found in tokens.css`)
  return m[1]
}

/** The trainer sprite as an SVG, from its grid and palette in trainer.js (SPEC-v6 P-05). */
function trainerSvg(scale) {
  const block = trainer.slice(trainer.indexOf('export const TRAINER = {'))
  const grid = [...block.slice(0, block.indexOf('],')).matchAll(/'([^']+)'/g)].map((m) => m[1])
  const palette = Object.fromEntries(
    [...block.slice(block.indexOf('palette: {'), block.indexOf('},', block.indexOf('palette: {'))).matchAll(/(\w): (OUTLINE|'var\((--[a-z-]+)\)')/g)].map(
      (m) => [m[1], m[2] === 'OUTLINE' ? token('--sprite-outline') : token(m[3])],
    ),
  )
  let rects = ''
  grid.forEach((row, y) => [...row].forEach((k, x) => {
    if (k !== '.') rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${palette[k]}"/>`
  }))
  const w = grid[0].length
  const h = grid.length
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * scale}" height="${h * scale}" shape-rendering="crispEdges">${rects}</svg>`
}

const file = (p) => pathToFileURL(join(pub, p)).href
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "Press Start 2P"; src: url("${file('fonts/press-start-2p-latin-400.woff2')}") format("woff2"); }
@font-face { font-family: "VT323"; src: url("${file('fonts/vt323-latin-400.woff2')}") format("woff2"); }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; overflow: hidden; background: ${token('--pk-paper')}; color: ${token('--pk-ink')}; }
.card { position: relative; width: 1200px; height: 630px; padding: 56px 80px; }
.top { display: flex; align-items: flex-end; gap: 40px; }
.name { font-family: "Press Start 2P"; font-size: 52px; line-height: 1.4; }
.headline { font-family: "VT323"; font-size: 40px; color: ${token('--pk-ink-2')}; margin-top: 8px; }
.dialog { position: absolute; left: 80px; right: 80px; bottom: 48px; padding: 22px 28px 14px; background: ${token('--pk-white')};
  border: 6px solid ${token('--pk-ink')}; border-radius: 10px; box-shadow: inset 0 0 0 3px ${token('--pk-white')}, inset 0 0 0 6px ${token('--pk-slate')}; }
.prompt { font-family: "Press Start 2P"; font-size: 22px; }
.party { display: flex; justify-content: space-around; margin-top: -4px; }
.party img { width: 192px; height: 192px; image-rendering: pixelated; margin: -24px 0 -40px; }
.more { position: absolute; right: 26px; bottom: 18px; width: 0; height: 0; border-left: 14px solid transparent; border-right: 14px solid transparent;
  border-top: 14px solid ${token('--pk-red')}; }
</style></head><body><div class="card">
<div class="top">${trainerSvg(1)}<div><div class="name">${profile.name}</div><div class="headline">${profile.headline}</div></div></div>
<div class="dialog"><div class="prompt">Choose your starter</div><div class="party">
${['charmander', 'bulbasaur', 'squirtle'].map((n) => `<img src="${file(`sprites/${n}.png`)}" alt="">`).join('')}
</div><div class="more"></div></div>
</div></body></html>`

const dir = mkdtempSync(join(tmpdir(), 'og-image-'))
const page = join(dir, 'og.html')
writeFileSync(page, html)

const browser = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${join(dir, 'profile')}`, '--allow-file-access-from-files', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
try {
  let target = null
  for (let i = 0; i < 50 && !target; i += 1) {
    await sleep(200)
    target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json()).catch(() => null)
  }
  if (!target) throw new Error(`could not reach Chrome at ${chrome}`)
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })
  let id = 0
  const waiting = new Map()
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id) }
  }
  const send = (method, params = {}) => new Promise((r) => { id += 1; waiting.set(id, r); ws.send(JSON.stringify({ id, method, params })) })
  await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false })
  await send('Page.enable')
  await send('Page.navigate', { url: pathToFileURL(page).href })
  await sleep(800)
  await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => document.fonts.size)', awaitPromise: true })
  await sleep(200)
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1200, height: 630, scale: 1 } })
  writeFileSync(out, Buffer.from(shot.result.data, 'base64'))
  ws.close()
  console.log(`Wrote ${out}`)
} finally {
  browser.kill()
  await sleep(200)
  rmSync(dir, { recursive: true, force: true })
}
