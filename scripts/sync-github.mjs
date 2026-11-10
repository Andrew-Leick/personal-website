#!/usr/bin/env node
// Fetch public stats for every project with a "githubRepo" and write src/data/generated/github.json.
// Usage: node scripts/sync-github.mjs   (uses GITHUB_TOKEN if set; works without it for public repos)
// Never edits projects.json. On any failure the existing github.json is left untouched and the script exits 1.

import { writeFileSync, mkdirSync, renameSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { ROOT, readContentFiles } from './lib/content-files.mjs'
import { FILES } from '../src/lib/content/validate.js'

/**
 * Repositories never synced or shown, matched by repo name ("CS131_release") or "owner/name".
 * CS131_release is a fork of Stanford course homework; Andrew decided not to show it.
 */
export const EXCLUDE = ['CS131_release']

const OUT = join(ROOT, FILES.github)
const TIMEOUT_MS = 10_000
const isExcluded = (full) => EXCLUDE.some((x) => x.toLowerCase() === full.toLowerCase() || x.toLowerCase() === full.split('/')[1].toLowerCase())

const { raw, issues } = readContentFiles()
if (!Array.isArray(raw.projects)) {
  console.error(`✖ Cannot read ${FILES.projects}${issues.length ? `: ${issues.map((i) => i.message).join('; ')}` : ''}. github.json left unchanged.`)
  process.exit(1)
}

const wanted = [...new Set(raw.projects.map((p) => p && p.githubRepo).filter((r) => typeof r === 'string' && /^[\w.-]+\/[\w.-]+$/.test(r)))]
const skipped = wanted.filter(isExcluded)
const repos = wanted.filter((r) => !isExcluded(r))
for (const r of skipped) console.log(`- skipped ${r} (on the exclude list in scripts/sync-github.mjs)`)

const headers = { accept: 'application/vnd.github+json', 'user-agent': 'portfolio-github-sync', 'x-github-api-version': '2022-11-28' }
if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`

async function fetchRepo(fullName) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`https://api.github.com/repos/${fullName}`, { headers, signal: ctrl.signal })
    if (!res.ok) {
      const hint = res.status === 404 ? ' (repo not found or private)' : res.status === 403 || res.status === 429 ? ' (rate limited; set GITHUB_TOKEN and retry)' : ''
      throw new Error(`HTTP ${res.status}${hint}`)
    }
    const d = await res.json()
    return {
      url: d.html_url,
      description: d.description ?? '',
      language: d.language ?? null,
      stars: d.stargazers_count ?? 0,
      updatedAt: d.pushed_at ?? d.updated_at,
      homepage: d.homepage ? d.homepage : null,
    }
  } catch (err) {
    const reason = err.name === 'AbortError' ? `timeout after ${TIMEOUT_MS / 1000}s` : err.cause?.code ?? err.message
    throw new Error(`${fullName}: ${reason}`, { cause: err })
  } finally {
    clearTimeout(timer)
  }
}

let results
try {
  results = await Promise.all(repos.map(async (r) => [r, await fetchRepo(r)]))
} catch (err) {
  console.error(`✖ GitHub sync failed: ${err.message}`)
  console.error(`  ${FILES.github} was left unchanged.`)
  process.exit(1)
}

const data = { generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'), repos: Object.fromEntries(results) }
mkdirSync(dirname(OUT), { recursive: true })
const tmp = `${OUT}.tmp`
writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`)
renameSync(tmp, OUT)
for (const [name, r] of results) console.log(`✓ ${name}: ★ ${r.stars}, ${r.language ?? 'no language'}, updated ${r.updatedAt}`)
console.log(`Wrote ${FILES.github} (${results.length} repo${results.length === 1 ? '' : 's'}).`)
