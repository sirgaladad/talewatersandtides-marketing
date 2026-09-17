# Changelog

All notable changes to the Tale Waters & Tides marketing site will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- `unbound/index.html` — UNBOUND Buzzword Bingo at `/unbound/`, an unofficial attendee edition for the team at HubSpot's UNBOUND 2026 (Boston, Sept 16-18). Mobile-first, no dependencies. Tap-to-mark card in the poster's navy/orange/cream palette, per-device persistence via `localStorage`, seeded shuffle so teammates get different cards, poster-card mode matching the printed version, five-in-a-row detection with a win overlay and confetti, Web Share / clipboard sharing, GA events (`bingo_mark`, `bingo_win`, `bingo_shuffle`, `bingo_share`), reduced-motion support, and a print stylesheet.
- `.github/workflows/html-lint.yml` and `.htmlhintrc` — HTMLHint runs on every pull request and push to `main` that touches an `.html` file.
- `projects/index.html` — new portfolio landing page at `/projects/`, digital-agency style. Launches with five cards: Pocket Fishing Guide (LIVE), Quest (PLAYGROUND), and three "IN PROGRESS" placeholders (Guide Marketplace MVP, PFG White-Label Demo, Outdoor AI Field Notes).
- `projects/quest/index.html` — Quest page relocated under the new portfolio path; top back-seal now returns to `/projects/` for portfolio-aware navigation.
- `SECURITY.md` — private vulnerability reporting policy
- `assets/` directory — images moved out of root (`AbbySims.jpeg`, `CoreyBoelkens.jpeg`, `IMG_0393.png`, `TWT_Background.png`, `TalewatersandTides_Logo_White_Horizontal.png`)
- `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1

### Changed
- `events/index.html` — added an UNBOUND Buzzword Bingo card (LIVE NOW) linking to `/unbound/`.
- `index.html` — replaced **Exploring** nav and mobile-menu items with **Projects** → `/projects/`. Updated the third `#exploring` tile from "Lab Experiments → /quest/" to "Lab Projects → /projects/" (broader portfolio framing). Footer link **Exploring** → **Projects**; footer **Quest** link now points to `/projects/quest/`.
- `quest/index.html` — replaced with a redirect stub (meta-refresh + JS `location.replace` + visible fallback link to `/projects/quest/`); preserves any inbound links to `/quest/`.
- `CONTRIBUTING.md` — added missing Design Decision issue template reference
- `README.md` — added Repository Structure section
- `.github/workflows/static.yml` — updated `actions/checkout` from `@v6` to `@v4`
- `index.html` — updated team photo `<img>` paths to `assets/`

## [v0.1.0] — 2026-03-15

### Added
- Initial marketing site launch at talewatersandtides.com
- Single-file `index.html` — mobile-first, no build step, no dependencies
- Hero section with branding imagery and app screenshot
- Responsive layout with outdoor/tech brand aesthetic
- CNAME configured for custom domain deployment
- GitHub Pages deployment via GitHub Actions (`static.yml`)
- Green Team AI triage workflow for issue classification (`triage.yml`)
- Issue templates: bug report, feature request, feedback, UX evaluation, design decision
- MIT License
- `.gitignore`, `.prettierrc`, `CONTRIBUTING.md`
- `README.md` with deploy instructions and PFG integration context
