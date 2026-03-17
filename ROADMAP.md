# Roadmap — Tale Waters & Tides Marketing Site

> Mirrors the roadmap pattern from [Pocket Fishing Guide ROADMAP.md](https://github.com/sirgaladad/pocket-fishing-guide/blob/main/ROADMAP.md)

---

## Guiding Principles

1. **Mobile-first** — every pixel counts on a phone screen on the water
2. **Data before decoration** — real water intelligence drives value
3. **Static by default** — no build step, no server; backend only when the user base justifies it
4. **PFG integration first** — leverage the live Pocket Fishing Guide data engine before building parallel pipelines

---

## Current State — MVP Deployed ✅

- Single-file `index.html` marketing site
- Mobile-first responsive layout with CSS-in-head (no build step)
- PFG integration banner linking to [pocketfishingguide.com](https://pocketfishingguide.com)
- Water status dashboard with stub data (6 Arkansas waters)
- Data pipeline architecture documented and stubbed
- GA4 analytics event taxonomy stubbed (replace `G-XXXXXXXXXX` to activate)
- GitHub Pages auto-deploy via Actions on push to `main`
- Brand imagery and app screenshot integrated
- Semantic HTML, ARIA labels, skip link, accessible color contrast
- `data/water-status.json` snapshot file (stub, ready for live data)
- `docs/DEPLOY-LIVE-SITE.md` deployment guide

---

## Phase 1 — Data Pipeline Live Integration

**Goal:** Replace stub JSON with real USGS/NWS/USACE data fetched automatically.

- [ ] `scripts/fetch_water_data.js` — fetch USGS gauge data for 6 initial waters
- [ ] `scripts/fetch_nws_forecasts.js` — fetch NWS 7-day forecasts per water
- [ ] `scripts/fetch_usace_levels.js` — fetch USACE lake level snapshots
- [ ] Update `.github/workflows/static.yml` with 6-hour scheduled fetch cron
- [ ] Validate JSON schema with `scripts/validate_water_data.js`
- [ ] Update dashboard cards with real temperature, spawn phase, and trend data

---

## Phase 2 — Responsive Design Refinement

**Goal:** Production-quality mobile UX matching PFG standards.

- [ ] Compress header to max 2 lines on smallest screens (320px)
- [ ] Water status cards — add 7-day trend sparkline (CSS-only or SVG)
- [ ] Spawn phase color-coded progress bar per water card
- [ ] Touch target audit — minimum 44px on all interactive elements
- [ ] Test on iOS Safari, Android Chrome, and major desktop browsers
- [ ] Add `<link rel="manifest">` for PWA-ready home screen icon

---

## Phase 3 — Analytics Hardening

**Goal:** Establish baseline GA4 funnel so every roadmap decision is data-driven.

- [ ] Replace `G-XXXXXXXXXX` with real GA4 Measurement ID
- [ ] Verify all pre-wired events fire correctly in GA4 DebugView
- [ ] Add `scroll_depth` events at 25%, 50%, 75%, 100%
- [ ] Define conversion funnel: Load → Dashboard Viewed → PFG App Clicked
- [ ] Establish weekly sessions baseline before Phase 4

**GA4 Event Taxonomy (pre-wired in v1.0):**

| Event | Trigger |
|-------|---------|
| `pfg_banner_click` | Top banner PFG link |
| `nav_click` | Nav item (desktop or mobile) |
| `cta_click` | Hero or section CTA buttons |
| `pfg_click` | Any Pocket Fishing Guide link |
| `github_click` | GitHub repo link |
| `footer_click` | Footer link click |
| `faq_opened` | FAQ accordion expand |
| `data_loaded` | Dashboard JSON snapshot loaded |

---

## Phase 4 — PFG Widget / Deep Integration

**Goal:** Embed live water data from Pocket Fishing Guide directly in the marketing page.

- [ ] Evaluate PFG iframe embed vs. shared `data/` JSON endpoint
- [ ] Build "Featured Water" widget — single water body, live temp + spawn phase
- [ ] Add "Compare Waters" table sourced from `data/water-status.json`
- [ ] Deep link CTA buttons to specific waters in the PFG app

---

## Phase 5 — Community & Stakeholder

**Goal:** Build habit loop and community around the platform.

- [ ] `CONTRIBUTING.md` — local knowledge contribution guide
- [ ] GitHub Issue templates (bug report, feature request, local intel)
- [ ] Weekly fishing report digest (EmailJS or similar, no backend)
- [ ] `.ics` calendar download for predicted spawn windows
- [ ] Ko-fi support widget integrated in footer

---

## Document History

- **v1.0** — 2026-03-17: Initial roadmap, MVP deployed

---

*This roadmap is a living document — priorities shift as we hear from anglers.*
