# Content Guide

Everything on the site comes from the JSON files in `src/data/`. To change the site, you edit one of those files. You never need to touch a component.

| File | What it holds |
| :- | :- |
| `src/data/profile.json` | Name, headline, summary, About paragraphs, email, resume, photo |
| `src/data/experience.json` | Jobs, internships, research, extracurricular roles (a list) |
| `src/data/projects.json` | Projects (a list) |
| `src/data/education.json` | Degrees (a list) |
| `src/data/skills.json` | Skill groups (a list) |
| `src/data/links.json` | GitHub, LinkedIn, email and other profile links (a list) |
| `src/data/site.json` | Site URL, search description, theme, section order and labels |
| `src/data/generated/github.json` | Written by `npm run sync:github`. Do not edit by hand. |

## The everyday loop

```bash
npm install        # once
npm run dev        # open the printed URL; saving a data file reloads the page
npm run validate   # check content; prints problems with file, field and a hint
npm run build      # validate + production build into dist/
```

While `npm run dev` runs, a broken data file shows a red error overlay in the browser with the same messages as `npm run validate`. Fix the file and save. The overlay closes and the page reloads.

## Rules that apply everywhere

- **JSON syntax:** double quotes around keys and text, commas between items, and no comma after the last item in a list or object.
- **Text** is plain text. HTML and Markdown are rejected. There are length limits per field; the validator tells you when you go over.
- **Dates** are `"YYYY-MM"` (e.g. `"2025-06"`) or `"YYYY"`. In experience, `"end": null` means "Present".
- **URLs** are full `https://` addresses. Email links are `mailto:you@example.com`.
- **ids** are lowercase words joined by hyphens (`"my-new-project"`) and must be unique within their file. Pick one when you add an entry and don't change it afterwards.
- **Optional fields** can be left out or set to `null` (or `[]` for lists).
- **Hide without deleting:** add `"visible": false` to any list entry.
- **No locations:** Andrew decided not to show any location. Leave every `location` field out.
- **No phone number** anywhere on the site.

## Experience

### Add an experience
Open `src/data/experience.json`. Copy this object into the list. Put a comma after the entry before it, and fill it in:

```json
{
  "id": "acme-swe-intern-2027",
  "organization": "Acme Corp",
  "organizationUrl": "https://acme.example.com",
  "role": "Software Engineering Intern",
  "employmentType": "internship",
  "start": "2027-06",
  "end": "2027-09",
  "summary": null,
  "highlights": [
    "Built X with Y, which cut Z from 10 minutes to 2."
  ],
  "technologies": ["Python", "AWS Lambda"],
  "visible": true
}
```

- `employmentType` is one of `full-time`, `part-time`, `internship`, `research`, `teaching`, `contract`, `volunteer`, or `null`. The site shows it as "Internship", "Full-time", and so on.
- At most 6 `highlights`, each up to 240 characters. At most 12 `technologies`, each up to 30 characters, with no duplicates.
- For a role you still hold, use `"end": null`. The date then reads "Jun 2027 – Present".

### Edit, hide, reorder
- **Edit:** change the text in place.
- **Hide:** set `"visible": false`.
- **Order:** sorting is automatic and newest first. Current roles (`end: null`) come first, then by end date, then by start date. The order of entries in the file doesn't matter.

## Projects

### Add a project
Append to `src/data/projects.json`:

```json
{
  "id": "line-follower-robot",
  "title": "Line-Following Robot",
  "summary": "One or two sentences on what it is and what it does.",
  "role": "What I personally built",
  "teamSize": 1,
  "context": "Personal project",
  "start": "2026-01",
  "end": "2026-03",
  "status": "complete",
  "featured": false,
  "order": 100,
  "highlights": [
    "A concrete thing I built and its result."
  ],
  "technologies": ["C++", "Arduino"],
  "links": {
    "repo": "https://github.com/Andrew-Leick/line-follower",
    "demo": "https://example.com/demo",
    "writeup": "https://example.com/post"
  },
  "githubRepo": "Andrew-Leick/line-follower",
  "image": null,
  "visible": true
}
```

- `status`: `complete`, `in-progress` (shows an "In progress" badge) or `archived` (shows "Archived").
- `teamSize`: `1` shows "Solo project". `3` shows "Team project · 3 contributors", or just "3 contributors" when `context` is set.
- `links`: include only the links you have. The title links to the demo if there is one, otherwise to the repo, otherwise to the write-up.
- `githubRepo` (optional, `"owner/name"`) lets `npm run sync:github` fetch the star count and language.
- `image` (optional): `{ "src": "content/images/line-follower.webp", "alt": "Robot following a black line" }`. See [Images](#images).

### Feature, reorder, hide
- **Feature:** `"featured": true`. Featured projects show first with a "Featured" label. Keep it to 2 to 4; you get a warning above 4.
- **Reorder:** lower `order` shows first within the featured and non-featured groups. To move a project to the very top, use `"featured": true, "order": 0`. Ties are broken by end date (ongoing first), then by title.
- **Hide:** `"visible": false`.

## Education

`src/data/education.json` is a list. Entry fields: `institution`, `institutionUrl`, `degree` (e.g. `"B.S."`), `field`, `minor`, `start` (optional), `end` (graduation date), `expected` (`true` shows "Expected Jun 2028"), `gpa` (e.g. `"3.83/4.0"`, or `null` to hide it), `honors` (up to 6), `coursework` (up to 12).

## Skills

### Add a skill group
Append to `src/data/skills.json`:

```json
{ "id": "robotics", "name": "Robotics", "items": ["ROS", "Fusion360"] }
```

A group has 1 to 20 items, each up to 30 characters, with no duplicates. Groups show in file order.

## Profile text

Edit `src/data/profile.json`:

| Field | Limit | Notes |
| :- | :- | :- |
| `name` | 60 | |
| `headline` | 80 | Shown under the name and used in the page title |
| `summary` | 280 | One short paragraph in the hero |
| `about` | 1 to 4 paragraphs, 700 each | The About section |
| `currently` | 160 | Optional "Currently" line in About |
| `availability` | 80 | Optional, e.g. "Open to software internships for summer 2027" |
| `email` | | Plain address, no `mailto:` |
| `contactBlurb` | 200 | One line above the email in Contact |
| `resumeUrl` | | Path to the PDF, see below |
| `photo` | | `null` or `{ "src": "...", "alt": "..." }` |

The search-engine description is `description` in `src/data/site.json`, 50 to 160 characters.

## Links

`src/data/links.json`: each link has `id`, `kind` (`github`, `linkedin`, `email`, `website`, `scholar`, `other`; this picks the icon), `label` (the visible text, up to 30), `url`, and `showInHero` (`false` keeps it out of the top-of-page buttons; it still shows in Contact and the footer).

## Resume PDF and photo

Files live under `public/content/`. Data paths are written **relative to `public/`, with no leading slash**.

### Replace the resume
1. Save the new PDF over `public/content/resume/andrew-leick-resume.pdf`, keeping the same name.
2. Nothing else changes, because `profile.json` already has `"resumeUrl": "content/resume/andrew-leick-resume.pdf"`.
3. Run `npm run validate`.

If you use a different file name, update `resumeUrl` to match. To hide the Resume button, set `"resumeUrl": null`.

**Privacy:** anything in the PDF is public once deployed. Use a version without your phone number or city if you don't want those online.

### Add or replace the headshot
1. Make it square, at least 320x320, and save it as WebP at **60 KB or less**, e.g. `public/content/images/headshot.webp`.
2. In `profile.json`: `"photo": { "src": "content/images/headshot.webp", "alt": "Andrew Leick" }`.

### Images
Project screenshots: 1200x675 (16:9), WebP or AVIF, **150 KB or less**, under `public/content/images/`. To convert on a Mac you can use `cwebp -q 80 in.png -o out.webp` (from `brew install webp`), or any image editor that exports WebP.

## `TODO:` placeholders

Any text starting with `TODO:`, a date written as `"TODO"`, a URL containing `TODO`, or an id starting with `todo-` is a placeholder for information we don't have yet. Placeholders:

- show on the page as-is in development;
- print as warnings (`⚠`) in `npm run validate`;
- are **errors** in `npm run validate:strict`, which the deploy workflow runs. **The site will not deploy while any placeholder remains.**

Current placeholders: run `npm run validate:strict` to list them.

## Reading validator messages

Each problem is one line:

```
✖ src/data/projects.json → [2] (id "chess-engine").links.repo: expected an https:// URL, got "github.com/foo/bar". Hint: use the full URL, e.g. "https://github.com/foo/bar".
```

- `✖` is an error and blocks the build. `⚠` is a warning.
- `src/data/projects.json` is the file to open.
- `[2] (id "chess-engine").links.repo` is where in the file: the third entry (counting from 0), the one with id `chess-engine`, then the `links` object, then its `repo` field.
- After the colon comes what's wrong, then a `Hint:` for how to fix it.

Common ones:

| Message | Fix |
| :- | :- |
| `unknown field. Hint: did you mean "technologies"?` | A typo in a field name |
| `invalid JSON at line 14, column 5 ... Hint: check for a trailing comma` | Remove the comma after the last item |
| `"2024-02" is before start "2024-09"` | Swap or fix the dates |
| `duplicate id "x" (also at [1])` | Give one of the entries a new id |
| `file not found: public/...` | Add the file or fix the path (relative to `public/`, no leading `/`) |
| `is 95 characters, the limit is 80` | Shorten the text |

The last line is a summary, e.g. `Content OK: 4 experience, 1 education, 1 project, 3 skill groups, 3 links (2 warnings)`.

## GitHub stats

```bash
npm run sync:github
```

This fetches stars, language and last-push date for each project with a `githubRepo`, then writes `src/data/generated/github.json`. Commit that file. It works without a token for public repos; set `GITHUB_TOKEN` if you get rate-limited. If the network fails, the existing file is kept. Repos on the `EXCLUDE` list at the top of `scripts/sync-github.mjs` (currently `CS131_release`) are never synced.

## Other checks

```bash
npm run check:links   # requests every URL in the data; LinkedIn's 999 counts as a warning
npm run test          # unit tests for the content code
npm run ci            # everything CI runs: lint, test, validate, build, size budget
```

## Custom domain (pending: no domain chosen yet)

The site is configured for `https://andrew-leick.github.io/`. To move it to a domain you own:

1. **Buy the domain** from any registrar (for example Cloudflare, Namecheap or Porkbun).
2. **Point DNS at GitHub Pages** in the registrar's DNS settings:
   - Apex domain (`example.com`): four `A` records to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`. Optionally add `AAAA` records to `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`.
   - `www` subdomain: a `CNAME` record from `www` to `andrew-leick.github.io`.
   - Use both if you want `example.com` and `www.example.com` to work. GitHub redirects between them.
   - Recommended: verify the domain first under GitHub **Settings → Pages → Verified domains** (your account settings), so nobody else can claim it.
3. **Make the one-line change** in `src/data/site.json`: `"siteUrl": "https://example.com/"`. The build then writes `dist/CNAME` with that hostname automatically, and the canonical URL, Open Graph tags, sitemap and robots.txt all follow. You don't need to create `public/CNAME`; if one exists, the validator checks that it matches `siteUrl`.
4. Commit and push to `main`. The deploy workflow publishes the site.
5. **In the repo:** Settings → Pages → Custom domain. Enter the domain and save. GitHub runs a DNS check, which can take up to 24 hours after DNS changes.
6. **HTTPS:** once the DNS check passes, tick **Enforce HTTPS** on the same page. The certificate can take a little while to be issued.

Keep `BASE_PATH` as `/` in `.github/workflows/deploy.yml` for a custom domain.
