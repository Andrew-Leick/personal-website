#!/usr/bin/env node
// Check gzip sizes of the production build against REQ-402, per HTML entry (SPEC-v5-kart 4.2).
// Usage: npm run build && node scripts/check-size.mjs
// Main site: JS <= 90 KB gzip, CSS <= 15 KB gzip, fonts <= 32 KB raw (woff2 is already compressed),
// initial transfer (index.html + JS + CSS + fonts, excluding images and the resume PDF) <= 150 KB gzip.
// Kart page (/kart/): JS <= 220 KB gzip (three.js), CSS <= 5 KB gzip. Its models load at runtime.
// An entry counts the scripts, modulepreloads and stylesheets its HTML references, so shared
// chunks count toward both and the kart's chunks never count toward the main site.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { gzipSync } from 'node:zlib'
import { ROOT } from './lib/content-files.mjs'
import { entryAssets } from './lib/entry-assets.mjs'

const KB = 1024
export const BUDGETS = { js: 90 * KB, css: 15 * KB, font: 32 * KB, total: 150 * KB }
export const KART_BUDGETS = { js: 220 * KB, css: 5 * KB }

const DIST = join(ROOT, process.argv[2] ?? 'dist')
const gz = (file) => gzipSync(readFileSync(file), { level: 9 }).length
const fmt = (n) => `${(n / KB).toFixed(2)} KB`
const pad = (s, n) => String(s).padEnd(n)
const lpad = (s, n) => String(s).padStart(n)

if (!existsSync(join(DIST, 'index.html'))) {
  console.error(`✖ ${DIST}/index.html not found. Run "npm run build" first.`)
  process.exit(1)
}
const fontsDir = join(DIST, 'fonts')
if (!existsSync(fontsDir)) {
  console.error('✖ dist/fonts not found. Fonts live in public/fonts (spec v3 6.4).')
  process.exit(1)
}
const fontRows = readdirSync(fontsDir)
  .filter((name) => extname(name) === '.woff2')
  .map((name) => {
    const size = readFileSync(join(fontsDir, name)).length
    return { file: `fonts/${name}`, kind: 'font', raw: size, gzip: size }
  })

const ENTRIES = [
  { html: 'index.html', label: 'Main site', budgets: BUDGETS },
  { html: 'kart/index.html', label: 'Kart page (/kart/)', budgets: KART_BUDGETS, optional: true },
]

let failed = false
for (const entry of ENTRIES) {
  const htmlPath = join(DIST, entry.html)
  if (!existsSync(htmlPath)) {
    if (entry.optional) continue
    console.error(`✖ ${entry.html} not found.`)
    process.exit(1)
  }
  const rows = entryAssets(readFileSync(htmlPath, 'utf8')).map((file) => {
    const full = join(DIST, file)
    return { file, kind: extname(file).slice(1), raw: readFileSync(full).length, gzip: gz(full) }
  })
  rows.push(...fontRows, { file: entry.html, kind: 'html', raw: readFileSync(htmlPath).length, gzip: gz(htmlPath) })
  const sum = (kind) => rows.filter((r) => !kind || r.kind === kind).reduce((a, r) => a + r.gzip, 0)
  const totals = { js: sum('js'), css: sum('css'), font: sum('font'), total: sum() }
  const w = Math.max(30, ...rows.map((r) => r.file.length)) + 2

  console.log(`== ${entry.label}`)
  console.log(`${pad('File', w)}${lpad('Raw', 12)}${lpad('Gzip', 12)}`)
  for (const r of rows) console.log(`${pad(r.file, w)}${lpad(fmt(r.raw), 12)}${lpad(fmt(r.gzip), 12)}`)
  console.log('')
  console.log(`${pad('Budget', w)}${lpad('Used', 12)}${lpad('Limit', 12)}  Result`)
  for (const [key, label] of [['js', 'JavaScript (gzip)'], ['css', 'CSS (gzip)'], ['font', 'Fonts (raw woff2)'], ['total', 'Initial transfer (gzip)']]) {
    if (entry.budgets[key] == null) continue
    const ok = totals[key] <= entry.budgets[key]
    if (!ok) failed = true
    console.log(`${pad(label, w)}${lpad(fmt(totals[key]), 12)}${lpad(fmt(entry.budgets[key]), 12)}  ${ok ? 'OK' : 'OVER BUDGET'}`)
  }
  console.log('')
}

if (failed) {
  console.error('✖ Size budget exceeded (REQ-402). Remove unused code or dependencies, or split rarely used code.')
  process.exit(1)
}
console.log('Size OK (REQ-402, per entry).')
