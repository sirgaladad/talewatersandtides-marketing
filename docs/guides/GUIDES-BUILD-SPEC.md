# TWT Guiding — Build Spec and Today's Plan

Oct 9, 2026 · @Corey Boelkens

## Today (Friday, Oct 9)

Ship a live "request a trip" page today; real paid booking waits for the license and insurance. Nothing on the page takes money or promises a date until the business tasks below are done.

Business tasks (calls and forms, \~2 hours):

- [ ] Call NPS Commercial Services (870-365-2724) to confirm where the park line sits at the Buffalo's mouth and whether Buffalo City Access is park land
- [ ] Buy your AGFC Resident Fishing Guide License ($25) plus your own fishing license and trout permit
- [ ] Request quotes: guide liability, commercial use on the boat policy (stored in Mountain Home), commercial auto for Little Rock departures
- [ ] Email the USCG sector office that covers north Arkansas (verify which) to ask whether an OUPV license is required on the Bull Shoals tailwater
- [ ] Start a Google Business Profile for the guide service (verification can take days, so start now)
- [ ] Message Abby about a TW&T guide slot in Pocket Fishing Guide (decision, not code)

Build tasks (in `talewatersandtides-marketing`, \~4–6 hours):

- [ ] Branch `feature/guiding-landing` from up-to-date `main`
- [ ] Add `data/guiding.json` (packages, prices, policies: one source of truth)
- [ ] Build `/guiding/` landing page with the trip request form, reusing `site.css` and `site.js`
- [ ] Extend the `intake` function with `source: trip` (migration + `lead.ts` + tests)
- [ ] Add `/guiding/` to `sitemap.xml`, `llms.txt`, and the footer; keep it out of the main AI-services nav
- [ ] Run `npx htmlhint`, `node scripts/check-site.mjs`, and the Deno tests; open a PR
- [ ] Pick 3–5 of your own White River photos for the hero and cards

Not today: the booking tool, deposits, gift cards and the Little Rock pickup all wait on the license, insurance and commercial auto.

## What we reuse

Most of what the guiding section needs already exists across the two repos; the new work is one page, one data file and one intake route. Note: the marketing site is static HTML with no build step (not React/Vite), so the plan's YAML-at-build-time idea becomes a JSON file the page reads.

| Asset | Where it lives | How we use it |
| --- | --- | --- |
| Design tokens and components (`.wrap`, `.section`, `.card`, `.btn`, `.field`, `.input`, `.light`, `.eyebrow`) | `talewatersandtides-marketing/assets/css/site.css` | The guiding page uses them as-is; add \~40 lines of guiding-specific CSS at most |
| Nav, GA events, UTM capture, `window.TWT.intake()` client with honeypot and timing guard | `assets/js/site.js` | Trip form posts through the same client; UTM tags carry PFG and airport attribution |
| Lead intake Edge Function (`/intake/lead`), `leads` table with RLS locked down, rate limits, Resend email alert | `supabase/functions/intake/`, migration `20261007000000_leads_intake.sql` | Add `source: trip` and a `trip` jsonb column; same alert lands in your inbox |
| HTMLHint + SEO/link checker (title, description, canonical, one h1, JSON-LD, alt text, internal links) | `.htmlhintrc`, `scripts/check-site.mjs`, `html-lint.yml` | New page is checked automatically once it's in `sitemap.xml` |
| Deploy on merge to `main` | `.github/workflows/static.yml` | No change |
| Green/Red Team process, PR title format, no direct pushes to `main` | `CLAUDE.md` | Claude scopes, you approve, Codex or you build |
| Confluence photo | `pocket-fishing-guide/web/public/assets/imagery/BuffaloRiverandWhiteRiverConfluence.webp` | Placeholder hero until your own photo; confirm its provenance first |
| Lifestyle imagery (fly angler, couple in boat) | `web/public/assets/imagery/lifestyle/` | Placeholders only; provenance isn't recorded (see Content) |
| White River reach data: Buffalo City / Confluence Reach (miles 30–42, boat water, trout plus smallmouth near the warm Buffalo inflow), access points incl. Buffalo City, Cotter, Norfork | `pocket-fishing-guide/data/trout/river_sections.json`, `access_points.json` | Trip descriptions and the meeting-point list; credit PFG as the source |
| Bull Shoals generation snapshot | `data/swpa_generation.json` | Don't show on the guiding page: it's a curated, not live, feed. Link to the PFG water page instead |
| TW&T as house sponsor across all partner contexts, incl. `guide`, with one URL CTA | `web/lib/landing-content.ts`, `PROFILES-GUIDES-SPONSOR-SCOPING.md` | Point the guide-context CTA at `/guiding/?utm_source=pfg`; already allowed by the URL-CTA-only rule |
| White River water page | `pocketfishinguide.com/water/wb_white_river_bull_shoals_tailwater` | "Today's river" link from the guiding page |

## Pages

Start with one long page today, `/guiding/`, and split it into more pages only when traffic or SEO earns it. One page means one form, one set of checks, and nothing to keep in sync.

| Route | Ships | Purpose | Primary action |
| --- | --- | --- | --- |
| `/guiding/` | Today | Everything: trips, the day, the confluence, Little Rock pickup, planning, FAQ, request form | Request a trip |
| `/guiding/#request` | Today | The trip request form (anchor, same page) | Send request |
| `/guiding/thanks/` | Today | Dropped for today: the form confirms inline with next steps and the license reminder | Read "Plan your trip" |
| `/guiding/from-little-rock/` | Week 2 | SEO page for "fishing trips from Little Rock" and the airport pickup | Request a trip |
| `/guiding/gift-cards/` | Before Thanksgiving | Gift certificate purchase (Stripe Payment Link) | Buy a gift card |
| `/guiding/book/` | March 2027 | Embedded booking tool with deposits and waivers | Pay deposit |

`/guiding/` section by section (mobile first; the order is the user journey):

1. **Hero** (`#top`). Eyebrow "Guided fishing · White River, Arkansas". H1: "Where two rivers meet." Lede: one sentence on trout on the White below the Buffalo, with Little Rock pickup. Buttons: "Request a trip" (to `#request`) and "See the trips" (to `#trips`). Hero photo: the confluence.
2. **Trust strip.** Licensed by AGFC · Insured · CPR/First Aid · "Little Rock pickup available". Show only items that are true on publish day; the data file controls each one.
3. **Trips** (`#trips`). Three cards from `data/guiding.json`: Half Day $400, Full Day $550, Confluence Day $600. Each: length, "for 1–2 anglers, +$100 third", 3 includes, "Request this trip" (pre-selects the package in the form).
4. **Little Rock Departure** (`#little-rock`). Two cards: Little Rock Departure Half Day $650 and Fly-in from LIT $650; Overnight Confluence Weekend $1,100 + lodging. Badge "Opens spring 2027" until commercial auto is in place.
5. **What a day looks like** (`#day`). A 5-step timeline: meet at the ramp → run to the water → shore lunch on the White → afternoon drift → photos and the trip story.
6. **The confluence** (`#confluence`). Why the Buffalo City reach fishes differently: big boat water, trout plus smallmouth near the warm Buffalo inflow (PFG data, credited). One line on the park boundary: "We fish the White; the Buffalo stays wild."
7. **About Corey** (`#corey`). 80–120 words, photo, link to `/corey/`.
8. **The Tale** (`#tale`). What the trip story is, with one sample.
9. **Plan your trip** (`#plan`). License + trout permit (AGFC link), what to wear, meeting points (Buffalo City, Cotter, Norfork access), today's river (PFG link), lodging partners (empty until signed).
10. **Policies + FAQ** (`#faq`). Deposit, cancellation, weather and generation, kids and PFDs, gratuity, catch-and-release, accessibility. Rendered from `data/guiding.json`.
11. **Request a trip** (`#request`). The form (see Booking flow).

Nav and footer: add "Guided Fishing" to the footer and to `/lab/`; don't add it to the main nav, which sells AI services. The guiding page gets its own simplified nav: Trips · Little Rock · Plan · Request.

## Booking flow

One form serves both phases: today it collects requests with no payment; in March the reply adds a deposit link and waiver from the booking tool, and nothing on the page has to be rebuilt.

&#91;embedded content: booking flow · request mode now, deposits from March\]

The highlighted step is where you are today: requests land in `leads`, you get an email, and you hold the date by reply.

Form fields, in order: trip (pre-selected from the card), date, backup date, anglers (1–3), experience (first time / some / experienced), kids' ages, name, email, mobile, notes, plus the hidden honeypot. No fly-fishing question.

Your reply template (send within a day):

1. Confirm or counter the date and name the ramp (Buffalo City, Cotter or Norfork).
2. Link the AGFC license and trout permit purchase page.
3. Say what's included and what isn't (license, lodging, gratuity).
4. From March: the deposit and waiver link from the booking tool.

## Data and intake (built)

The starter branch `feature/guiding-landing` (commit `92fd944`, 13 files, +732 lines) is built and passing: 18 Deno tests, HTMLHint on 19 pages, the site SEO/link check, and a new price-parity check.

| File | What it does |
| --- | --- |
| `data/guiding.json` | Single source of truth: `mode` (`request` until licensed), six trips with prices and includes, `credentials` flags (all `false` today), meeting points sourced from PFG, policies, links. `waters: [white_river]` with a note excluding the Buffalo |
| `guiding/index.html` | The page: hero, credential strip, three river trips, three pickup trips ("Opens spring 2027"), the day, the confluence, your bio, plan, FAQ, request form. Service JSON-LD with the three river offers |
| `assets/css/guiding.css` | \~50 lines of page layout on top of `site.css` tokens |
| `assets/js/guiding.js` | Form: "Request this trip" and `?trip=` pre-select a package, date bounds (today to 18 months), validation, posts via `window.TWT.intake`, GA `select_item` and `generate_lead` events |
| `supabase/functions/intake/trip.ts` | Validates trips: package in the allowed list, real date from yesterday (UTC) to 18 months, 1–3 anglers, phone pattern, departure derived from package |
| `supabase/functions/intake/lead.ts` | Accepts `source: trip`; stores `trip` jsonb, puts the package in `stage` and the date in `kickoff` so the existing alert email and indexes work; the subject line adds date and party size |
| `supabase/migrations/20261009000000_leads_trip_source.sql` | Adds `trip` to the source check, a `trip` jsonb column, a check that trip and source match, a size cap, and an index on trip dates |
| `scripts/check-guiding.mjs` + `html-lint.yml` | CI fails if a card price, card `data-price` or form option differs from the JSON, the form offers an unknown trip, a credential badge shows while its flag is `false`, the page links a checkout while `mode` is `request`, or a fly-fishing offer appears |
| `sitemap.xml`, `llms.txt`, `lab/index.html` | Discovery: sitemap entry, an LLM-readable summary, links from the Lab page |

The trip record that lands in `leads`:

```json
{
  "source": "trip",
  "stage": "confluence-day",
  "kickoff": "2027-04-17",
  "trip": {
    "package": "confluence-day",
    "date": "2027-04-17",
    "alt_date": "2027-04-24",
    "party_size": 2,
    "departure": "river",
    "experience": "some",
    "kids": null,
    "phone": "501-555-0100"
  }
}
```

Deploy order (each step is reversible): apply the migration to project `feldynpqhzvstpssztra` → deploy the `intake` function → merge the PR so the page goes live. Deploying the page before the function would make requests fail with "source must be contact or readiness".

To go live with credentials later, flip a flag in `data/guiding.json` and remove the matching `hidden` attribute in the HTML; CI refuses one without the other.

## Content and photos

The page ships with honest placeholder copy; three things need your words or your photos before merge.

- **Bio (`#corey`).** The draft says you've fished the Ozarks for years and built PFG. Rewrite it in your voice with true specifics: how long you've fished the White, a favorite stretch, why you started guiding.
- **Hero photo.** The page uses a navy gradient today. Swap in your own shot of the confluence or the lower White. Don't use the PFG confluence or lifestyle images on a guide page: their provenance isn't recorded, and stock or AI imagery implies trips that didn't happen.
- **Sample trip story (`#tale`, not built yet).** Write one from a real day on the water, with photos, before you promise it on every card.

Copy rules already applied:

- Spin and bait only; the FAQ says plainly that there's no fly fishing, and CI blocks a fly offer from creeping back in.
- No Buffalo fishing claims; the confluence section says "We fish the White. The Buffalo is a National River, and it stays wild."
- No catch counts, sizes or guarantees.
- Prices always shown with the angler count and what's included.
- Pickup trips say "Opens spring 2027" until commercial auto is in place.

SEO basics in place: title "White River Guided Trout Trips | Tale Waters and Tides" (54 chars), a 150-character description, canonical, one H1, Service JSON-LD with three offers, sitemap and `llms.txt` entries. Next: the `/guiding/from-little-rock/` page and a Google Business Profile pointing at `/guiding/`.

## QA, CI and launch gates

Everything automated already passes on the branch; the manual checks below are what's left before merge.

| Check | How | Status |
| --- | --- | --- |
| HTMLHint, 19 pages | `npx htmlhint@1 "**/*.html"` (CI) | Pass |
| Titles, descriptions, canonicals, one H1, JSON-LD, alt text, internal links and anchors | `node scripts/check-site.mjs` (CI) | Pass |
| Price, form and credential parity with `data/guiding.json` | `node scripts/check-guiding.mjs` (CI); proven to fail on a $550 → $500 change | Pass |
| Intake lint, type-check, unit tests (18, 6 new for trips) | `deno lint && deno check index.ts && deno test …` (CI) | Pass |
| Layout at 390 px and 1280 px, no horizontal scroll, no console errors | Headless Chromium screenshots | Pass |
| "Request this trip" pre-selects the package; empty date shows an error | Headless Chromium | Pass |
| End-to-end submit lands a `trip` row and the alert email | Local server + deployed function | **Manual**, after migration and deploy |
| Real iPhone and Android submit | Your phone | **Manual** |
| Keyboard-only pass through the form and FAQ | Tab through the page | **Manual** |
| Bio rewritten, own hero photo | You | **Manual** |

Gates by phase:

1. **Merge the request page:** manual checks above + migration and function deployed first.
2. **Show a credential badge:** flip its flag in `data/guiding.json` and unhide the badge; CI checks both.
3. **Switch `mode` to `booking` (March):** AGFC guide license, liability and boat coverage all `true`; booking tool chosen; waiver reviewed by an Arkansas attorney.
4. **Open pickup trips:** `commercial_auto` `true`; remove "Opens spring 2027" labels.
5. **Confluence Day bookable:** `nps_boundary_confirmed` `true` after the NPS call.

## Open decisions

Five calls only you can make; the build has a default for each so nothing blocks today.

| Decision | Default in the branch | When it matters |
| --- | --- | --- |
| Booking tool for March: flat-fee charter tool vs FareHarbor / Peek | None; request form only | Before switching `mode` to `booking` |
| Gift cards: Stripe Payment Link + emailed certificate, or the booking tool's gift cards | Not built | Before Thanksgiving if you want holiday sales |
| Third-angler price on the Confluence Day and pickup trips | +$100 river, +$150 pickup | Before merge |
| Guiding page in the main nav, or only footer and Lab | Footer and Lab only, so the AI-services nav stays focused | Before merge |
| PFG guide slot pointing to `/guiding/?utm_source=pfg` | Not changed; needs Abby's agreement | Any time; it's one line in `web/lib/landing-content.ts` |

## Sources

- [talewatersandtides-marketing](https://github.com/sirgaladad/talewatersandtides-marketing) at `28925b6`: `README.md`, `CLAUDE.md`, `assets/css/site.css`, `assets/js/site.js`, `supabase/functions/intake/`, `scripts/check-site.mjs`, `.github/workflows/html-lint.yml`
- [pocket-fishing-guide](https://github.com/sirgaladad/pocket-fishing-guide) at `1bd306b`: `PROFILES-GUIDES-SPONSOR-SCOPING.md`, `web/lib/landing-content.ts`, `data/trout/river_sections.json`, `data/trout/access_points.json`, `data/swpa_generation.json`, `web/public/assets/imagery/`
- [Pocket Fishing Guide — White River below Bull Shoals Dam](https://pocketfishinguide.com/water/wb_white_river_bull_shoals_tailwater)
- [AGFC — Bull Shoals tailwater](https://www.agfc.com/fishing/where-to-fish/trout-waters/bull-shoals-tailwater/) (source cited by the PFG reach data)
- Strategy doc: [Tale Waters & Tides Guiding — Offer, Pricing & Website Plan](https://claude.ai/code/artifact/42396ae4-ef2c-4b74-8d07-3f8209fc73d7)
