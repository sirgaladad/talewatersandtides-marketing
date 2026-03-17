# Tale Waters & Tides — Marketing Site

[![Live Site](https://img.shields.io/badge/Live%20Site-talewatersandtides.com-blue?style=flat-square)](https://talewatersandtides.com)
[![Deploy](https://github.com/sirgaladad/talewatersandtides-marketing/actions/workflows/static.yml/badge.svg)](https://github.com/sirgaladad/talewatersandtides-marketing/actions/workflows/static.yml)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

Marketing site for **talewatersandtides.com** — Arkansas fishing intelligence platform powered by live USGS, NWS, and USACE data. Patterns and best practices adopted from [Pocket Fishing Guide](https://github.com/sirgaladad/pocket-fishing-guide).

---

## Architecture

Single-file `index.html` — mobile-first, CSS-in-head, no build step, no npm. Deployed to GitHub Pages via GitHub Actions on every push to `main`.

```
Push to main
      ↓
.github/workflows/static.yml  (GitHub Actions)
      ↓
GitHub Pages → talewatersandtides.com
```

### Data Pipeline (stub — live integration in progress)

```
USGS / NWS / USACE APIs
         ↓
  GitHub Actions (every 6 hrs) — scripts/fetch_water_data.js (planned)
         ↓
  data/water-status.json  ← JSON snapshot
         ↓
  index.html  →  GitHub Pages  →  talewatersandtides.com
```

---

## Quick Start

```bash
git clone https://github.com/sirgaladad/talewatersandtides-marketing.git
cd talewatersandtides-marketing
open index.html   # or: npx serve .
```

No build step, no install required.

---

## PFG Integration

This site is built on the same data architecture as [Pocket Fishing Guide](https://pocketfishingguide.com):

- Live USGS water temperature data (no API key required)
- NWS 7-day forecast integration
- USACE lake level snapshots
- Spawn phase intelligence for White Bass and Crappie
- 39 Arkansas water bodies

See [docs/DEPLOY-LIVE-SITE.md](docs/DEPLOY-LIVE-SITE.md) for full pipeline and deployment details.

---

## Features

- **Mobile-first HTML** — single `index.html`, CSS-in-head, responsive design
- **Live water status dashboard** — 6 Arkansas waters, fed from `data/water-status.json`
- **PFG integration banner** — links to [pocketfishingguide.com](https://pocketfishingguide.com)
- **Data pipeline stub** — USGS/NWS/USACE endpoint stubs, JSON snapshot structure
- **GA4 analytics** — event taxonomy pre-wired (replace `G-XXXXXXXXXX` to activate)
- **Accessible** — semantic HTML, ARIA labels, skip link, keyboard-navigable
- **GitHub Pages auto-deploy** — push to `main` → live in seconds

---

## Deployment

See [docs/DEPLOY-LIVE-SITE.md](docs/DEPLOY-LIVE-SITE.md) for step-by-step instructions.

**TL;DR:**
1. Enable GitHub Pages in Settings → Pages → Source: **GitHub Actions**
2. Push to `main` — the workflow handles the rest

---

## Analytics Setup

1. Create a GA4 property for `talewatersandtides.com`
2. Replace `G-XXXXXXXXXX` in `index.html` with your Measurement ID
3. Pre-wired events: `pfg_banner_click`, `nav_click`, `cta_click`, `pfg_click`, `faq_opened`, `data_loaded`

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for phased development plan:

- **Phase 1** — Live data pipeline (USGS/NWS/USACE integration)
- **Phase 2** — Responsive design refinement + PWA manifest
- **Phase 3** — Analytics hardening + GA4 funnel baseline
- **Phase 4** — PFG widget / deep integration
- **Phase 5** — Community, contributing, issue templates

---

## References

- [Pocket Fishing Guide README](https://github.com/sirgaladad/pocket-fishing-guide/blob/main/README.md)
- [PFG Data Pipeline Architecture](https://github.com/sirgaladad/pocket-fishing-guide/blob/main/README.md#how-it-works)
- [PFG Deployment Docs](https://github.com/sirgaladad/pocket-fishing-guide/blob/main/docs/DEPLOY-LIVE-SITE.md)
- [PFG Roadmap](https://github.com/sirgaladad/pocket-fishing-guide/blob/main/ROADMAP.md)

---

## License

[MIT](LICENSE) — free to use, fork, and build on.
