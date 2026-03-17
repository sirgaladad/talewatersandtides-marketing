# Deploy Live Site — Tale Waters & Tides Marketing

> Pattern borrowed from [Pocket Fishing Guide — DEPLOY-LIVE-SITE.md](https://github.com/sirgaladad/pocket-fishing-guide/blob/main/docs/DEPLOY-LIVE-SITE.md)

## Overview

The Tale Waters & Tides marketing site deploys as a **GitHub Pages static site** directly
from the `main` branch — no build step, no npm, no server required. A GitHub Actions
workflow (`.github/workflows/static.yml`) handles deployment automatically on every push.

---

## Live URL

```
https://talewatersandtides.com
```

The custom domain is configured in the `CNAME` file at the repo root.

---

## Deployment Architecture

```
Push to main branch
      ↓
GitHub Actions → .github/workflows/static.yml
      ↓
actions/upload-pages-artifact (entire repo)
      ↓
actions/deploy-pages
      ↓
https://talewatersandtides.com  (GitHub Pages + custom domain)
```

---

## First-Time Setup

### 1. Enable GitHub Pages

1. Go to **Settings → Pages** in the repository.
2. Under **Source**, select **GitHub Actions**.
3. Save changes.

### 2. Configure Custom Domain (optional — already set via CNAME)

1. Go to **Settings → Pages → Custom domain**.
2. Enter `talewatersandtides.com`.
3. Enable **Enforce HTTPS**.
4. Ensure your DNS provider has:
   - `A` records pointing to GitHub Pages IPs
   - `CNAME` record for `www` pointing to `sirgaladad.github.io`

### 3. Push to Main

Any push to `main` triggers automatic deployment via the Actions workflow.
You can also trigger manually from **Actions → Deploy static content to Pages → Run workflow**.

---

## Data Pipeline (Future Integration)

The dashboard in `index.html` loads water status from `data/water-status.json`.
The stub snapshot is checked in to the repo. Future integration will use a GitHub Actions
scheduled workflow to fetch live data:

| Source | Endpoint | Data |
|--------|----------|------|
| USGS Water Services | `https://waterservices.usgs.gov/nwis/iv/?format=json&parameterCd=00010,00060,00065&sites={gaugeId}` | Water temp, flow rate, gage height |
| NWS Forecast API | `https://api.weather.gov/points/{lat},{lon}` | 7-day weather forecast |
| USACE CWMS API | `https://water.usace.army.mil/` | Lake level and dam release |

The fetch script will live at `scripts/fetch_water_data.js` and run every 6 hours.

### Data Pipeline Architecture (from PFG)

```
USGS / NWS / USACE APIs
         ↓
  GitHub Actions (every 6 hrs)
  scripts/fetch_water_data.js
         ↓
  data/water-status.json  ← committed back to repo
         ↓
  index.html  (fetched via JS on page load)
         ↓
  GitHub Pages → talewatersandtides.com
```

---

## Local Development

```bash
git clone https://github.com/sirgaladad/talewatersandtides-marketing.git
cd talewatersandtides-marketing
open index.html   # or double-click the file
```

No build step, no npm install needed. To test the data endpoint locally, serve via a
local HTTP server to avoid CORS issues with `fetch`:

```bash
npx serve .        # or
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

---

## Analytics

GA4 is stubbed in `index.html`. To activate:

1. Create a Google Analytics 4 property for `talewatersandtides.com`.
2. Replace `G-XXXXXXXXXX` in `index.html` with your real Measurement ID.
3. The following events are pre-wired:
   - `pfg_banner_click` — top PFG banner click
   - `nav_click` — navigation item click
   - `cta_click` — hero / section CTA click
   - `pfg_click` — any PFG link click
   - `github_click` — GitHub link click
   - `footer_click` — footer link click
   - `faq_opened` — FAQ accordion expand
   - `data_loaded` — dashboard data loaded from JSON snapshot

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Site not deploying | Check **Actions** tab for workflow errors; verify Pages source is set to **GitHub Actions** |
| Custom domain not resolving | Verify DNS A/CNAME records; allow up to 48h for propagation |
| Water status shows stub data | `data/water-status.json` is loaded via `fetch` — ensure the file exists and is valid JSON |
| Fonts not loading | Google Fonts CDN requires internet access; fonts fall back to `system-ui` if unavailable |

---

## References

- [Pocket Fishing Guide — DEPLOY-LIVE-SITE.md](https://github.com/sirgaladad/pocket-fishing-guide/blob/main/docs/DEPLOY-LIVE-SITE.md)
- [GitHub Pages documentation](https://docs.github.com/en/pages)
- [GitHub Actions — actions/deploy-pages](https://github.com/actions/deploy-pages)
