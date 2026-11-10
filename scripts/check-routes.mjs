#!/usr/bin/env node
// Check the built route files against the content API (spec v2 REQ-945).
// Usage: npm run build && node scripts/check-routes.mjs [distDir]
// Uses BASE_PATH (default "/"), the same variable vite.config.js reads, so run it with the
// value the build used. Also checks the self-hosted fonts (spec v3 REQ-1061). Exits 1 with one line per problem.

import { resolve } from 'node:path'
import { ROOT, loadAndValidate, formatReport } from './lib/content-files.mjs'
import { normalizeContent } from '../src/lib/content/normalize.js'
import { checkRoutes, checkFonts } from './lib/routes-check.mjs'

const base = process.env.BASE_PATH ?? '/'
const distDir = resolve(ROOT, process.argv[2] ?? 'dist')

const validation = loadAndValidate()
if (validation.errors.length) {
  console.error(formatReport(validation))
  console.error('✖ Fix content errors before checking routes.')
  process.exit(1)
}
const content = normalizeContent(validation.raw, { baseUrl: base })
const routes = checkRoutes(distDir, content, base)
const fonts = checkFonts(distDir)
const problems = [...routes.problems, ...fonts.problems]
const checked = [...routes.checked, ...fonts.checked]

for (const f of checked) console.log(`✓ ${f}`)
for (const p of problems) console.log(`✖ ${p}`)
console.log(
  problems.length
    ? `\nRoutes failed: ${problems.length} problem${problems.length === 1 ? '' : 's'}`
    : `\nRoutes OK: home + ${content.pages.length} page${content.pages.length === 1 ? '' : 's'} + 404.html, sitemap matches, ${fonts.checked.length} font files OK (base "${base}")`,
)
process.exit(problems.length ? 1 : 0)
