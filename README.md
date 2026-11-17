# Andrew Leick: personal site

A portfolio built with Vite and React and hosted on GitHub Pages: a Home page plus Experience, Education and About pages (the page list is data in `src/data/site.json`). The Experience page holds a Pokédex of both work experience and projects, and `/projects/` opens it on the Projects view. All content lives in JSON files under `src/data/`. To add or edit an experience, project or skill, you edit one file. See **[docs/CONTENT-GUIDE.md](docs/CONTENT-GUIDE.md)**.

The build spec is [docs/spec/SPEC.md](docs/spec/SPEC.md) (v1) as amended by [docs/spec/SPEC-v2.md](docs/spec/SPEC-v2.md) (home + subpages), and the authoritative content facts are in [docs/spec/CONTENT-FACTS.md](docs/spec/CONTENT-FACTS.md).

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
| `npm run build` | `validate`, then a production build into `dist/`: `index.html`, one `{page}/index.html` per page (plus one per page alias, such as `projects/index.html`), `404.html`, `robots.txt`, `sitemap.xml`, and `CNAME` for a custom domain |
| `npm run preview` | Serve `dist/` locally on port 4173 (`/experience/` etc. work; unknown paths fall back to `index.html`, and the app shows Not found) |
| `npm run lint` | oxlint (must report 0 errors and 0 warnings) |
| `npm run test` | Vitest unit tests for the content API, formatters, validator and Vite plugin |
| `npm run validate` | Validate `src/data/*.json`; placeholders are warnings |
| `npm run validate:strict` | Same, but `TODO:` placeholders are errors (the deploy runs this) |
| `npm run check:links` | Request every URL in the data, and check every page and section link resolves to a route |
| `npm run check:size` | Size budget for `dist/` (JS ≤ 95 KB gzip, CSS ≤ 15 KB gzip, fonts ≤ 32 KB raw, initial transfer incl. fonts ≤ 150 KB) |
| `npm run check:routes` | After a build: every page has `dist/{id}/index.html` with the right `<title>` and canonical, `404.html` is `noindex`, each alias has its page's HTML and is not in the sitemap, the sitemap lists Home and every page, and no file differs from `index.html` outside the head. Uses `BASE_PATH` like the build. |
| `npm run sync:github` | Refresh `src/data/generated/github.json` (stars, language) for projects with `githubRepo` |
| `npm run ci` | lint + test + validate + build + check:size + check:routes |

## How it fits together

- `src/data/*.json`: the content.
- `src/lib/content/`: the content API (`index.js`: `getSiteContent()`, `getPages()`, `resolveRoute()`, `getHead()` and the other getters), plus normalization, routes (`routes.js`), per-page head values (`head.js`), date formatting, and the validator (`validate.js`). Components import content only from `src/lib/content/index.js`.
- Routing: clean URLs with the History API. The build writes a real HTML file per page (`dist/experience/index.html`, ...) with that page's title, description and canonical, so every URL returns 200 on GitHub Pages; `dist/404.html` (noindex) covers unknown paths. In the browser a small router (frontend, `src/router/`) takes over.
- `scripts/vite-plugin-content.js`: injects the per-page `<title>`, meta, Open Graph and (Home only) JSON-LD tags and the `<noscript>` fallback into `index.html`, following the request URL in dev. It validates content during build and dev, writes the per-page HTML files and `404.html`, and emits `robots.txt`, `sitemap.xml` and `CNAME`.
- `scripts/*.mjs`: validate, check-links, check-size, check-routes, sync-github.
- `.github/workflows/ci.yml`: runs `npm run ci` on pull requests and non-main branches.
- `.github/workflows/deploy.yml`: runs on pushes to `main`. It does `validate:strict` and `ci`, then deploys to GitHub Pages.

## Fonts and licenses

`public/fonts/` holds Press Start 2P and VT323, both under the SIL Open Font License 1.1. The license texts (`OFL-*.txt`) sit next to the fonts. The font files must not be modified: `check:routes` verifies their SHA-256 hashes.

## Sprites

`public/sprites/` holds the guide Pokémon and the Pokédex Pokémon (96×96 pixel art; see `DEX_POKEMON` in `src/lib/content/normalize.js`) and the Poké Ball (`poke-ball.png`, the 90×90 Dream World item art), both from the PokeAPI sprites repository. They are Nintendo / Creatures / GAME FREAK artwork used as fan art; the footer carries the trademark notice and `site.fanArt: false` hides them all. Show the Pokémon pixelated (`image-rendering: pixelated`), at whole-number scales where possible (the section headers use 1.25×); the Poké Ball is smooth art and scales freely.

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

The build warns if the two don't agree. Page URLs follow automatically (`/personal-website/experience/`).

**Custom domain:** change `siteUrl` in `src/data/site.json` to the domain. That's the only file change; `dist/CNAME` is generated from it. Then follow the DNS and HTTPS steps in [docs/CONTENT-GUIDE.md](docs/CONTENT-GUIDE.md#custom-domain-pending-no-domain-chosen-yet).
