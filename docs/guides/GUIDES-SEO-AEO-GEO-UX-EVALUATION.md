# TWT Guiding — SEO, AEO/GEO and UX Evaluation

Oct 9, 2026 · @Corey Boelkens

## Verdict

The built page passes the basics (Lighthouse SEO 100, accessibility 96, desktop performance 97) but it is one long page on a domain that Google and the answer engines currently understand as an AI-consulting firm. The three things that matter most, in order:

1. **Position, not split.** The site has three things going on: AI implementation for businesses, Pocket Fishing Guide, and now a guide service. Treated as unrelated, guiding dilutes the consulting brand. Treated as one story it is the proof: *I consult on this, I built this, and I'm field-testing the guide platform by guiding.* Make that the site's spine: home gets three doors (Consult · Build · Guides), `/lab/` becomes Build, `/guiding/` becomes Tale Waters & Tides Guides, and every guiding page says in one line why a consultant is in a jon boat. One `Organization` entity with three services, not two brands sharing a domain.
2. **Mobile speed.** Mobile performance is 74. Google Tag Manager blocks the main thread for 770 ms and the three CSS files plus Google Fonts block first paint for about 1.2 s. On a 4G phone at a boat ramp that is the difference between a request and a bounce.
3. **The ask is too long.** The request form has 11 fields on one screen. The mockup's five-step flow is the better pattern; it should replace the form, not sit beside it.

What is already strong: one source of truth for prices with a CI check, no fly-fishing drift, a stated weather and cancellation policy, species and tailwater deep links into Pocket Fishing Guide with UTM tags, and real PFG data behind the seasons strip.

## Position

The spine, in the words the site should use:

| Door | Page | The claim | The proof |
| --- | --- | --- | --- |
| Consult | `/` | "Here's what I can do for your business" | 90-day engagements, the readiness check, the client work |
| Build | `/lab/` | "Here's what I'm building" | Pocket Fishing Guide: 57 waters, live data, the Guide platform |
| Guides | `/guiding/` | "Here's me testing it on real water" | Licensed trips on three tailwaters, booked through the platform I'm building |

What this changes:

- **Home** adds a third door and a one-line version of the spine under the hero: "AI for your business. A fishing app I built. A guide service that tests it." Proof sections link to all three.
- **The guiding hub** gets one honest paragraph in the "Your guide" section: you grew up in a guide's boat, you built PFG, and the booking flow clients use is the Guide platform being tested in the real world. Clients like being early; say so.
- **The river report** doubles as a build-in-public log. Sunday email: conditions and open days for anglers, one line of "what we changed in the platform this week" for the people who follow the build. Same list, two reasons to stay subscribed.
- **Entity.** One `Organization` for Tale Waters & Tides with `knowsAbout` (AI implementation, marketing technology, fishing intelligence, guided fishing) and three `Service` nodes under `hasOfferCatalog`. Guiding's `LocalBusiness` node points at it with `parentOrganization`. The `llms.txt` opening sentence becomes: "Tale Waters & Tides is an Arkansas innovation lab led by Corey Boelkens: AI implementation for businesses, Pocket Fishing Guide, and a licensed guide service on the White, Norfork and Beaver tailwaters that field-tests the Guide platform."
- **Nav.** Guiding pages keep their own nav, but the brand lockup reads "Tale Waters & Tides · Guides" and the footer carries the three doors. Consulting pages get "Guides" in the footer and a line in the proof section.
- **Case study, later.** Six months of guiding through the platform is a consulting case study ("I ran a service business on the system I built, here's what broke"). Plan the metrics now: requests, confirmations, reply time, no-shows, weather calls.

The taxonomy and keyword sections below still hold; the only change is that guiding is a pillar of one entity, not a tenant.

## Taxonomy

Today guiding is one URL, `/guiding/`, with every topic as an anchor. That is fine for launch week and wrong for search: a single page can rank for one thing, and "White River fishing guide," "Norfork fishing guide" and "fishing trips from Little Rock" are three different searches with three different people behind them.

&#91;embedded content: recommended taxonomy · hub, three water pages, four support pages\]

The hub keeps the booking flow and the river report; each water page owns its own title, its own PFG conditions panel, its own meeting points and its own regulation table. Support pages exist only when they answer a search on their own.

URL and page rules:

- One search intent per URL. The hub answers "guided fishing on the White system"; `/guiding/white-river/` answers "White River fishing guide."
- Water slugs match people's words, not PFG ids: `white-river`, `norfork`, `beaver`. The PFG id lives in the link out, not the path.
- No species pages on TWT. `/guiding/fish/` is one page; the deep species content is PFG's job, and the links already send people there.
- No `/guiding/half-day/`-style trip pages. Trips are products inside a water page, not destinations.
- Breadcrumbs on every guiding page (`Home › Guided fishing › Norfork`) with `BreadcrumbList` schema, so the hub inherits from its leaves.
- Guiding gets its own nav (Waters · Trips · From Little Rock · Fish · Book). The AI-services nav stays off these pages; the footer carries the three doors (Consult · Build · Guides) on every page. The section is named "Tale Waters & Tides Guides": it fits one guide today and the platform when others join.
- Add guiding to `sitemap.xml` with its own `lastmod`, and a second section in `llms.txt` describing it as a service with its own facts.

## Page flow

The built page is a brochure with a form at the bottom; the mockup is a product with a flow. Ship the mockup's flow.

| Stage | As built (`/guiding/`) | Leak | Fix |
| --- | --- | --- | --- |
| Land | Hero, two buttons, a conditions card | Conditions card competes with the headline; the first screen on a phone is all card | Phone: conditions collapse to one line ("Bull Shoals GO 78 · 54°F") under the lede; tap expands |
| Learn | 11 sections, 2,500 px on desktop, \~6,000 px on a phone | Trips are the fourth section; a visitor scrolls past waters, seasons and fish before seeing a price | Trips second, right after the hero. Waters and fish after. Cut to 7 sections |
| Evaluate | FAQ at the bottom; policies spread across three sections | The two questions that decide a booking (weather, cancel) are 5,000 px down | One "Policies" block directly above the book button, four lines, nothing else |
| Schedule | Native date input; weekends and booked days not visible | Visitors pick a Saturday, you counter, two days lost | The mockup's calendar: weekdays open, weekends "by request", booked days grey |
| Request | 11-field form | Long forms on phones lose half their starters by field 6 | Five steps, one question each, progress bar, total always visible |
| Confirm | Inline status text | No next step, no license nudge, no report signup | Confirmation screen: what happens next, AGFC button, "get the weekday report" |
| Return | None | Nothing brings a browser back | River report email; `?trip=` deep links so an email can open the flow pre-filled |

Two flow rules worth writing down:

- **The book button is on every screen, in the same place.** Desktop: top right of the nav. Phone: a sticky bar at the bottom with the price and "Pick a weekday." The built page has it in the nav only, which scrolls away on phones.
- **Nothing external before the ask.** The PFG links are good, but on the phone they open a new tab the visitor may not come back from. Keep them below the trips and off the booking flow's first two steps (the flow's water arrows are fine on step one only because the water is already chosen by default).

## SEO

Measured on the built branch page with Lighthouse 12, headless Chromium, local server (so real-world numbers will be a little worse on performance and the same elsewhere):

|  | Mobile | Desktop | What drives it |
| --- | --- | --- | --- |
| Performance | **74** | 97 | GTM blocks the main thread 770 ms; fonts + 3 CSS files render-block \~1.2 s; LCP 2.3 s mobile |
| Accessibility | 96 | 96 | One contrast failure: `.light .eyebrow` (gold-ink `#8a6a1f` on cream `#f5f0e8`) is \~4.4:1 at 12 px; needs 4.5 |
| Best practices | 100 | 100 | — |
| SEO | 100 | 100 | Title, description, canonical, one H1, alt text, JSON-LD all present |

A 100 SEO score means the page is crawlable, not that it will rank. The ranking problems are structural:

- **Domain topic.** The home page title is "AI Implementation, Little Rock AR." `llms.txt` opens with "AI implementation practice." The `Organization` schema says the same. Guiding has no entity of its own. `Fix: a LocalBusiness node (type LocalBusiness plus SportsActivityLocation) for` "Tale Waters & Tides Guided Fishing" with `areaServed` naming the three tailwaters, `parentOrganization` pointing at the existing org, and the Google Business Profile category "Fishing guide service."
- **One page, many intents.** See Taxonomy. The water pages are where "white river fishing guide" and "norfork fishing guide" get answered; the hub cannot rank for both.
- **Title and H1.** "White River Guided Trout Trips | Tale Waters and Tides" is fine for the hub. The H1 "Guided fishing on the White." is short and right; the earlier "Where two rivers meet" was a poem, not a query. Keep H1s literal on every guiding page.
- **Internal links.** The hub is linked from `/lab/` and the footer only. Add it to `/corey/` (a guiding paragraph with a link) and to the home page's proof section, and link every water page from the hub and from each other.
- **Local.** No NAP on the guiding page. Add "Little Rock, Arkansas · boat at Mountain Home" with the business name and a phone number (a Google Voice number is fine) in the footer of every guiding page, matching the Google Business Profile exactly.
- **Images.** The built page has no real photos; the mockup's species plates and underwater stage are PNG/WebP from PFG. Serve WebP, size them (`width`/`height` attributes), lazy-load below the fold, and give each a filename and alt that names the water or fish.
- **Performance fixes, in order of payoff:** load GTM after first interaction or with `defer` and a 3 s timeout; preload the two font files you use most and drop unused weights (you load 6 weights of DM Sans and Fraunces); inline the \~2 KB of critical CSS and load `site.css` async; add `Cache-Control` headers via a `_headers` file isn't possible on GitHub Pages, so version the CSS filename (site.v3.css) to get long caching safely.

Keyword map (search volumes could not be pulled: Ahrefs keyword metrics are not on the current plan; these are the intents to target, confirm volumes in Google Search Console after 60 days):

| Page | Primary query | Secondary |
| --- | --- | --- |
| `/guiding/` | guided fishing white river arkansas | arkansas trout fishing guide, fishing guide mountain home ar |
| `/guiding/white-river/` | white river fishing guide | bull shoals tailwater fishing, cotter arkansas fishing guide |
| `/guiding/norfork/` | norfork river fishing guide | norfork tailwater trout |
| `/guiding/beaver/` | beaver tailwater fishing | beaver dam trout fishing guide |
| `/guiding/from-little-rock/` | fishing trips from little rock | little rock fishing guide, day trip from little rock fishing |
| `/guiding/fish/` | white river brown trout | arkansas trout regulations white river |

## AEO / GEO

Answer engines (Google AI Overviews, ChatGPT, Perplexity, Claude) pick sources that state facts plainly, consistently and with provenance. The guiding section is halfway there: prices and policies live in one data file, the PFG links carry real data, and `llms.txt` exists. What's missing:

- **A clear entity.** Today the answer to "who is Tale Waters & Tides" is "an AI implementation practice." An engine asked "fishing guides on the White River near Mountain Home" has nothing to attach the guiding service to. The `LocalBusiness` schema above plus a one-paragraph `llms.txt` entry ("Tale Waters & Tides Guided Fishing is a licensed guide service on the White, Norfork and Beaver tailwaters in Arkansas, run by Corey Boelkens, based in Little Rock, boat at Mountain Home, trips year-round on weekdays, prices from $400") is the fix. Same sentence on the hub page, verbatim.
- **Answer-first paragraphs.** Each section should open with the sentence an engine would quote: "A full day on the White River with Tale Waters & Tides is $550 for one or two anglers and includes the boat, tackle, bait and lunch." The mockup's short titles help; the paragraph under each title should be the quotable fact, not a mood.
- **`FAQPage` schema** on the FAQ block, with the questions people actually ask: cost, what's included, license, weather, cancellation, kids, fly fishing (answer: no), Buffalo River (answer: no). Engines lift these directly.
- **Consistency across surfaces.** Prices, trip lengths and the no-fly rule must match on the site, the PFG guide card, the Google Business Profile, any marketplace listing and the river report email. The CI parity check covers the site; add a line to the launch checklist to re-copy the same facts everywhere else.
- **Citations outward.** Link AGFC for regulations and records, SWPA for generation, PFG for conditions, each once, with the claim beside the link. Engines trust pages that show their sources, and PFG citing back to the guiding page closes the loop.
- **Dated facts.** Put "Prices and rules as of October 2026" near the price table and bump the date when the JSON changes. Stale-looking pages lose to fresh ones in AI answers.
- **Keep `llms.txt` honest.** It currently says Prompt Play is the most useful resource on the site. Add a guiding section and keep each entry to two sentences of facts with a link.

What not to do: no hidden text, no stuffing "White River fishing guide" into every heading, no AI-generated filler articles. Three water pages with real reach notes, real photos and your own words will beat a hundred thin posts.

## UX critique

Reviewed as a demanding first-time visitor on a 390 px phone, then on a 1280 px laptop, against the built page and the mockup.

**Mobile**

| Problem | Why it costs bookings | Fix |
| --- | --- | --- |
| The first screen is a headline plus a dense conditions card; the price is three screens down | A phone visitor decides in one screen whether this is for them; "from $400, weekdays, year-round" is the decision | Hero: headline, one line of lede, price-from, one button. Conditions become one tappable line |
| No persistent call to action | The nav scrolls away; after the hero the only buttons are inside trip cards | Sticky bottom bar: "From $400 · Pick a weekday" on every guiding page, hidden only while the flow is open |
| 11-field form, native date picker, no availability | Native pickers let people choose a booked Saturday; long forms lose starters | Replace with the five-step flow; calendar shows open weekdays |
| Trust strip shows credentials that aren't true yet | Hidden by CI today, but when shown it's a line of mono text that reads like a disclaimer | Three badges with icons: Licensed, Insured, First Aid. Show nothing until true |
| Species band is tall (five 150 px plates) and sits before the trips | Pretty, but it pushes the product down \~900 px on a phone | Horizontal scroll row of five plates at 96 px; trips move above it |
| Two toggles (Meet at river / From Little Rock) rebuild the whole trip list | Switching feels like a different page; people miss that it's a filter | Show all six trips in one list with a "From Little Rock" tag on three; or keep the toggle and label it "Where do you start?" |
| External PFG links open new tabs mid-decision | On iOS the visitor may not find the way back | Keep PFG links below the trips and off flow steps 2–5 |
| Weather and cancellation live in three places | Repetition reads as nervousness | One policies block above the book button; the review step repeats it once |

**Desktop**

| Problem | Why | Fix |
| --- | --- | --- |
| Nav is 6 links plus a button; the brand lockup is two type styles | Fine, but "River report" in the nav competes with "Pick a weekday" | Move River report to the footer and the confirmation screen; nav = Waters · Trips · From Little Rock · Fish · FAQ · Book |
| The hero's two-column split puts the conditions card at the same weight as the headline | The eye lands on the card's big "GO 78" before the offer | Shrink the card to a single-row strip under the hero, full width, three dams side by side |
| Eleven sections in a row of equal weight | Nothing is clearly primary; a laptop visitor scrolls 2,500 px | Order: hero → trips → how it works → waters → fish → you → lunch → policies/FAQ → report → book. Cut the "Why weekdays" section into one line under the trips |
| Same button label six times ("Pick a weekday") | Repetition dilutes it | Hero and sticky bar say "Pick a weekday"; trip cards say "Book this trip"; everything else is a text link |
| Species page tabs reset scroll and the hero image is 340 px tall | Tabs feel like page loads | Keep tabs, animate the plate swap, cap the stage at 280 px |
| Guides directory shows two placeholder guides | Honest in a mockup, odd on a live site | Ship the directory only when a second guide is real; until then `/guiding/` is the profile |

**What's right and should stay:** the five-step flow with a visible total; weekdays-open calendar; the lunch choice with cost shown; the one-sentence weather rule at review; PFG deep links with UTM; the request-vs-booking mode switch; literal H1s.

**Accessibility:** fix the eyebrow contrast on cream sections (darken `--gold-ink` to `#7a5c17` or lift eyebrows to 13 px). All interactive elements are real buttons and links. Add `aria-current` to the active flow step and announce step changes with a live region.

## Backlog

Ordered by what moves bookings per hour of work. P0 before the page is public; P1 within the first month; P2 when a second water page earns it.

| P | Item | Effort | Measure |
| --- | --- | --- | --- |
| 0 | Replace the 11-field form with the five-step flow (phone-first, sticky price bar, open-weekday calendar) | 1 day | Form starts → completes ≥ 40% |
| 0 | Reorder the hub: hero → trips → how it works; conditions collapse to one line on phones | 2 h | Scroll depth to first price < 1 screen on mobile |
| 0 | `LocalBusiness` + `FAQPage` schema; guiding entry in `llms.txt`; NAP in the guiding footer | 2 h | Rich Results test passes; GBP shows the site link |
| 0 | Defer GTM; preload fonts, drop to 2 weights each; inline critical CSS | 3 h | Lighthouse mobile performance ≥ 90 |
| 0 | Fix `.light .eyebrow` contrast | 10 min | Accessibility 100 |
| 0 | Google Business Profile, category Fishing guide service, booking link to `/guiding/` | 1 h, then verification wait | Profile live before first ad spend |
| 1 | Three water pages with their own title, PFG panel, meeting points, regs table; breadcrumbs | 1 day | Each page indexed; GSC impressions for its primary query |
| 1 | `/guiding/from-little-rock/` once commercial auto is in place | 3 h | Impressions for "fishing trips from little rock" |
| 1 | River report signup (`source: subscribe` in intake) and the Sunday email | 4 h + weekly | Signups per 100 visitors ≥ 3 |
| 1 | Real photos: hero, each water, you on the boat; alt text naming the water | your time | LCP image is yours, not a gradient |
| 1 | Nav trim; one book label per context; policies block above the book button | 2 h | Clicks on book CTA per visit |
| 2 | Guides directory, only when guide #2 exists | 1 day | — |
| 2 | Underwater video on the Species page (PFG has smallmouth and walleye clips) | 2 h | Time on page; keep under 1 MB each |
| 2 | Version CSS filenames for long caching | 30 min | Repeat-visit load time |

Two things to measure from day one so the next review is numbers, not opinions: the funnel (landing → trips in view → flow step 1 → step 5 → sent) as GA events, and Search Console impressions per guiding URL.

## Method and sources

- Lighthouse 12.x, headless Chromium, local `http.server` on branch `feature/guiding-landing` at commit `92fd944`; mobile preset (Moto G Power emulation, slow 4G) and desktop preset. Numbers are from one run each; expect ±5 on performance.
- UX review against the built `guiding/index.html` and the six-artboard mockup ([TWT Guiding — Booking Flow Mockup](https://claude.ai/artifact/SqtkHNABW13VptDn96uxzF)).
- Keyword volumes: not available. The Ahrefs keyword and domain-rating endpoints returned "insufficient plan" on this account; the keyword map is intent-based and should be confirmed in Google Search Console once the pages have 60 days of impressions.
- Site facts from the `talewatersandtides-marketing` repo at `28925b6`: `README.md`, `llms.txt`, `sitemap.xml`, `index.html` head, `assets/css/site.css`.
- Schema guidance: [Google Search Central, LocalBusiness](https://developers.google.com/search/docs/appearance/structured-data/local-business) and [FAQPage](https://developers.google.com/search/docs/appearance/structured-data/faqpage).
- Related docs: [Offer, Pricing & Website Plan](https://claude.ai/code/artifact/42396ae4-ef2c-4b74-8d07-3f8209fc73d7), [Build Spec and Today's Plan](https://claude.ai/code/artifact/475110bc-634e-4c6f-b02d-3f06cb193331).
