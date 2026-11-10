// Content validator (spec 6.11). Pure apart from optional file-existence checks under publicDir.
// No dependencies. Returns { errors: Issue[], warnings: Issue[] } with Issue = { file, path, message, hint }.

import { existsSync, statSync, readdirSync } from 'node:fs'
import { join, extname } from 'node:path'
import { isValidDate, parseDate, DATE_PLACEHOLDER } from './format.js'
import { isPlaceholder, isPlaceholderId } from './placeholders.js'
import { SECTION_IDS, GUIDE_IDS } from './normalize.js'
import { RESERVED_PAGE_IDS } from './routes.js'

/** @typedef {{ file: string, path: string, message: string, hint: string|null }} Issue */

export const DATA_DIR = 'src/data'
export const FILES = {
  site: `${DATA_DIR}/site.json`,
  profile: `${DATA_DIR}/profile.json`,
  links: `${DATA_DIR}/links.json`,
  experience: `${DATA_DIR}/experience.json`,
  education: `${DATA_DIR}/education.json`,
  projects: `${DATA_DIR}/projects.json`,
  skills: `${DATA_DIR}/skills.json`,
  github: `${DATA_DIR}/generated/github.json`,
}

const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const THEME_RE = /^[a-z][a-z0-9-]*$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const REPO_RE = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/
const LOCALE_RE = /^[a-z]{2,3}(_[A-Z]{2})?$/
const HTML_RE = /<\/?[a-z][^>]*>/i
const MD_RE = /\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|^#{1,6}\s/
const IMAGE_EXTS = ['.webp', '.avif', '.png', '.jpg', '.jpeg']
const MAX_HEADSHOT_BYTES = 60 * 1024
const MAX_PROJECT_IMAGE_BYTES = 150 * 1024

// ---------------------------------------------------------------------------
// Field schema helpers

const s = (max, extra = {}) => ({ type: 'string', max, ...extra })
const req = (spec) => ({ ...spec, required: true })
const nul = (spec) => ({ ...spec, nullable: true })
const strArr = (minItems, maxItems, itemMax, extra = {}) => ({ type: 'strArray', minItems, maxItems, itemMax, ...extra })
const imageSpec = (altMax, maxBytes) => ({
  type: 'object',
  fields: {
    src: req({ type: 'localPath', exts: IMAGE_EXTS, maxBytes }),
    alt: req(s(altMax)),
  },
})

const SCHEMAS = {
  site: {
    siteUrl: req({ type: 'url', endsWithSlash: true }),
    title: req(s(70)),
    description: req(s(160, { min: 50 })),
    locale: req({ type: 'string', max: 10, pattern: LOCALE_RE, patternHint: 'use a locale such as "en_US"' }),
    ogImage: req(nul({ type: 'localPath', exts: IMAGE_EXTS })),
    ogImageAlt: req(nul(s(120))),
    defaultTheme: req({ type: 'string', max: 40, pattern: THEME_RE, patternHint: 'use "system", "light", "dark" or a lowercase theme name like "navy"' }),
    themeToggle: req({ type: 'boolean' }),
    fanArt: { type: 'boolean', hint: 'use true to show the sprites or false to hide them' },
    pages: req({
      type: 'array',
      minItems: 1,
      maxItems: 6,
      item: {
        type: 'object',
        fields: {
          id: req({ type: 'id' }),
          label: req(s(20)),
          guide: nul({ type: 'enum', values: GUIDE_IDS }),
          blurb: req(s(100)),
          description: req(s(160, { min: 50 })),
          teaser: nul(s(100)),
          visible: { type: 'boolean' },
          sections: req({
            type: 'array',
            minItems: 1,
            item: {
              type: 'object',
              fields: {
                id: req({ type: 'enum', values: SECTION_IDS }),
                label: req(s(20)),
                visible: { type: 'boolean' },
              },
            },
          }),
        },
      },
    }),
  },
  profile: {
    name: req(s(60)),
    headline: req(s(80)),
    summary: req(s(280)),
    about: req(strArr(1, 4, 700)),
    currently: nul(s(160)),
    location: nul(s(60)),
    availability: nul(s(80)),
    email: req({ type: 'email' }),
    contactBlurb: nul(s(200)),
    resumeUrl: nul({ type: 'localPath', exts: ['.pdf'] }),
    photo: nul(imageSpec(120, MAX_HEADSHOT_BYTES)),
  },
  links: {
    id: req({ type: 'id' }),
    kind: req({ type: 'enum', values: ['github', 'linkedin', 'email', 'website', 'scholar', 'other'] }),
    label: req(s(30)),
    url: req({ type: 'linkUrl' }),
    showInHero: { type: 'boolean' },
    visible: { type: 'boolean' },
  },
  experience: {
    id: req({ type: 'id' }),
    organization: req(s(80)),
    organizationUrl: nul({ type: 'url' }),
    role: req(s(80)),
    employmentType: nul({ type: 'enum', values: ['full-time', 'part-time', 'internship', 'research', 'teaching', 'contract', 'volunteer'] }),
    location: nul(s(60)),
    start: req({ type: 'date' }),
    end: req(nul({ type: 'date' })),
    summary: nul(s(280)),
    highlights: strArr(0, 6, 240),
    technologies: strArr(0, 12, 30, { unique: true }),
    visible: { type: 'boolean' },
  },
  education: {
    id: req({ type: 'id' }),
    institution: req(s(80)),
    institutionUrl: nul({ type: 'url' }),
    degree: req(s(40)),
    field: req(s(80)),
    minor: nul(s(80)),
    location: nul(s(60)),
    // Spec says required; relaxed to optional because resumes often list only the graduation date.
    start: nul({ type: 'date' }),
    end: req({ type: 'date' }),
    expected: { type: 'boolean' },
    gpa: nul(s(20)),
    honors: strArr(0, 6, 120),
    coursework: strArr(0, 12, 60, { unique: true }),
    visible: { type: 'boolean' },
  },
  projects: {
    id: req({ type: 'id' }),
    title: req(s(60)),
    summary: req(s(200)),
    role: nul(s(120)),
    teamSize: nul({ type: 'integer', min: 1 }),
    context: nul(s(60)),
    start: nul({ type: 'date' }),
    end: nul({ type: 'date' }),
    status: req({ type: 'enum', values: ['complete', 'in-progress', 'archived'] }),
    featured: { type: 'boolean' },
    order: { type: 'integer' },
    highlights: strArr(0, 6, 240),
    technologies: strArr(0, 12, null, { unique: true }),
    links: {
      type: 'object',
      fields: {
        repo: nul({ type: 'url' }),
        demo: nul({ type: 'url' }),
        writeup: nul({ type: 'url' }),
      },
    },
    githubRepo: nul({ type: 'string', max: 140, pattern: REPO_RE, patternHint: 'use "owner/name", e.g. "Andrew-Leick/my-repo"' }),
    image: nul(imageSpec(160, MAX_PROJECT_IMAGE_BYTES)),
    visible: { type: 'boolean' },
  },
  skills: {
    id: req({ type: 'id' }),
    name: req(s(30)),
    items: req(strArr(1, 20, 30, { unique: true })),
    visible: { type: 'boolean' },
  },
}

const GITHUB_REPO_FIELDS = {
  url: req({ type: 'url' }),
  description: req(nul({ type: 'string', max: 1000, allowEmpty: true })),
  language: req(nul({ type: 'string', max: 100 })),
  stars: req({ type: 'integer', min: 0 }),
  updatedAt: req({ type: 'string', max: 40 }),
  homepage: req(nul({ type: 'string', max: 500, allowEmpty: true })),
}

// ---------------------------------------------------------------------------
// Small utilities

/** Levenshtein distance (small strings only). */
export function editDistance(a, b) {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 1; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
  }
  return dp[m][n]
}

/** Closest allowed key within edit distance 2, case-insensitive; null if none. */
export function suggestKey(key, allowed) {
  let best = null
  let bestDist = 3
  for (const candidate of allowed) {
    const d = editDistance(key.toLowerCase(), candidate.toLowerCase())
    if (d < bestDist) {
      best = candidate
      bestDist = d
    }
  }
  return bestDist <= 2 ? best : null
}

const q = (v) => JSON.stringify(v)
const typeName = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v)
const preview = (v) => {
  const t = q(v)
  return t && t.length > 60 ? `${t.slice(0, 57)}..."` : t
}

/** "[2] (id "foo")" style prefix for list items. */
function itemPath(index, item) {
  const id = item && typeof item === 'object' && typeof item.id === 'string' && ID_RE.test(item.id) ? item.id : null
  return id ? `[${index}] (id ${q(id)})` : `[${index}]`
}

const join2 = (base, key) => (base ? `${base}.${key}` : key)

/** Format one issue as a single line (spec REQ-111). */
export function formatIssue(issue, level = 'error') {
  const icon = level === 'error' ? '✖' : '⚠'
  const where = issue.path ? `${issue.file} → ${issue.path}` : issue.file
  const end = (text) => (/[.?!]$/.test(text) ? text : `${text}.`)
  const hint = issue.hint ? ` Hint: ${end(issue.hint)}` : ''
  return `${icon} ${where}: ${end(issue.message)}${hint}`
}

/**
 * Turn a JSON.parse error into an Issue with line/column and a hint.
 * @param {string} file
 * @param {string} text
 * @param {Error} err
 * @returns {Issue}
 */
export function jsonParseIssue(file, text, err) {
  const raw = String(err && err.message ? err.message : err)
  let pos = null
  let line = null
  let column = null
  const lc = /line (\d+) column (\d+)/.exec(raw)
  const p = /position (\d+)/.exec(raw)
  if (p) pos = Number(p[1])
  if (lc) {
    line = Number(lc[1])
    column = Number(lc[2])
  } else if (pos !== null) {
    const before = text.slice(0, pos).split('\n')
    line = before.length
    column = before[before.length - 1].length + 1
  }
  if (pos === null && line !== null) {
    const lines = text.split('\n')
    pos = lines.slice(0, line - 1).reduce((acc, l) => acc + l.length + 1, 0) + column - 1
  }
  const reason = raw
    .replace(/\s*\(line \d+ column \d+\)/, '')
    .replace(/\s*in JSON at position \d+/, '')
    .replace(/,\s*"[\s\S]*" is not valid JSON$/, '')
    .trim()
  let hint = 'check for a missing comma, quote, or bracket just before this point'
  if (text.trim() === '') hint = 'the file is empty; it must contain a JSON value such as [] or {}'
  else if (pos !== null) {
    const prev = text.slice(0, pos).replace(/\s+$/, '')
    const next = text.slice(pos).replace(/^\s+/, '')
    if (prev.endsWith(',') && /^[}\]]/.test(next)) hint = 'check for a trailing comma'
    else if (/^'/.test(next)) hint = 'JSON strings and keys need double quotes, not single quotes'
    else if (/^\/[/*]/.test(next)) hint = 'JSON does not allow comments'
    else if (/^[A-Za-z_$]/.test(next) && /[{,]$/.test(prev)) hint = 'keys must be in double quotes, e.g. "title": "..."'
    else if (/["\]}\d]$|true$|false$|null$/.test(prev) && /^["{[]/.test(next)) hint = 'check for a missing comma between values'
  }
  const at = line !== null ? ` at line ${line}, column ${column}` : ''
  return { file, path: '', message: `invalid JSON${at}: ${reason}`, hint }
}

// ---------------------------------------------------------------------------
// Validator core

class Ctx {
  constructor({ strict, publicDir, fileExists, fileSize, listDir }) {
    this.strict = Boolean(strict)
    this.publicDir = publicDir || null
    this.fileExists = fileExists || ((p) => existsSync(p))
    this.listDir = listDir || ((p) => {
      try {
        return readdirSync(p)
      } catch {
        return []
      }
    })
    this.fileSize = fileSize || ((p) => {
      try {
        return statSync(p).size
      } catch {
        return null
      }
    })
    this.errors = []
    this.warnings = []
  }

  error(file, path, message, hint = null) {
    this.errors.push({ file, path, message, hint })
  }

  warn(file, path, message, hint = null) {
    this.warnings.push({ file, path, message, hint })
  }

  placeholder(file, path, value, what = 'placeholder text') {
    const hint = 'replace before deploying'
    const message = `${what} ${preview(value)}`
    if (this.strict) this.error(file, path, message, hint)
    else this.warn(file, path, message, hint)
  }
}

function checkPlainString(ctx, file, path, value, spec) {
  if (!spec.allowEmpty && value.trim() === '') {
    ctx.error(file, path, 'must not be empty', spec.nullable ? 'remove the field or set it to null' : 'add text or fix the entry')
    return
  }
  if (value !== value.trim()) ctx.error(file, path, `has leading or trailing spaces: ${preview(value)}`, 'remove the extra whitespace')
  if (HTML_RE.test(value)) ctx.error(file, path, `contains HTML: ${preview(value)}`, 'use plain text only; HTML is not rendered')
  else if (MD_RE.test(value)) ctx.error(file, path, `contains Markdown: ${preview(value)}`, 'use plain text only; Markdown is not rendered')
  if (spec.max && value.length > spec.max) {
    ctx.error(file, path, `is ${value.length} characters, the limit is ${spec.max}`, `shorten it by ${value.length - spec.max} characters`)
  }
  if (spec.min && value.length < spec.min) {
    ctx.error(file, path, `is ${value.length} characters, the minimum is ${spec.min}`, `lengthen it to at least ${spec.min} characters`)
  }
}

function checkLocalPath(ctx, file, path, value, spec) {
  if (value.startsWith('/')) {
    ctx.error(file, path, `local path must not start with "/": ${q(value)}`, `write it relative to public/, e.g. ${q(value.replace(/^\/+/, ''))}`)
    return
  }
  if (/^[a-z]+:/i.test(value)) {
    ctx.error(file, path, `expected a local file path, got ${q(value)}`, 'put the file under public/content/ and write the path relative to public/, e.g. "content/images/photo.webp"')
    return
  }
  if (value.split(/[\\/]/).includes('..')) {
    ctx.error(file, path, `local path must not contain "..": ${q(value)}`, 'write it relative to public/')
    return
  }
  if (spec.exts && !spec.exts.includes(extname(value).toLowerCase())) {
    ctx.error(file, path, `expected a ${spec.exts.join(', ')} file, got ${q(value)}`, spec.exts.length === 1 ? `export the file as ${spec.exts[0]}` : 'use WebP or AVIF for images')
    return
  }
  if (ctx.publicDir) {
    const full = join(ctx.publicDir, value)
    if (!ctx.fileExists(full)) {
      ctx.error(file, path, `file not found: public/${value}`, 'add the file at that path, or fix the path (it is relative to public/)')
      return
    }
    if (spec.maxBytes) {
      const size = ctx.fileSize(full)
      if (size !== null && size > spec.maxBytes) {
        ctx.error(file, path, `public/${value} is ${Math.round(size / 1024)} KB, the limit is ${spec.maxBytes / 1024} KB`, 'compress or resize the image (WebP, see docs/CONTENT-GUIDE.md)')
      }
    }
  }
}

function checkValue(ctx, file, path, value, spec) {
  if (value === null) {
    if (!spec.nullable) ctx.error(file, path, 'must not be null', 'set a value or remove the entry')
    return
  }
  // Placeholders: flagged once, and exempt from format/length checks (they will be replaced).
  if (typeof value === 'string' && ['string', 'url', 'linkUrl', 'email', 'date', 'localPath', 'id'].includes(spec.type) && isPlaceholder(value)) {
    ctx.placeholder(file, path, value, value === DATE_PLACEHOLDER ? 'placeholder date' : 'placeholder text')
    return
  }
  switch (spec.type) {
    case 'string':
      if (typeof value !== 'string') return ctx.error(file, path, `expected text, got ${typeName(value)} ${preview(value)}`, 'wrap the value in double quotes')
      checkPlainString(ctx, file, path, value, spec)
      if (spec.pattern && value.trim() && !spec.pattern.test(value)) ctx.error(file, path, `invalid value ${q(value)}`, spec.patternHint)
      return
    case 'id':
      if (typeof value !== 'string') return ctx.error(file, path, `expected an id string, got ${typeName(value)}`, 'use lowercase words joined by hyphens, e.g. "my-project"')
      if (!ID_RE.test(value)) {
        const fixed = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
        return ctx.error(file, path, `id ${q(value)} is not kebab-case`, `use lowercase letters, digits and single hyphens, e.g. ${q(fixed || 'my-entry')}`)
      }
      if (isPlaceholderId(value)) ctx.placeholder(file, path, value, 'placeholder entry (id starts with "todo-")')
      return
    case 'boolean':
      if (typeof value !== 'boolean') ctx.error(file, path, `expected true or false, got ${preview(value)}`, spec.hint || 'write true or false without quotes')
      return
    case 'integer':
      if (!Number.isInteger(value)) return ctx.error(file, path, `expected a whole number, got ${preview(value)}`, 'write a number without quotes, e.g. 3')
      if (spec.min !== undefined && value < spec.min) ctx.error(file, path, `must be at least ${spec.min}, got ${value}`)
      return
    case 'enum':
      if (typeof value !== 'string' || !spec.values.includes(value)) {
        const sug = typeof value === 'string' ? suggestKey(value, spec.values) : null
        ctx.error(file, path, `invalid value ${preview(value)}`, sug ? `did you mean ${q(sug)}? Allowed: ${spec.values.map(q).join(', ')}` : `use one of ${spec.values.map(q).join(', ')}`)
      }
      return
    case 'url':
      if (typeof value !== 'string' || !/^https:\/\/[^\s/$.?#][^\s]*$/i.test(value)) {
        const hintUrl = typeof value === 'string' ? `https://${value.replace(/^[a-z]+:\/\//i, '')}` : 'https://example.com'
        return ctx.error(file, path, `expected an https:// URL, got ${preview(value)}`, `use the full URL, e.g. ${q(hintUrl)}`)
      }
      if (spec.endsWithSlash && !value.endsWith('/')) ctx.error(file, path, `must end with "/", got ${q(value)}`, `use ${q(`${value}/`)}`)
      return
    case 'email':
      if (typeof value !== 'string' || !EMAIL_RE.test(value)) ctx.error(file, path, `expected an email address, got ${preview(value)}`, 'use a plain address like "name@example.com" (no "mailto:")')
      return
    case 'date':
      if (typeof value !== 'string' || !isValidDate(value)) {
        ctx.error(file, path, `expected a date "YYYY-MM" or "YYYY", got ${preview(value)}`, typeof value === 'string' && /^\d{4}-\d$/.test(value) ? `pad the month, e.g. ${q(value.replace(/-(\d)$/, '-0$1'))}` : 'e.g. "2025-06"; use null for "Present" where allowed')
      }
      return
    case 'localPath':
      if (typeof value !== 'string') return ctx.error(file, path, `expected a file path, got ${typeName(value)}`, 'e.g. "content/resume/andrew-leick-resume.pdf"')
      checkLocalPath(ctx, file, path, value, spec)
      return
    case 'linkUrl':
      // kind-dependent; checked in links-specific pass
      return
    case 'strArray':
      return checkStrArray(ctx, file, path, value, spec)
    case 'array':
      if (!Array.isArray(value)) return ctx.error(file, path, `expected a list [...], got ${typeName(value)}`)
      if (spec.minItems !== undefined && value.length < spec.minItems) ctx.error(file, path, `has ${value.length} items, needs at least ${spec.minItems}`, 'add an item')
      if (spec.maxItems !== undefined && value.length > spec.maxItems) ctx.error(file, path, `has ${value.length} items, the limit is ${spec.maxItems}`, `remove ${value.length - spec.maxItems} item(s)`)
      value.forEach((item, i) => checkValue(ctx, file, `${path}${itemPath(i, item)}`, item, spec.item))
      return
    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) return ctx.error(file, path, `expected an object {...}, got ${typeName(value)}`)
      checkFields(ctx, file, path, value, spec.fields)
      return
    default:
      throw new Error(`unknown schema type ${spec.type}`)
  }
}

function checkStrArray(ctx, file, path, value, spec) {
  if (!Array.isArray(value)) return ctx.error(file, path, `expected a list of text items [...], got ${typeName(value)}`, 'e.g. ["First", "Second"]')
  if (value.length < spec.minItems) {
    ctx.error(file, path, `has ${value.length} items, needs at least ${spec.minItems}`, 'add an item')
  }
  if (value.length > spec.maxItems) {
    ctx.error(file, path, `has ${value.length} items, the limit is ${spec.maxItems}`, `remove ${value.length - spec.maxItems} item(s); keep the strongest`)
  }
  const seen = new Map()
  value.forEach((item, i) => {
    const p = `${path}[${i}]`
    if (typeof item !== 'string') return ctx.error(file, p, `expected text, got ${typeName(item)} ${preview(item)}`, 'wrap the value in double quotes')
    checkValue(ctx, file, p, item, { type: 'string', max: spec.itemMax })
    if (spec.unique) {
      const key = item.trim().toLowerCase()
      if (seen.has(key)) ctx.error(file, p, `duplicate item ${q(item)} (also at [${seen.get(key)}])`, 'remove the duplicate')
      else seen.set(key, i)
    }
  })
}

function checkFields(ctx, file, path, obj, fields) {
  const allowed = Object.keys(fields)
  for (const key of Object.keys(obj)) {
    if (!(key in fields)) {
      const sug = suggestKey(key, allowed)
      ctx.error(file, join2(path, key), 'unknown field', sug ? `did you mean ${q(sug)}?` : `allowed fields: ${allowed.join(', ')}`)
    }
  }
  for (const [key, spec] of Object.entries(fields)) {
    const p = join2(path, key)
    if (!(key in obj) || obj[key] === undefined) {
      if (spec.required) ctx.error(file, p, 'missing required field', spec.nullable ? `add "${key}": null or a value` : `add "${key}"`)
      continue
    }
    checkValue(ctx, file, p, obj[key], spec)
  }
}

function dateRangeKey(value, isEnd) {
  const d = parseDate(value)
  if (!d) return null
  return d.year * 100 + (d.month ?? (isEnd ? 12 : 1))
}

function checkDateOrder(ctx, file, path, item) {
  const { start, end } = item
  if (start == null || end == null || start === DATE_PLACEHOLDER || end === DATE_PLACEHOLDER) return
  const a = dateRangeKey(start, false)
  const b = dateRangeKey(end, true)
  if (a !== null && b !== null && b < a) ctx.error(file, join2(path, 'end'), `${q(end)} is before start ${q(start)}`)
}

function checkList(ctx, key, data, extra) {
  const file = FILES[key]
  if (!Array.isArray(data)) {
    ctx.error(file, '', `expected a list [...] at the top level, got ${typeName(data)}`, 'the file must start with [ and end with ]')
    return
  }
  const ids = new Map()
  data.forEach((item, i) => {
    const path = itemPath(i, item)
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      ctx.error(file, `[${i}]`, `expected an object {...}, got ${typeName(item)}`)
      return
    }
    checkFields(ctx, file, path, item, SCHEMAS[key])
    if (typeof item.id === 'string') {
      if (ids.has(item.id)) ctx.error(file, `[${i}].id`, `duplicate id ${q(item.id)} (also at [${ids.get(item.id)}])`, 'ids must be unique within the file; rename one')
      else ids.set(item.id, i)
    }
    if (extra) extra(item, path, i)
  })
}

function checkObject(ctx, key, data) {
  const file = FILES[key]
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    ctx.error(file, '', `expected an object {...} at the top level, got ${typeName(data)}`, 'the file must start with { and end with }')
    return false
  }
  checkFields(ctx, file, '', data, SCHEMAS[key])
  return true
}

/** site.json: like checkObject, but the v1 "sections" key gets a migration message. */
function checkSiteObject(ctx, site) {
  const file = FILES.site
  if (!site || typeof site !== 'object' || Array.isArray(site)) return checkObject(ctx, 'site', site)
  if (!('sections' in site)) return checkObject(ctx, 'site', site)
  ctx.error(file, 'sections', '"sections" moved into "pages[].sections" in v2', 'see docs/CONTENT-GUIDE.md "Pages and navigation"')
  const { sections: _ignored, ...rest } = site
  checkFields(ctx, file, '', rest, SCHEMAS.site)
  return true
}

/**
 * Page rules (spec v2 10.2): unique ids, reserved ids, no clash with public/ entries, each
 * section on at most one page, unplaced sections warned, composed titles <= 70 characters.
 */
function checkPages(ctx, pages, profile) {
  const file = FILES.site
  const pageIds = new Map()
  const guideAt = new Map()
  const placedAt = new Map() // section id -> { path, pageId }
  const publicNames = ctx.publicDir ? new Set(ctx.listDir(ctx.publicDir)) : new Set()
  const name = profile && typeof profile.name === 'string' ? profile.name : null
  pages.forEach((page, i) => {
    if (!page || typeof page !== 'object' || Array.isArray(page)) return
    const path = `pages${itemPath(i, page)}`
    if (typeof page.id === 'string' && ID_RE.test(page.id)) {
      const idPath = `${path}.id`
      if (pageIds.has(page.id)) ctx.error(file, idPath, `duplicate page id ${q(page.id)} (also at pages[${pageIds.get(page.id)}])`, 'page ids must be unique; rename one')
      else pageIds.set(page.id, i)
      if (RESERVED_PAGE_IDS.includes(page.id)) {
        ctx.error(file, idPath, `page id ${q(page.id)} is reserved`, `choose another id; ${RESERVED_PAGE_IDS.map(q).join(', ')} are used by the build`)
      } else if (publicNames.has(page.id)) {
        ctx.error(file, idPath, `page id ${q(page.id)} clashes with public/${page.id}`, 'choose another id, or rename that file or folder in public/')
      }
    }
    if (typeof page.guide === 'string' && GUIDE_IDS.includes(page.guide)) {
      if (guideAt.has(page.guide)) ctx.error(file, `${path}.guide`, `duplicate guide ${q(page.guide)} (also at pages[${guideAt.get(page.guide)}])`, 'each guide can lead only one page')
      else guideAt.set(page.guide, i)
    }
    if (name && typeof page.label === 'string' && page.label.trim()) {
      const title = `${page.label} | ${name}`
      if (title.length > 70) ctx.warn(file, `${path}.label`, `page title ${q(title)} is ${title.length} characters, over 70`, 'use a shorter label so search results do not cut the title off')
    }
    if (!Array.isArray(page.sections)) return
    page.sections.forEach((sec, j) => {
      if (!sec || typeof sec !== 'object' || typeof sec.id !== 'string' || !SECTION_IDS.includes(sec.id)) return
      const secPath = `${path}.sections${itemPath(j, sec)}.id`
      const prev = placedAt.get(sec.id)
      if (prev) {
        ctx.error(file, secPath, `section ${q(sec.id)} is listed twice: here and at ${prev.path}${prev.pageId ? ` (page ${q(prev.pageId)})` : ''}`, 'a section can appear on only one page; remove one of them')
      } else {
        placedAt.set(sec.id, { path: secPath, pageId: typeof page.id === 'string' ? page.id : null })
      }
    })
  })
  for (const id of SECTION_IDS) {
    if (!placedAt.has(id)) ctx.warn(file, 'pages', `section ${q(id)} is not on any page, so it will not be shown`, `add { "id": ${q(id)}, "label": "..." } to a page's "sections" if you want it shown`)
  }
}

/**
 * Validate all content.
 * @param {{ site?: any, profile?: any, links?: any, experience?: any, education?: any,
 *   projects?: any, skills?: any, github?: any }} raw  parsed JSON per file; a missing key
 *   is skipped (the loader reports missing/unparseable files itself). `github` is optional.
 * @param {{ strict?: boolean, publicDir?: string, fileExists?: (p: string) => boolean,
 *   fileSize?: (p: string) => number|null, listDir?: (p: string) => string[] }} [options]
 * @returns {{ errors: Issue[], warnings: Issue[] }}
 */
export function validateContent(raw, options = {}) {
  const ctx = new Ctx(options)
  const has = (k) => raw && Object.prototype.hasOwnProperty.call(raw, k) && raw[k] !== undefined

  if (has('site') && checkSiteObject(ctx, raw.site)) {
    const site = raw.site
    if (site.ogImage && !site.ogImageAlt) ctx.error(FILES.site, 'ogImageAlt', 'required when ogImage is set', 'describe the image, e.g. "Andrew Leick, portfolio"')
    if (Array.isArray(site.pages)) checkPages(ctx, site.pages, has('profile') ? raw.profile : null)
    if (ctx.publicDir && typeof site.siteUrl === 'string') {
      const cnamePath = join(ctx.publicDir, 'CNAME')
      if (ctx.fileExists(cnamePath)) {
        let host = null
        try {
          host = new URL(site.siteUrl).hostname
        } catch {
          /* reported above */
        }
        if (host && /\.github\.io$/i.test(host)) {
          ctx.error(FILES.site, 'siteUrl', `public/CNAME exists but siteUrl is ${q(site.siteUrl)}`, 'set siteUrl to your custom domain (e.g. "https://example.com/") or delete public/CNAME; the CNAME file is generated from siteUrl automatically')
        }
      }
    }
  }

  if (has('profile')) checkObject(ctx, 'profile', raw.profile)

  if (has('links')) {
    checkList(ctx, 'links', raw.links, (item, path) => {
      const file = FILES.links
      const p = join2(path, 'url')
      const url = item.url
      if (typeof url !== 'string' || isPlaceholder(url)) {
        if (typeof url !== 'string' && url !== undefined) ctx.error(file, p, `expected a URL, got ${typeName(url)}`, 'e.g. "https://github.com/your-name"')
        return
      }
      if (item.kind === 'email') {
        if (!/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url)) ctx.error(file, p, `expected a mailto: link, got ${q(url)}`, `use ${q(`mailto:${url.replace(/^mailto:/, '')}`)}`)
      } else if (!/^https:\/\/[^\s/$.?#][^\s]*$/i.test(url)) {
        ctx.error(file, p, `expected an https:// URL, got ${q(url)}`, `use the full URL, e.g. ${q(`https://${url.replace(/^[a-z]+:\/\//i, '')}`)}`)
      }
    })
  }

  if (has('experience')) checkList(ctx, 'experience', raw.experience, (item, path) => checkDateOrder(ctx, FILES.experience, path, item))
  if (has('education')) checkList(ctx, 'education', raw.education, (item, path) => checkDateOrder(ctx, FILES.education, path, item))

  if (has('projects')) {
    checkList(ctx, 'projects', raw.projects, (item, path) => checkDateOrder(ctx, FILES.projects, path, item))
    if (Array.isArray(raw.projects)) {
      const featured = raw.projects.filter((p) => p && p.featured === true && p.visible !== false).length
      if (featured > 4) ctx.warn(FILES.projects, '', `${featured} projects are featured`, 'feature 2 to 4 projects so the best work stands out')
      const repos = has('github') && raw.github && raw.github.repos && typeof raw.github.repos === 'object' ? raw.github.repos : {}
      raw.projects.forEach((p, i) => {
        if (p && typeof p.githubRepo === 'string' && REPO_RE.test(p.githubRepo) && !repos[p.githubRepo]) {
          ctx.warn(FILES.projects, `${itemPath(i, p)}.githubRepo`, `no GitHub stats for ${q(p.githubRepo)}`, 'run "npm run sync:github" to fetch them (optional)')
        }
      })
    }
  }

  if (has('skills')) checkList(ctx, 'skills', raw.skills)

  if (has('github') && raw.github !== null) {
    const file = FILES.github
    const g = raw.github
    if (!g || typeof g !== 'object' || Array.isArray(g)) {
      ctx.error(file, '', `expected an object, got ${typeName(g)}`, 'regenerate it with "npm run sync:github" (never edit by hand)')
    } else {
      // repos is a map keyed by "owner/name", so it is checked separately below.
      const { repos, ...rest } = g
      checkFields(ctx, file, '', { ...rest, ...(repos === undefined ? {} : { repos: {} }) }, {
        generatedAt: req({ type: 'string', max: 40 }),
        repos: req({ type: 'object', fields: {} }),
      })
      if (repos !== undefined && (repos === null || typeof repos !== 'object' || Array.isArray(repos))) {
        ctx.error(file, 'repos', `expected an object, got ${typeName(repos)}`, 'regenerate it with "npm run sync:github"')
      } else if (repos) {
        for (const [name, repo] of Object.entries(g.repos)) {
          const p = `repos[${q(name)}]`
          if (!REPO_RE.test(name)) ctx.error(file, p, 'key must be "owner/name"', 'regenerate with "npm run sync:github"')
          checkValue(ctx, file, p, repo, { type: 'object', fields: GITHUB_REPO_FIELDS })
        }
      }
    }
  }

  return { errors: ctx.errors, warnings: ctx.warnings }
}
