// Read and parse the content JSON files from disk (Node only).
// Shared by validate-content.mjs, the Vite content plugin, check-links and sync-github.

import { readFileSync, existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FILES, jsonParseIssue, validateContent, formatIssue } from '../../src/lib/content/validate.js'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const PUBLIC_DIR = join(ROOT, 'public')

/**
 * @param {string} [root]
 * @returns {{ raw: Record<string, any>, issues: import('../../src/lib/content/validate.js').Issue[] }}
 *   issues: missing files and JSON syntax errors
 */
export function readContentFiles(root = ROOT) {
  const raw = {}
  const issues = []
  for (const [key, file] of Object.entries(FILES)) {
    const full = join(root, file)
    if (!existsSync(full)) {
      if (key !== 'github') {
        issues.push({ file, path: '', message: 'file is missing', hint: 'restore it from git (git checkout -- ' + file + ') or see docs/CONTENT-GUIDE.md' })
      }
      continue
    }
    const text = readFileSync(full, 'utf8').replace(/^﻿/, '')
    try {
      raw[key] = JSON.parse(text)
    } catch (err) {
      issues.push(jsonParseIssue(file, text, err))
    }
  }
  return { raw, issues }
}

/**
 * Read + validate. Returns everything callers need to print or throw.
 * @param {{ strict?: boolean, root?: string }} [options]
 */
export function loadAndValidate({ strict = false, root = ROOT } = {}) {
  const { raw, issues } = readContentFiles(root)
  const { errors, warnings } = validateContent(raw, { strict, publicDir: join(root, 'public') })
  return { raw, errors: [...issues, ...errors], warnings }
}

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** Multi-line report in the spec 6.11 format, ending with the summary line. */
export function formatReport({ raw, errors, warnings }) {
  const lines = [...errors.map((i) => formatIssue(i, 'error')), ...warnings.map((i) => formatIssue(i, 'warning'))]
  const w = plural(warnings.length, 'warning')
  if (errors.length) {
    lines.push(`Content invalid: ${plural(errors.length, 'error')}, ${w}`)
  } else {
    const len = (k) => (Array.isArray(raw[k]) ? raw[k].length : 0)
    lines.push(
      `Content OK: ${len('experience')} experience, ${len('education')} education, ${plural(len('projects'), 'project')}, ` +
        `${plural(len('skills'), 'skill group')}, ${plural(len('links'), 'link')} (${w})`,
    )
  }
  return lines.join('\n')
}
