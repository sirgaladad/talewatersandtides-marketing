# Tale Waters & Tides — Marketing Site

> **AI your team actually uses.** · [talewatersandtides.com](https://talewatersandtides.com)

Tale Waters and Tides, LLC is an AI implementation practice in Little Rock, Arkansas, led by [Corey Boelkens](https://talewatersandtides.com/corey/). We set AI up in the tools a business already pays for, train the team on real work, and run it with them until it sticks. The outdoor lab (Pocket Fishing Guide) stays as proof.

---

## Pages

| Path | Purpose | Primary action |
|------|---------|----------------|
| `/` | Services home: two doors (owners, marketing/ops leaders), five stages, week-by-week 90-day plan, proof, FAQ, routed contact form | Book a call |
| `/readiness/` | One-page AI readiness check: site scan, three questions, gated reading and dated plan | Get my reading |
| `/corey/` | Executive profile, career, principles, press; prints as a one-page profile | Work with Corey |
| `/lab/` | Outdoor Recreation Innovation Lab: Pocket Fishing Guide and origin story | Open PFG |
| `/privacy/` | What the forms and scan collect | — |
| `/projects/`, `/prompt-play/`, `/events/`, `/first-contact/`, `/unbound/` | Existing lab, event and workshop pages (unchanged, out of the main nav) | — |

## Facts used on the site

| Fact | Value | Source |
|------|-------|--------|
| Pocket Fishing Guide coverage | 57 waters, 33 species | `pocket-fishing-guide` repo data files (validated 2026-10-07) |
| PFG data sources | USGS, NWS, USACE, AGFC (+ Open-Meteo, USNO); 20-minute refresh | `pocket-fishing-guide/docs/data-sources.yaml` |
| RaftUp | 30K+ users, $1M+ raised | Previous site |
| Social | LinkedIn `/in/boelkens`, TikTok `@coreytheideaguy`, Facebook `talewatersandtides`, GitHub `sirgaladad` | Owner-confirmed |
| Booking link | `https://calendar.app.google/MmHqpVo9QuN93jYt8` (Google Calendar appointment page), used by every "Book a call" button | Owner-provided |
| Analytics | Google Tag Manager container `GTM-TZVTR5TG` on every indexable page; the GA4 property lives inside the container (expected `G-929WWD4EZ4`, confirm in GA4 admin) | Commits `5cb2786`, `17a1348`; owner to confirm the property |

Change a fact in one place, then search the repo for the old value: it also appears in JSON-LD, `llms.txt`, and the FAQ.

---

## Analytics

Every indexable page carries the official Google Tag Manager snippet in `<head>` and the `<noscript>` iframe right after `<body>`, container `GTM-TZVTR5TG`. The site never loads `gtag.js` directly; `scripts/check-site.mjs` fails if a page does, if a page passes a `GTM-` ID to `gtag('config')`, or if an indexable page has no snippet. `noindex` and redirect pages are exempt.

The site's event calls are `gtag('event', name, params)` (in `assets/js/site.js` and page scripts). A small shim in the head turns each into a `dataLayer.push({ event: name, ...params })`, resetting the previous event's parameters first so values do not leak between events. Other commands (`consent`, `set`) pass through unchanged.

The container must hold, for events to reach GA4:

| Tag or trigger | Setting |
|----------------|---------|
| Google tag (GA4) | The reporting property's measurement ID; fires on Initialization |
| GA4 Event tag | Event name `{{Event}}`; one Data Layer Variable and parameter mapping per key the site emits (full list below) |
| Custom Event trigger for that tag | Event name matches regex `^(?!gtm\.).+` |

Every parameter key the site's events emit, so none is dropped by the mapping. Add a row here and a Data Layer Variable in the container whenever a new key is introduced.

| Key | Emitted by |
|-----|------------|
| `event_category`, `event_label` | every `click` and `section_view`; kit, bingo and First Contact events |
| `link_url` | `click` events on `[data-ga]` links |
| `value` | bingo marks, wins, shuffles, shares and resets; First Contact feedback |
| `form`, `looking_for`, `stage` | `generate_lead` from the contact form (`form`, `looking_for`) and the readiness check (`form`, `stage`) |
| `source` | `readiness_scan` |
| `plan` | `plan_toggle` on the home engagement tabs |
| `item_id` | Prompt Play kit filters, copies and favourites |
| `experience`, `tool`, `title` | First Contact `onboard`, `prompt_logged`, `spec_copy` |

Verify after any change: Tag Assistant preview on `/`, `/readiness/` and `/projects/quest/` shows the Google tag and one GA4 event per click; GA4 Realtime shows `page_view` and `click` with `event_label`.

---

## Lead intake

Both forms post to the Supabase Edge Function `intake` (project `feldynpqhzvstpssztra`). Leads land in the `leads` table, which has no public access. See [`supabase/functions/intake/README.md`](supabase/functions/intake/README.md) for routes, limits, secrets and the site-scan design.

## Development

No build step. Serve the repo root so absolute paths resolve:

```bash
python3 -m http.server 8080   # then open http://localhost:8080
```

`localhost:8080` is in the intake function's default CORS allowlist, so forms work locally.

## Quality gates

| Check | Command | CI |
|-------|---------|----|
| HTML lint | `npx htmlhint@1 "**/*.html"` | `html-lint.yml` |
| SEO + links: titles, descriptions, canonicals, one h1, JSON-LD, alt text, internal links and anchors; analytics snippet on every indexable page; every indexable page in the sitemap; Organization `sameAs` allowlist; date-gated event badges | `node scripts/check-site.mjs` | `html-lint.yml` |
| Intake function: lint, type-check, unit tests | `deno lint && deno check index.ts && deno test --no-check=remote --allow-env intake_test.ts` (in `supabase/functions/intake`) | `intake-function.yml` |

Add a new top-level page to `sitemap.xml`, and it is checked automatically.

---

## Repository structure

```
talewatersandtides-marketing/
├── index.html                 # Services home
├── readiness/index.html       # AI readiness check (intake)
├── corey/index.html           # Executive profile
├── lab/index.html             # Outdoor Recreation Innovation Lab
├── privacy/index.html         # Privacy notice
├── assets/
│   ├── css/site.css           # Design tokens and components (Tide Chart direction)
│   ├── js/site.js             # Nav, GA events, UTM capture, intake client, contact form
│   ├── js/home.js             # 90-day plan tabs and kickoff dates
│   └── js/readiness.js        # Readiness check logic and scoring
├── supabase/
│   ├── functions/intake/      # Lead intake + site scan Edge Function
│   └── migrations/            # Database migrations (applied via Supabase)
├── scripts/
│   ├── check-site.mjs         # SEO and link checks
│   └── gen-md.mjs             # Prompt Play kit Markdown mirror
├── sitemap.xml, robots.txt, llms.txt, CNAME
└── .github/workflows/         # Pages deploy, HTML lint + site checks, intake tests, triage
```

## Deployment

GitHub Pages deploys on every push to `main` (`static.yml`). The intake function is deployed separately (see its README).

## Contact

[corey@talewatersandtides.com](mailto:corey@talewatersandtides.com) · [LinkedIn](https://www.linkedin.com/in/boelkens/)
