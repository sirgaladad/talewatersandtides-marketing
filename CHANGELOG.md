# Changelog

All notable changes to the Tale Waters & Tides marketing site will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- `/news/` — News and updates: the latest Friday note, what shipped in Pocket Fishing Guide (one card per angler-visible change, grouped by release day, the two newest days open and earlier days folded, pictures from the app where it has them), the numbers the lab watches with their source and read date (visitors per week as an inline SVG chart, what people open, where they come from), observations, Tale Waters and Tides updates, standing asks, and an RSS feed at `/news/feed.xml`. Everything renders from `data/news.json` and `data/pfg-whats-new.json` through `scripts/build-news.mjs`; `--check` runs in `html-lint.yml` so a stale page or a copy-rule break (exclamation mark, stock phrase, bracketed placeholder) fails CI. Files: `news/`, `data/`, `assets/css/news.css`, `scripts/build-news.mjs`, `docs/NEWS-AND-UPDATES.md`.
- `.github/workflows/news-sync.yml` — Fridays 15:40 UTC and on demand: fetches the What's new snapshot from the app's public copy at `https://www.pocketfishinguide.com/data/whats-new.json` (no token; the PFG side serves `web/public/data/whats-new.json`), rebuilds the page, feed and lab block, runs the checks and opens a draft PR. Never pushes to `main`.
- `/lab/` — a "What shipped" block with the six newest Pocket Fishing Guide changes, written by the same script between `lab-news` markers, and a paragraph on what the app carries now (map with dam generation, Arkansas River pools, weekly report, Fish Arkansas, buddies, guide pages and booking, the Friday email).

### Changed
- "News" added to the main nav, mobile menu and footer Proof column on `/`, `/corey/`, `/lab/`, `/readiness/`, `/privacy/`; `/news/` added to `sitemap.xml`, `llms.txt` and the strict set in `scripts/check-site.mjs`.
- `projects/index.html` — the Pocket Fishing Guide card said 39 waters and 27 species; it now says 57 and 33 and names the newer surfaces.
- Progress dashboard for both businesses. `/admin/metrics/` (magic-link sign-in, allowlisted emails) and `/partners/progress/#t=<token>` (trends and totals only) render the payload from a new Supabase Edge Function, `metrics`, which reads TWT leads, PFG traffic (Vercel Web Analytics), PFG account totals (PFG endpoint), GA4 and Search Console. Each source is optional and shows as not connected until its secrets are set. Weekly charts with a hover crosshair and table view, plain-language story lines, faded in-progress week. Files: `admin/metrics/`, `partners/progress/`, `assets/css/metrics.css`, `assets/js/metrics.js`, `supabase/functions/metrics/`, `.github/workflows/metrics-function.yml`, `docs/METRICS-DASHBOARD.md`; `robots.txt` disallows `/admin/` and `/partners/`. Not deployed.
- `/sales-kit/` — internal, `noindex` field playbook for Pocket Fishing Guide partner outreach: pipeline snapshot, actionable fix-list (each item carries the link or copy action that completes it), segments, scripts with tap-to-copy, objection search, the pack checklist, proof points, a day-by-day route with tap-to-call and per-business status/notes, the close cadence, a weekly scorecard and an open-decisions list that exports as markdown. State lives in `localStorage` only. No price appears on the page by design. Files: `sales-kit/index.html`, `assets/css/sales-kit.css`, `assets/js/sales-kit.js`; `robots.txt` disallows the path. Linked from the footer Proof column on every page and from the Pocket Fishing Guide section of `/lab/`.

### Changed
- `assets/js/site.js` exposes the Supabase URL and public anon key on `window.TWT`, so the dashboard pages reuse the one copy instead of adding their own.
- Clarity pass on `/` and `/corey/`, using Corey's June 2026 resume as the source of truth:
  - Home hero says plainly what the practice does and for whom; the fishing-app panel is replaced by Corey's photo and credentials.
  - The unsourced 76%/14% stat band and the two identical "doors" are replaced by a track-record strip (25+ Fortune 500 programs, Harley-Davidson +20%, Dell CMO audit to $7M+, RaftUp 30K+) and "What you can hire me for" (three offers with who, what, how long).
  - Proof leads with enterprise results; PFG and RaftUp follow as "I still build". The empty case-study placeholder is removed.
  - `/corey/` rebuilt for recruiters: summary, at-a-glance numbers, selected results, dated experience with titles, skills grouped by area, education and credentials, recognition and publications, Book a call / LinkedIn / Save as PDF.
  - "IBM Watson Marketing" replaced with Acoustic (as on the resume) across pages, FAQ, JSON-LD and `llms.txt`; Person schema gains credentials, alumniOf and awards.

### Added
- Service pages, one per offer, each with who it is for and not for, deliverables, the plan week by week, pricing approach, how success is measured, tools worked in, proof, FAQ and a booking action; `Service`, `FAQPage` and `BreadcrumbList` JSON-LD: `/ai-implementation/`, `/fractional-ai-martech/`, `/ai-workshops/`.
- `/work/pocket-fishing-guide/` — first case study, from verified first-party facts, with its limits stated.
- Footer, mobile menu and the home offers link to the service pages; the home proof card for Pocket Fishing Guide links to the case study; `llms.txt` and the README list the new pages; `CLAUDE.md` describes the company as the AI implementation practice it is.

### Changed
- `/prompt-play/` is archived as a past event: the booking link for June 9 is gone, every section reads in the past tense, the hero and recap point to the take-home kit and `/events/`, and the page carries `Event` JSON-LD with the real dates and venue. A small date-gate helper (`data-until`, `data-since`) is in place for the next event's CTA, and `check-site.mjs` fails on any booking link whose date has passed.
- Analytics moved to the official Google Tag Manager install (container `GTM-TZVTR5TG`): `gtm.js` snippet in `<head>` and the `<noscript>` iframe after `<body>` on every indexable page, including `/projects/quest/`, which had no analytics before. The old `gtag.js` loader and the no-op `gtag('config','GTM-…')` line are gone. A head shim turns the site's `gtag('event', …)` calls into `dataLayer` events GTM triggers can see. README "Analytics" lists what the container must hold.
- `scripts/check-site.mjs` — new interlocks: GTM snippet and noscript on every indexable page, no `gtag.js` loader, no `GTM-` ID in `gtag('config')`, every indexable page listed in `sitemap.xml`, Organization `sameAs` limited to company identities, and UPCOMING / LIVE NOW badges must carry a future `data-until` date.
- `sitemap.xml` — added `/projects/buffalo-river/`, `/projects/quest/` and `/unbound/`, which were public but unlisted.
- `html-lint.yml` — the push filter now includes `sitemap.xml` and `scripts/check-site.mjs`, so the interlocks also run when those change on `main`.
- `projects/pfg-intelligence/index.html` — `noindex`; it is an unlinked copy of the internal market-intelligence dashboard.

### Fixed
- `events/index.html` — Prompt Play (June 9, 2026) and UNBOUND Buzzword Bingo (September 16-18, 2026) were still labelled UPCOMING and LIVE NOW; both now read PAST, with copy and meta descriptions in the past tense. `llms.txt` says the same.
- `index.html` — the Organization `sameAs` now lists only the company Facebook page. Corey's LinkedIn, TikTok and GitHub stay on the Person entity in `/corey/`.
- `competitive-dashboard.html` — `noindex` added; it is an internal working document that had been appearing in search. Not added to `robots.txt`, because a crawl block would stop Google from seeing the `noindex`.
- `intake` `/scan`: a heuristic fallback caused by a Claude error (bad key, outage) is no longer cached for 7 days, and while `ANTHROPIC_API_KEY` is set, cached heuristic rows are rescanned instead of served.

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
