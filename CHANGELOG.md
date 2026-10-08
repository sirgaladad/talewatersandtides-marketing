# Changelog

All notable changes to the Tale Waters & Tides marketing site will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- Services-first site from the Tide Chart redesign: `index.html` rebuilt (two doors, five-stage tide line, week-by-week 90-day plan with owner/leader tabs and kickoff dates, proof, ground rules, FAQ, routed contact form), plus `/corey/` (executive profile, Person schema, print one-pager), `/lab/` (Outdoor Recreation Innovation Lab, PFG), `/privacy/`.
- `/readiness/` — one-page AI readiness check: real site scan via the `intake` function, categorized tools, where-it-hurts and cost chips, a reading panel that sharpens as answers land, gated score/stage, dated interactive plan, and lead capture.
- `assets/css/site.css`, `assets/js/site.js`, `assets/js/home.js`, `assets/js/readiness.js`; `assets/pfg-beaver-lake.webp` (38 KB, from the 630 KB PNG).
- `sitemap.xml`, `robots.txt`; Organization/ProfessionalService/WebSite/FAQPage, Person/ProfilePage and SoftwareApplication JSON-LD.
- `scripts/check-site.mjs` — SEO and internal-link checks, run in `html-lint.yml`.
- `supabase/functions/intake/` — lead intake Edge Function for the services site. `/scan` fetches a prospect's homepage (SSRF-guarded), detects booking/CRM/review signals, and classifies the business with Claude into the readiness-check option sets (keyword fallback without a key). `/lead` validates, spam-traps (honeypot + elapsed time), rate-limits and stores leads; optional Resend email alert.
- `supabase/migrations/20261007000000_leads_intake.sql` — `leads`, `intake_events`, `site_scans` tables; RLS on, no anon access.
- `supabase/migrations/20261007010000_intake_rate_limit_atomic.sql` — `public.intake_rate_limit()`: atomic count + check + insert under an advisory lock (service_role only).
- `.github/workflows/intake-function.yml` — Deno lint, type-check and unit tests for the intake function.
- `unbound/index.html` — UNBOUND Buzzword Bingo at `/unbound/`, an unofficial attendee edition for the team at HubSpot's UNBOUND 2026 (Boston, Sept 16-18). Mobile-first, no dependencies. Tap-to-mark card in the poster's navy/orange/cream palette, per-device persistence via `localStorage`, seeded shuffle so teammates get different cards, poster-card mode matching the printed version, five-in-a-row detection with a win overlay and confetti, Web Share / clipboard sharing, GA events (`bingo_mark`, `bingo_win`, `bingo_shuffle`, `bingo_share`), reduced-motion support, and a print stylesheet.
- `.github/workflows/html-lint.yml` and `.htmlhintrc` — HTMLHint runs on every pull request and push to `main` that touches an `.html` file.
- `projects/index.html` — new portfolio landing page at `/projects/`, digital-agency style. Launches with five cards: Pocket Fishing Guide (LIVE), Quest (PLAYGROUND), and three "IN PROGRESS" placeholders (Guide Marketplace MVP, PFG White-Label Demo, Outdoor AI Field Notes).
- `projects/quest/index.html` — Quest page relocated under the new portfolio path; top back-seal now returns to `/projects/` for portfolio-aware navigation.
- `SECURITY.md` — private vulnerability reporting policy
- `assets/` directory — images moved out of root (`AbbySims.jpeg`, `CoreyBoelkens.jpeg`, `IMG_0393.png`, `TWT_Background.png`, `TalewatersandTides_Logo_White_Horizontal.png`)
- `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1

### Changed
- `llms.txt` and `README.md` rewritten for the AI implementation positioning.
- `projects/index.html`, `events/index.html` — links to removed home anchors (`/#now`, `/#team`, `/#collab`) now go to `/lab/`, `/corey/`, `/#contact`.
- TikTok handle corrected to `@coreytheideaguy` on all pages.
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
