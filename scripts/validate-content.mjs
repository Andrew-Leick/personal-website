#!/usr/bin/env node
// Validate src/data/*.json. Usage: node scripts/validate-content.mjs [--strict]
// Exit code 1 on any error. --strict turns TODO placeholders into errors (used by deploy).

import { loadAndValidate, formatReport } from './lib/content-files.mjs'

const strict = process.argv.includes('--strict')
const result = loadAndValidate({ strict })
const report = formatReport(result)
if (result.errors.length) console.error(report)
else console.log(report)
if (strict && result.errors.length) {
  console.error('Strict mode: TODO placeholders count as errors. Replace them (see docs/CONTENT-GUIDE.md) before deploying.')
}
process.exit(result.errors.length ? 1 : 0)
