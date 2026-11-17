#!/usr/bin/env node
// Check gzip sizes of the production build against REQ-402.
// Usage: npm run build && node scripts/check-size.mjs
// Budgets: JS <= 95 KB gzip total (90 until v5.1, raised for the Pokédex flow), CSS <= 15 KB gzip total, and
// fonts <= 32 KB raw (woff2 is already compressed), initial transfer (index.html + JS + CSS + fonts, excluding images and the resume PDF) <= 150 KB gzip.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { gzipSync } from 'node:zlib'
import { ROOT } from './lib/content-files.mjs'

const KB = 1024
export const BUDGETS = { js: 95 * KB, css: 15 * KB, font: 32 * KB, total: 150 * KB }

const DIST = join(ROOT, process.argv[2] ?? 'dist')
const gz = (file) => gzipSync(readFileSync(file), { level: 9 }).length
const fmt = (n) => `${(n / KB).toFixed(2)} KB`

if (!existsSync(join(DIST, 'index.html'))) {
  console.error(`✖ ${DIST}/index.html not found. Run "npm run build" first.`)
  process.exit(1)
}

const assetsDir = join(DIST, 'assets')
const assets = existsSync(assetsDir) ? readdirSync(assetsDir) : []
const rows = []
for (const name of assets) {
  const ext = extname(name)
  if (ext !== '.js' && ext !== '.css') continue
  const full = join(assetsDir, name)
  rows.push({ file: `assets/${name}`, kind: ext.slice(1), raw: readFileSync(full).length, gzip: gz(full) })
}
const fontsDir = join(DIST, 'fonts')
if (!existsSync(fontsDir)) {
  console.error('✖ dist/fonts not found. Fonts live in public/fonts (spec v3 6.4).')
  process.exit(1)
}
for (const name of readdirSync(fontsDir)) {
  if (extname(name) !== '.woff2') continue
  const size = readFileSync(join(fontsDir, name)).length
  // woff2 is already compressed, so the transfer cost is the raw size.
  rows.push({ file: `fonts/${name}`, kind: 'font', raw: size, gzip: size })
}
const htmlPath = join(DIST, 'index.html')
rows.push({ file: 'index.html', kind: 'html', raw: readFileSync(htmlPath).length, gzip: gz(htmlPath) })

const sum = (kind) => rows.filter((r) => !kind || r.kind === kind).reduce((a, r) => a + r.gzip, 0)
const totals = { js: sum('js'), css: sum('css'), font: sum('font'), total: sum() }

const pad = (s, n) => String(s).padEnd(n)
const lpad = (s, n) => String(s).padStart(n)
const w = Math.max(30, ...rows.map((r) => r.file.length)) + 2
console.log(`${pad('File', w)}${lpad('Raw', 12)}${lpad('Gzip', 12)}`)
for (const r of rows) console.log(`${pad(r.file, w)}${lpad(fmt(r.raw), 12)}${lpad(fmt(r.gzip), 12)}`)
console.log('')
console.log(`${pad('Budget', w)}${lpad('Used', 12)}${lpad('Limit', 12)}  Result`)
let failed = false
for (const [key, label] of [['js', 'JavaScript (gzip)'], ['css', 'CSS (gzip)'], ['font', 'Fonts (raw woff2)'], ['total', 'Initial transfer (gzip)']]) {
  const ok = totals[key] <= BUDGETS[key]
  if (!ok) failed = true
  console.log(`${pad(label, w)}${lpad(fmt(totals[key]), 12)}${lpad(fmt(BUDGETS[key]), 12)}  ${ok ? 'OK' : 'OVER BUDGET'}`)
}
if (failed) {
  console.error('\n✖ Size budget exceeded (REQ-402). Remove unused code or dependencies, or split rarely used code.')
  process.exit(1)
}
console.log('\nSize OK (REQ-402).')
