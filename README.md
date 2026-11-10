# Andrew Leick: personal site

A single-page portfolio built with Vite and React and hosted on GitHub Pages. All content lives in JSON files under `src/data/`. To add or edit an experience, project or skill, you edit one file. See **[docs/CONTENT-GUIDE.md](docs/CONTENT-GUIDE.md)**.

The build spec is in [docs/spec/SPEC.md](docs/spec/SPEC.md), and the authoritative content facts are in [docs/spec/CONTENT-FACTS.md](docs/spec/CONTENT-FACTS.md).

## Setup

Requires Node 24 (see `.nvmrc`).

```bash
nvm use            # or install Node 24 another way
npm ci
npm run dev        # http://localhost:5173
```

## Scripts

| Script | What it does |
| :- | :- |
| `npm run dev` | Dev server. Data edits reload the page; invalid content shows an error overlay. |
| `npm run build` | `validate`, then a production build into `dist/` (including `robots.txt`, `sitemap.xml`, and `CNAME` for a custom domain) |
| `npm run preview` | Serve `dist/` locally on port 4173 |
| `npm run lint` | oxlint (must report 0 errors and 0 warnings) |
| `npm run test` | Vitest unit tests for the content API, formatters, validator and Vite plugin |
| `npm run validate` | Validate `src/data/*.json`; placeholders are warnings |
| `npm run validate:strict` | Same, but `TODO:` placeholders are errors (the deploy runs this) |
| `npm run check:links` | Request every URL in the data and check nav anchors |
| `npm run check:size` | Gzip size budget for `dist/` (JS ≤ 90 KB, CSS ≤ 15 KB, total ≤ 150 KB) |
| `npm run sync:github` | Refresh `src/data/generated/github.json` (stars, language) for projects with `githubRepo` |
| `npm run ci` | lint + test + validate + build + check:size |

## How it fits together

- `src/data/*.json`: the content.
- `src/lib/content/`: the content API (`index.js`: `getSiteContent()` and the other getters), plus normalization, date formatting, and the validator (`validate.js`). Components import content only from `src/lib/content/index.js`.
- `scripts/vite-plugin-content.js`: injects the `<title>`, meta, Open Graph and JSON-LD tags and the `<noscript>` fallback into `index.html`. It also validates content during build and dev, and emits `robots.txt`, `sitemap.xml` and `CNAME`.
- `scripts/*.mjs`: validate, check-links, check-size, sync-github.
- `.github/workflows/ci.yml`: runs `npm run ci` on pull requests and non-main branches.
- `.github/workflows/deploy.yml`: runs on pushes to `main`. It does `validate:strict` and `ci`, then deploys to GitHub Pages.

## Deploy (GitHub Pages)

One-time setup, done by Andrew (agents don't create repos or push):

1. Create a **public** GitHub repo named `Andrew-Leick.github.io`. That name serves the site at `https://andrew-leick.github.io/` with base path `/`.
2. Add it as the remote and push `main`:
   ```bash
   git remote add origin https://github.com/Andrew-Leick/Andrew-Leick.github.io.git
   git push -u origin main
   ```
3. In the repo, open **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
4. Each push to `main` now builds and deploys. Watch it under the **Actions** tab.

The deploy runs `npm run validate:strict`, so **it fails while any `TODO:` placeholder remains** in `src/data/`. Run `npm run validate:strict` locally to see what's left.

**Other repo name:** if you keep the repo name `personal-website`, the site lives at `https://andrew-leick.github.io/personal-website/`. In that case:
- set `BASE_PATH: /personal-website/` in `.github/workflows/deploy.yml`;
- set `"siteUrl": "https://andrew-leick.github.io/personal-website/"` in `src/data/site.json`.

The build warns if the two don't agree.

**Custom domain:** change `siteUrl` in `src/data/site.json` to the domain. That's the only file change; `dist/CNAME` is generated from it. Then follow the DNS and HTTPS steps in [docs/CONTENT-GUIDE.md](docs/CONTENT-GUIDE.md#custom-domain-pending-no-domain-chosen-yet).
