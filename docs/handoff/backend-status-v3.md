# Backend status, v3 (Pokémon theme)

Owner: backend. Date: 2026-11-10. Spec: `docs/spec/SPEC-v3.md` (sections 8, 10, 11.1). Nothing was committed or pushed.

## Verification (Node 24, with frontend's v3 files in the tree)

| Command | Result |
| :- | :- |
| `npm run ci` | exit 0 (lint, test, validate, build, check:size, check:routes) |
| `npm test` | 7 files, 188 tests pass (v2: 143) |
| `npm run validate` | `Content OK: 4 experience, 1 education, 1 project, 3 skill groups, 3 links (2 warnings)`; the 2 known TODO placeholders |
| `npm run check:size` | JS 81.59 KB gzip, CSS 5.52 KB gzip, fonts 27.45 KB raw (28,108 bytes), initial transfer 116.16 KB |
| `npm run check:routes` | `Routes OK: home + 3 pages + 404.html, sitemap matches, 5 font files OK (base "/")` |
| Project base: `BASE_PATH=/personal-website/ vite build --outDir <scratch>` + `check-routes <scratch>` | Routes OK, 5 font files OK |
| CONTENT-GUIDE examples | Swapping guides (experience squirtle, about charmander) plus `"fanArt": false` validates; `site.json` restored byte-exact |

## Task map

| Task | Files | REQ |
| :- | :- | :- |
| B3-1 | `src/data/site.json` (`fanArt: true`; guides charmander/bulbasaur/squirtle), `normalize.js` (`GUIDE_IDS`, `fanArt` default true, `guide` default null, unknown guide dropped to null), `types.js`, `index.js` (re-exports `GUIDE_IDS`), `validate.js` (`fanArt` boolean with spec hint; `guide` nullable enum with "did you mean"; duplicate-guide error) | 1050, 1052 |
| B3-2 | `validate.test.js` (cases a to f), `normalize.test.js`, `api.test.js` (real data, exports, no guide names in `getHead` output) | 1050, 1052 |
| B3-3 | `scripts/check-size.mjs` (font budget 32 KB raw, counted in the 150 KB total, exits 1 if `dist/fonts` is missing), `scripts/lib/routes-check.mjs` (`checkFonts`, `FONT_FILES`), `scripts/check-routes.mjs`, `scripts/__tests__/routes-check.test.js` (temp dir: ok, missing, bad hash, wrong reference count, literal `%BASE_URL%`) | 1060, 1061 |
| B3-4 | `docs/CONTENT-GUIDE.md` (new "Sprite guides and the fan-art switch"; blurb/teaser notes updated), `README.md` (check:size and check:routes rows, "Fonts and licenses") | 8.6 |

## Deviations and interpretations

1. `normalize` drops an unknown `guide` value to `null` rather than keeping it (the validator rejects it anyway).
2. Page id `fonts`: v2's `public/` clash rule already rejects it once `public/fonts/` exists, so no new reserved id was added. Test (f) uses a `listDir` stub.
3. `GUIDE_IDS` is an array export, so the `api.test.js` export check now allows one non-function export.
4. `check-size` prints one `font` row per file (raw size in both columns) plus the "Fonts (raw woff2)" budget line.
5. `README.md` and `CONTENT-GUIDE.md` say Home no longer shows `blurb`/`teaser` (spec 8.1); the fields remain validated.

## Requests for other owners

- None open. Frontend was told when B3-1 landed.

## Still open (Andrew; untouched)

Resume PDF exposes phone and cities; the two `TODO:` placeholders (`validate:strict` still blocks deploy); public email confirmation; custom domain.
