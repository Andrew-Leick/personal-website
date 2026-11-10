# Backend status

Owner: backend. Date: 2026-11-09. Nothing was committed or pushed, and no remote repo was created.

## Verification run (all on Node 24.22)

| Command | Result |
| :- | :- |
| `npm run lint` | exit 0, no warnings |
| `npm test` | 5 files, 98 tests pass |
| `npm run validate` | exit 0: `Content OK: 4 experience, 1 education, 1 project, 3 skill groups, 3 links (2 warnings)` |
| `npm run validate:strict` | exit 1, lists the 2 remaining placeholders (see "Still open") |
| `npm run build` | passes. `dist/` has `index.html` (head + noscript injected, no markers left), `robots.txt`, `sitemap.xml` |
| `npm run check:size` | JS 77.2 KB, CSS 4.0 KB, total 82.6 KB gzip; all within budget |
| `npm run check:links` | exit 0. GitHub, Stanford and the NFL repo return 200. LinkedIn returns 999 (warning). `siteUrl` returns 404 because the site is not deployed yet; the script reports that as a warning |
| `npm run sync:github` | wrote `src/data/generated/github.json` (NFL repo). With an excluded repo it skips it. With a 404 repo it exits 1 and leaves the file byte-identical |
| `npm run ci` | exit 0 |

Error paths exercised by hand (QA-105), each followed by a revert:
- (a) `technolgies`
- (b) `"repo": "github.com/x/y"`
- (c) end before start
- (d) duplicate id
- (e) trailing comma
- (f) missing resume file

Each case gives a 6.11-format line and `validate` exits 1. `npm run build` fails with `ContentError`. In `npm run dev`, watching the HMR websocket showed an `error` payload with the same text (the Vite overlay) while broken, then `full-reload` once fixed. The JSON module request returns Vite's error page, so stale data never renders silently.

Editing workflow: I appended the CONTENT-GUIDE's project, experience (with `end: null`) and skill-group examples, copied literally from the guide. `validate` passes. The new experience sorts first as "Jun 2027 – Present". The project's `primaryUrl` is the demo. Then I reverted.

Workflow YAML: `npx @action-validator/cli` was blocked by the sandbox (it downloads external code), so I parsed both files with Ruby's YAML loader and reviewed them by hand against 8.3.

## Task map

| Task | Files | Notes |
| :- | :- | :- |
| B1 Content API + data | `src/data/{site,profile,links,experience,education,projects,skills}.json`, `src/data/generated/github.json`, `src/lib/content/{index,normalize,format,paths,placeholders,types}.js` | Data is the real resume content from `docs/spec/CONTENT-FACTS.md`, not the spec's example placeholders |
| B2 Validator | `src/lib/content/validate.js` (pure; fs only for `publicDir` checks, injectable), `scripts/validate-content.mjs`, `scripts/lib/content-files.mjs` | Unknown keys get suggestions (Levenshtein ≤ 2). Enum values get suggestions too |
| B3 Tests | `src/lib/content/__tests__/{format,normalize,api,validate}.test.js`, `scripts/__tests__/vite-plugin-content.test.js` | Cover every formatter case, sort rule, contextLabel case, section filter, and each validator rule (including invalid JSON) |
| B4 Tooling | `package.json` (8.2 scripts, `engines`, `vitest@^5.1.0` devDependency), `package-lock.json`, `.nvmrc` (`24`), `.oxlintrc.json` (`ignorePatterns`), `vite.config.js` (`base` from `BASE_PATH`, vitest config) | Runtime deps are still only `react` and `react-dom` |
| B5 Vite plugin | `scripts/vite-plugin-content.js` | Head (title, description, canonical, OG, Twitter, JSON-LD), noscript, build-time validation, dev overlay + reload, `robots.txt`, `sitemap.xml`, `CNAME` |
| B6 Workflows | `.github/workflows/ci.yml`, `.github/workflows/deploy.yml` | Action versions from the current Vite guide: checkout@v7, setup-node@v7, configure-pages@v6, upload-pages-artifact@v5, deploy-pages@v5 |
| B7 Checks | `scripts/check-size.mjs`, `scripts/check-links.mjs` | |
| B8 GitHub sync | `scripts/sync-github.mjs` | `EXCLUDE = ['CS131_release']`. Atomic write. Never edits `projects.json` |
| B9 Docs | `docs/CONTENT-GUIDE.md`, `README.md` | Includes custom-domain steps (DNS, repo setting, HTTPS) |

## Requirement map

| REQ | Where |
| :- | :- |
| REQ-001, REQ-002 | `deriveSections()` in `normalize.js` (`getSections()`) |
| REQ-101, REQ-055 | Data-only edits. Verified with the guide examples above |
| REQ-110 to REQ-112 | `validate.js`, `validate-content.mjs`, `content-files.mjs` (`formatReport`) |
| REQ-113 | `build` script runs `validate`. `buildStart` fails the build. `deploy.yml` runs `validate:strict` |
| REQ-114 | Plugin `transform` (throws for data modules while content is invalid) and `handleHotUpdate` (sends the overlay error, then a full reload when fixed) |
| REQ-402 | `check-size.mjs` |
| REQ-405 | `package.json` |
| REQ-500 to REQ-505 | `vite-plugin-content.js` (`renderHead`, `renderNoscript`, `renderRobots`, `renderSitemap`). All text HTML-escaped. JSON-LD omits placeholders and contains no address |
| REQ-600 to REQ-602 | `package.json` scripts, `ci.yml`, `deploy.yml` |
| REQ-700 to REQ-703 | Only backend-owned paths edited. API in `index.js` exports exactly the 7.2 list |

## Deviations from the spec

1. **Data is real, not the 6.3 to 6.9 examples.** CONTENT-FACTS.md supersedes sections 11 to 13. Specifics:
   - no `location` fields;
   - GPA 3.83/4.0;
   - no phone;
   - no CS131;
   - email `aleick@stanford.edu`;
   - LinkedIn `https://www.linkedin.com/in/andrew-leick/`.
2. **`education[].start` is optional (nullable).** The resume gives only the expected graduation date. A null start renders `dateLabel` "Expected Jun 2028". `types.js` notes the change.
3. **Placeholders skip format and length checks.** A `TODO:` value is reported once as a placeholder (a warning, or an error in strict mode) and is not also checked for length or URL format. This mattered for the spec's own examples (e.g. a 55-character placeholder in a 30-character tag field).
4. **`isPlaceholder` also returns true for the bare date placeholder `"TODO"`**, consistent with 6.2.
5. **Experience bullet split.** The resume's second Amazon 2026 bullet is about 260 characters, over the 240 limit. I split it into two bullets without changing any wording or facts, so that entry has 6 highlights.
6. **CNAME is generated from `site.siteUrl`.** A non-`*.github.io` host produces `dist/CNAME`, so the custom domain is a one-line change. The spec's `public/CNAME` route still works; if that file exists, the validator errors when it disagrees with `siteUrl`. The build warns when the `siteUrl` path does not match `BASE_PATH`.
7. **Image size limits are errors, not warnings.** Over 60 KB for the headshot or 150 KB for a project image is an error. The spec calls them requirements.
8. **`github.json` `updatedAt`** uses the repo's `pushed_at` (last code push) and falls back to `updated_at`.
9. **`contextLabel` has no stars or language.** It follows 7.4 exactly. REQ-051's "★ {stars}" and language come from `githubStats`, which the frontend adds.
10. **Extra Open Graph tags:** `og:locale`, `og:site_name` and `twitter:image:alt` are added.

## Content decisions to confirm (written by me from the facts; please review)

- `profile.headline`: "Electrical Engineering student at Stanford University". This is a neutral factual line; the facts file marks the headline wording as a draft.
- `profile.summary` ("Seeking software development roles. Two summers as a Software Development Engineer Intern at Amazon, building systems on AWS."; QA D-02 removed the repeat of the headline and the word "serverless"), `profile.about` (3 paragraphs) and `site.description`: these only restate facts in CONTENT-FACTS.md (degree, graduation date, both Amazon internships and what they built, GTRI, FIRST Robotics). Nothing is added.
- `profile.contactBlurb`: "The best way to reach me is by email."
- NFL project:
  - `teamSize: 3`, `context: null`, because the course context is unconfirmed;
  - `status: "in-progress"`, kept from the spec. Andrew should confirm complete vs in progress;
  - `technologies: ["Python"]`, the only one the README confirms;
  - the three components he built are stated once, in `role`. The summary describes only the project, and the only highlight is the TODO results placeholder (QA D-01).
- FIRST Robotics is an experience entry with `employmentType: null`.
- Coursework "Operating Systems Principles (Fall 26)" is written as "(Fall 2026)".

## Still open (Andrew)

- **Resume PDF exposes the phone number and city locations.** `public/content/resume/andrew-leick-resume.pdf` is an exact copy of `docs/AndrewLeick_Resume.pdf`. It contains the phone number and Palo Alto / Seattle / Atlanta, which conflicts with the "no phone" and "no locations" decisions. Before launch, either supply a redacted PDF (same path, no data change needed) or set `profile.resumeUrl` to `null`. The validator cannot detect this.
- **Email to show publicly:** `aleick@stanford.edu` comes from the resume and needs confirmation. The spec's earlier fact was `andrew.leick23@gmail.com`. To change it, edit `profile.email` and the `email` entry in `links.json`.
- **Headline wording, target roles, availability:** `profile.availability` is a `TODO:` placeholder and blocks deploy.
- **NFL project results/metrics and exact course context:** `projects[0].highlights[3]` is a `TODO:` placeholder and blocks deploy.
- **Custom domain name:** pending. Steps are in CONTENT-GUIDE "Custom domain". `siteUrl` stays `https://andrew-leick.github.io/` until then.
- **Headshot:** optional, not provided (`photo: null`).
- **Analytics:** none, per spec (REQ-403).
- **Hosting repo (Q1):** creating `Andrew-Leick.github.io`, pushing, and enabling Pages are Andrew's steps (README "Deploy").

## Requests for other owner (frontend)

None blocking. For reference:
- `education[].start` can be `null`.
- `githubStats` is populated for the NFL project (★ 0, "Jupyter Notebook"). Showing the star count and language in the context line is the frontend's call per REQ-051.
