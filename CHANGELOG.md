# Changelog

All notable changes to the Tale Waters & Tides marketing site will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- `SECURITY.md` — private vulnerability reporting policy
- `assets/` directory — images moved out of root (`AbbySims.jpeg`, `CoreyBoelkens.jpeg`, `IMG_0393.png`, `TWT_Background.png`, `TalewatersandTides_Logo_White_Horizontal.png`)
- `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1

### Changed
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
