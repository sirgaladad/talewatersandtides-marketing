# Guides design package

Source of the "TWT Guiding — Booking Flow Mockup" canvas, checked in so the design is versioned next to the code it describes and so an agent can build from it without a browser.

- Live canvas (editable): https://claude.ai/artifact/SqtkHNABW13VptDn96uxzF
- Written decisions the boards encode: `docs/guides/`
- Build order: `docs/guides/GUIDES-PR-PLAN-DEV-ENVIRONMENT.md`

---

## What is here

| Path | What it is |
|------|------------|
| `canvas/canvas.json` | Board list, sizes and positions. The canvas index. |
| `canvas/g.css` | Shared tokens and classes for every board (`.g-btn`, `.g-card`, `.g-pill`, `.g-day`, `.g-chip`, `.g-signal`). Colors and type here mirror `assets/css/site.css` on the marketing side and the PFG theme on the app side. |
| `canvas/*.dc.html` | One file per board. Static HTML plus a small `DCLogic` component at the bottom that drives interactive parts (filters, the booking steps). |
| `assets/species/*.png` | Species plates from `pocket-fishing-guide/web/public/species/`. |
| `assets/underwater-stage.webp` | Background from `pocket-fishing-guide/web/public/assets/imagery/`. |

Image paths inside the boards are relative (`../assets/...`), so the files render from a checkout. Boards that use `sc-for` templates (Flow, Guides, Dashboard) need the canvas runtime to render their lists; open those in the live canvas, or read the markup and the `renderVals()` data at the bottom of the file, which is the spec.

---

## Board to route map

| Board | Size | Ships as | Repo | PR |
|-------|------|----------|------|----|
| `Main.dc.html` | 1280 × 2560 | `/guiding/` hub | talewatersandtides-marketing | 1, 3, 4 |
| `Trip.dc.html` | 390 × 1560 | `/guides/[slug]/[package]` | pocket-fishing-guide | B |
| `Flow.dc.html` | 390 × 844 | `/guides/[slug]/book` (5 steps) | pocket-fishing-guide | C |
| `Guides.dc.html` | 1280 × 1160 | `/guides` directory (ship when guide #2 exists) | pocket-fishing-guide | B |
| `Dashboard.dc.html` | 1280 × 900 | `/guide/requests`, `/guide/calendar`, `/guide/packages`, `/guide/lunch` | pocket-fishing-guide | D |
| `Species.dc.html` | 1280 × 2000 | `/guiding/fish/` summary; deep content stays in PFG `/species/<id>` | talewatersandtides-marketing | 3 |

---

## Rules an agent must keep when building from these boards

- Prices, hours, lunch options and policy text come from `data/guiding.json` (marketing) or `trip_packages` rows (PFG). Never from the board.
- Copy on the boards is draft. Headlines and section titles stay short and literal; the SEO doc explains why.
- No fly fishing, no Buffalo River guiding, no Little Red River. CI (`scripts/check-guiding.mjs`) fails if any of those reappear.
- Every link into Pocket Fishing Guide from the marketing site carries `utm_source=twt&utm_medium=referral&utm_campaign=guiding`.
- Tailwater cards link to `/water/<id>?tab=tailwaters`; species cards link to `/species/<id>?water=<water_id>`.
- Placeholder guides on the `Guides` board are bracketed `[like this]`. Never ship bracketed copy.
- Weekends are not bookable unless a guide opens one. Default trip length is full day.
- The weather rule and the cancellation table render once, directly above the book button, and again at the review step. Nowhere else.

---

## Updating the package

1. Edit in the live canvas, or edit the files here and republish from this folder.
2. Re-run `node scripts/check-design.mjs` (asset references, board list, bracketed placeholders).
3. Commit with `[Chore] Design: <what changed>` and link the PR that will consume the change.
