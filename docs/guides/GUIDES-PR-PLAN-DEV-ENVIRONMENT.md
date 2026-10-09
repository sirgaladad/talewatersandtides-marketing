# TWT Guides — PR Plan and Dev Environment

Oct 9, 2026 · @Corey Boelkens

## Decision

Yes to Vercel + Supabase for the booking, comms and calendar, but not as a third stack: those pieces go into the Pocket Fishing Guide Next.js app, which already runs on Vercel + Supabase. The marketing site stays static on GitHub Pages. That split is the positioning made literal: Consult and the Guides story live on talewatersandtides.com; the Guide platform you are field-testing is PFG.

| Piece | Runs in | Why |
| --- | --- | --- |
| `/guiding/` hub, tailwater pages, bio, policies, river report form | talewatersandtides-marketing (static, GitHub Pages) | Already indexed, no build step, fast, cheap. Lead capture already works via the `intake` Edge Function. |
| Trip request, weekday calendar, booking, deposit | pocket-fishing-guide `web/` on Vercel | Guide Buddy tables, RLS pattern, Stripe plan and hardening gate already scoped there. Building it twice is the one thing to avoid. |
| Guide dashboard (requests, open days, packages, chicken boxes) | PFG `/guide/*` routes | Multi-guide from day one. Your account is guide #1. |
| SMS + email to anglers, go/no-go log | Supabase Edge Functions in the PFG project + Twilio + Resend | Server-side secrets, cron, webhook receipts and the audit trail in one database. |
| Calendar | Google Calendar API (your calendar) + `.ics` feed per guide | Writes trips to your phone calendar; anglers get an invite without OAuth. |
| Public URL | `guides.talewatersandtides.com` → Vercel domain alias on the PFG project, routes under `/guides/*` | Marketing links stay on your brand; the app stays in one codebase. |

What this rules out: a Vercel project for the marketing site (nothing to gain over Pages), a separate Supabase project for bookings (two auth systems, two RLS audits), and no-code booking tools such as FareHarbor or Calendly (no field test of your own platform).

Two trade-offs to accept:

1. Cross-domain hand-off. A visitor leaves talewatersandtides.com for guides.talewatersandtides.com at "Pick a weekday". Same brand lockup, same tokens, UTM carried, GA cross-domain measurement on both hosts. Treat it as one journey in analytics or the funnel reads as two.
2. PFG becomes load-bearing for money. The hardening gate in `docs/BUDDY-PLATFORM-GOLIVE-READINESS.md` (RLS verified, Stripe test mode end-to-end, webhook signatures, PII inventory, CI required) is the go-live condition for Booking mode. Request mode (no card) can ship before it.

## Architecture

&#91;embedded content: architecture · two hosts, two Supabase projects, five outside services\]

The angler never sees two systems: the static site hands off at "Pick a weekday" with the UTM parameters intact, and the PFG app finishes the request, the deposit and every message. The marketing Supabase project keeps doing what it does today (leads, river report) and stops receiving trip requests once PR 7 lands. Everything with a secret, a timer or a webhook lives in the PFG Supabase project, where RLS, cron and Vault already exist.

## Services and costs

Roughly $50 to $75 a month fixed before any trip is booked, most of it already being paid for PFG. Per-trip cost is Stripe's cut on the deposit plus a few cents of SMS.

| Service | Plan | Monthly | What it does here | Watch |
| --- | --- | --- | --- | --- |
| [Vercel](https://dev.to/nayankyada/vercel-pricing-2026-what-you-actually-pay-for-a-real-nextjs-project-33md) | Pro, 1 seat | $20 | Hosts PFG incl. `/guides/*`, preview deploy per PR, domain alias | Hobby forbids commercial use; a paid booking page needs Pro. 1 TB bandwidth and 1,000 GB-h functions included, far above need. |
| [Supabase](https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/) | Pro | $25 | Postgres, Auth, RLS, Edge Functions, cron, Storage for trip photos | Free tier pauses after 7 idle days, which would silently kill reminders. PFG is likely on Pro already; the marketing `intake` project can stay Free (one form, no cron). |
| Stripe + Connect | Pay as you go | $0 | Hosted Checkout for deposits, Connect Express for multi-guide payouts, card on file for no-show | 2.9% + 30¢ per card charge; Connect adds 0.25% + 25¢ per payout when a second guide joins. Test mode until the hardening gate passes. |
| [Twilio SMS](https://static0.twilio.com/docs/trust-hub/registrations/a2p-10dlc-brand.md) | A2P 10DLC, Sole Proprietor or Low-Volume Standard brand | \~$3 to $5 | Go/no-go texts, 48 h and morning-of reminders, STOP handling | $4.50 brand registration; Standard vetting $41.50 one-time if you register the LLC; campaign fee \~$1.50 to $2/mo; number \~$1.15/mo; \~$0.008/segment. Registration takes days to a few weeks: start it in week 1. |
| Resend | Free then $20 | $0 | Confirmation, invoice, trip story, calendar invite as `.ics` attachment | 3,000 emails/mo free covers a year of trips. Needs SPF/DKIM on `talewatersandtides.com`. |
| [Google Calendar API](https://developer.nylas.com/docs/dev-guide/provider-guides/google/google-verification-security-assessment-guide) | Free | $0 | Writes confirmed trips to your calendar, reads busy blocks to grey out days | `calendar.events` is a sensitive scope. For one guide (you) keep the OAuth app in Testing mode and skip verification. Verification, several weeks, only when a second guide connects their own calendar. |
| USGS + SWPA | Free | $0 | Already in PFG: flow, generation, water temp feed the weather rule | No change. |
| GitHub | Free | $0 | Pages for marketing, Actions for both repos | Pages is already live. |

Total new spend if PFG is already on Vercel Pro and Supabase Pro: about $5/month for Twilio until volume grows. If PFG is still on free tiers, the move to Pro ($45/month) is the real cost of this project and is justified by the pausing rule alone.

Not recommended now: Vercel Cron (Supabase `pg_cron` already runs PFG jobs), Vercel Postgres or KV (second database), Twilio Verify or a short code (overkill under 3,000 texts/day), Calendly/Cal.com embeds (bypasses the platform you are testing).

## PRs: talewatersandtides-marketing

Seven PRs, each one deployable on its own, in the order the funnel needs them. PR 1 exists as branch `feature/guiding-landing` (commit `92fd944`, unpushed) and needs the copy and data brought up to the current decisions before it opens. Titles follow the repo rule `[Type] Short description`; every PR branches from `main`, passes `htmlhint`, `scripts/check-site.mjs`, `scripts/check-guiding.mjs` and the Deno tests, and gets a human review before merge.

| # | Title | Scope | Acceptance |
| --- | --- | --- | --- |
| 1 | `[Feature] Guides hub page with trip request intake` | `guiding/index.html`, `assets/css/guiding.css`, `assets/js/guiding.js`, `data/guiding.json`, `supabase/functions/intake/trip.ts` + `lead.ts`, migration `leads_trip_source.sql`, `scripts/check-guiding.mjs`, CI step, `sitemap.xml`, `llms.txt`. Rewrite `guiding.json` to current decisions: Guides naming, year-round, three tailwaters, weekdays, tackle and bait, lunch options, $750/$1,250 Little Rock trips, cancellation policy, no shore lunch, no Buffalo, no fly. | Page passes all checks; a trip request lands in `leads` with `source='trip'` and the `trip` jsonb; Lighthouse mobile performance ≥ 90; `nav` shows Consult · Build · Guides; every PFG link carries the three UTM params. |
| 2 | `[Feature] River report subscribe route` | `source: 'subscribe'` branch in the `intake` function, `subscribe.ts` + tests, `leads.stage='river-report'`, double opt-in email via Resend, footer form on `/guiding/`. | A subscribe posts once, dedupes on email, sends the confirm mail; `check-site` still green. |
| 3 | `[Feature] Tailwater pages: White, Norfork, Beaver` | `guiding/white-river/`, `guiding/norfork/`, `guiding/beaver/` from one template + `data/tailwaters.json`; species rows, seasons strip, regs summary, PFG deep links (`/water/<id>?tab=tailwaters`); `FAQPage` + `TouristTrip` JSON-LD; sitemap entries. | Each page has one H1, a ≤ 60-char title, canonical, 3+ internal links; schema validates in the Rich Results test; Beaver page flags that PFG has no species or regulation rows yet rather than inventing them. |
| 4 | `[Feature] Guide bio and policies pages` | `guiding/corey/` (bio, credentials with "PADI Divemaster" wording verified, underwater photo strip), `guiding/policies/` (cancellation, weather rule, "I never got your text" rules, lunch), `Person` + `Service` JSON-LD. | Policies page is the single source linked from the booking flow in PFG; bio claims are ones you confirmed. |
| 5 | `[Fix] Performance: GTM deferral, font subset, CSS split` | Load GTM after consent or on first interaction, `font-display: swap` with subset woff2, move `guiding.css` to a per-page file, `fetchpriority="high"` on hero image, `loading="lazy"` on species plates. | Lighthouse mobile LCP < 2.5 s and performance ≥ 90 on `/` and `/guiding/`; GA events still fire. |
| 6 | `[Feature] Consult · Build · Guides home positioning` | Home hero rewritten to the three doors, nav order, footer, `llms.txt` summary, `Organization` JSON-LD with `sameAs` to PFG and GitHub. | Each door links to its hub; `llms.txt` describes all three in ≤ 120 words; no orphan pages in `check-site`. |
| 7 | `[Feature] guides subdomain hand-off` | `guides.talewatersandtides.com` CNAME to Vercel (DNS, not code); all "Pick a weekday" CTAs point to `https://guides.talewatersandtides.com/guides/corey/book?utm_…`; GA4 cross-domain linker config for both hosts. | Clicking through keeps one GA session; the alias serves PFG `/guides/*` over HTTPS. Merge after PFG PR D is live. |

Issue hygiene for the repo: one GitHub issue per PR with the acceptance list as checkboxes, label `guides`, milestone `Guides v1`. Add a `CODEOWNERS` line for `guiding/**` and `supabase/**` so PRs touching intake always request your review.

## PRs: pocket-fishing-guide (Guide platform)

Eight PRs, A to H. A through D ship Request mode (no card, no payout) and can go live as soon as `web-ci.yml` is green; E through H are gated by the hardening checklist in `docs/BUDDY-PLATFORM-GOLIVE-READINESS.md`. Every schema PR is a numbered migration under `supabase/migrations/`, RLS on from the first statement, with a Vitest file beside the lib code. Each PR deploys to a Vercel preview and, for schema PRs, a Supabase preview branch, so nothing touches production data until merge.

| # | Title | Scope | Acceptance |
| --- | --- | --- | --- |
| A | `[Schema] Guide Buddy core tables` | Migration `20261012000000_guide_buddy_core.sql`: `guides` (user-owned profile: waters\[\], species\[\], methods\[\], boat, credentials, base, stripe\_account\_id null), `guide_open_days` (guide\_id, day, status open/held/booked, source manual/calendar), `trip_packages` (guide\_id, slug, title, hours, price\_cents, max\_anglers, departure, lunch\_options jsonb, active), `booking_requests` (package\_id, day, party\_size, method, lunch, experience, contact, consent\_at, status requested/countered/confirmed/declined/cancelled, mode request/booking), `booking_events` (append-only log: who, what, channel, payload). RLS: guide reads own rows; angler reads by signed token; public reads active packages and open days only. Seed: Corey + 3 packages + weekday open days. | `supabase db reset` applies clean; cross-user RLS tests fail as expected; `generate_typescript_types` committed to `web/lib/db-types.ts`. |
| B | `[Feature] Public guide profile and package pages` | Routes `/guides`, `/guides/[slug]`, `/guides/[slug]/[package]`; server components reading via anon key; TW&T tokens as a theme on the `guides` layout; species and tailwater cards link to existing `/species` and `/water` routes (no UTM needed inside PFG); `Person` + `Service` + `Offer` JSON-LD. | Matches the Design canvas Guides and Trip boards; Lighthouse mobile ≥ 90; sitemap includes guide pages. |
| C | `[Feature] Trip request flow` | `/guides/[slug]/book`: Target → Water → Length → Weekday calendar (open days only, no weekends unless the guide opens one) → Party, method, lunch, experience → Review (weather rule, cancellation, consent checkbox) → Requested. Server action writes `booking_requests` + first `booking_events` row; Zod validation; rate limit by IP. | A request shows in the dashboard within one refresh; refusing consent blocks submit; a weekend day cannot be picked; e2e test in Playwright on the preview URL. |
| D | `[Feature] Guide dashboard` | `/guide/requests` (confirm, counter with another weekday, decline), `/guide/calendar` (open and close days, month view, Oct 2026 seed), `/guide/packages` (edit price, hours, lunch options), `/guide/lunch` (chicken boxes to order for confirmed trips). Auth via existing Supabase Auth; guide row must match `auth.uid()`. | Every state change writes `booking_events`; counter-offer sends a new day to the angler; no route renders another guide's data. |
| E | `[Feature] Angler comms: SMS and email with delivery log` | Edge Functions `booking-notify` (on insert/update via DB webhook), `booking-reminders` (pg\_cron 7:00 CT: 48 h and morning-of), `twilio-status` (delivery receipts webhook, signature verified), `twilio-inbound` (STOP, YES, replies logged). Resend for email with `.ics` attachment. Every send and receipt is a `booking_events` row with provider id and status. Default when nothing is heard: trip runs as booked, stated in every message. | A confirmed booking produces both SMS and email within 60 s in preview; a failed delivery shows in the dashboard as `undelivered` with a retry; STOP sets `sms_opt_out` and email continues. |
| F | `[Feature] Google Calendar sync and ICS feed` | Edge Function `calendar-sync`: on confirm, insert an event on the guide's Google Calendar (OAuth refresh token stored encrypted in Vault, Testing-mode app for guide #1); on cancel, delete; nightly read of busy blocks marks `guide_open_days.status='held'` (source calendar). Public `/guides/[slug]/calendar.ics` for the guide's confirmed trips, token-protected. | Confirm in dashboard → event on your phone within a minute; a block you add on your phone greys the day on the public calendar by morning; `.ics` validates. |
| G | `[Feature] Booking mode: Stripe deposit and card on file` | Hosted Checkout for the 50% deposit with `setup_future_usage` so the no-show charge is possible; `stripe-webhook` function verifies signature and flips `status='confirmed'` on `checkout.session.completed`; refund and credit paths per the policy table; Connect Express onboarding link on `/guide/settings` for guide #2 onward. No card data in the DB, only Stripe ids. | Test-mode end to end: deposit, refund 14+ days, credit 3 to 14 days, no-show charge; webhook replay is idempotent; hardening checklist items ticked in the PR body. |
| H | `[Feature] Reviews and trip story` | After `trip_date + 2 days`, email asks for a review; `guide_reviews` table (angler token, 1 to 5, text, photos via Storage); trip story page per booking with photos you upload from the dashboard; reviews render on the public profile. | A review posts once per booking; photos are resized through `sharp`; story page is `noindex` until the angler opts in. |

Sequencing and the branch rule: A → B → C → D can be opened the same week and stacked (each branched off the previous), merged in order. E and F are independent of each other after D. G waits for the hardening gate. H is last and optional for the first season. Marketing PR 7 (the subdomain hand-off) merges only after D is in production.

Test and quality interlocks per PR: `web-ci.yml` (eslint, `tsc`, Vitest), `data-validate.yml` where seeds change, a Supabase preview branch for A, E, F, G with `supabase db lint`, and a Playwright smoke run against the Vercel preview URL added as a required check from PR C on. Secrets never in the repo: `supabase secrets set` for function keys, Vercel project env for `NEXT_PUBLIC_*` and server keys, one `.env.example` per side kept in sync by a CI diff.

## PR 1 description, ready to paste

Title: `[Feature] Guides hub page with trip request intake`. Branch `feature/guiding-landing` → `main`. Paste the block below into the PR body; the checkboxes are the acceptance list from the table above.

```markdown
## What

Adds the Tale Waters & Tides · Guides hub at `/guiding/` with a trip request form that posts to the existing `intake` Edge Function as `source: 'trip'`.

- `guiding/index.html` — hub: hero, three tailwaters (White, Norfork, Beaver) with live-condition rows linking to PFG, species strip, trips (river departures and Little Rock departures), approach, bio, lunch options, policies summary, river report form, footer Consult · Build · Guides
- `assets/css/guiding.css`, `assets/js/guiding.js` — page styles on `site.css` tokens; trip form wiring through `window.TWT.intake`, UTM carried on every PFG link
- `data/guiding.json` — packages, departures, lunch options, policy text (single source for the page and the function)
- `supabase/functions/intake/trip.ts`, `lead.ts` — validates package, weekday-only date, party size, lunch choice; writes `leads` with `source='trip'`, `stage=<package>`, `kickoff=<date>`, `trip` jsonb
- `supabase/migrations/20261009000000_leads_trip_source.sql` — `trip` jsonb column and `source` check
- `scripts/check-guiding.mjs` + `html-lint.yml` step — asserts packages in JSON, page and function agree
- `sitemap.xml`, `llms.txt`, `lab/index.html` — entries for the new page

## Why

First door of the Guides story: a real guide service run on the platform we build (PFG). Request mode only; no card, no payout. Booking, calendar and comms land in pocket-fishing-guide (see PR plan doc).

## Decisions reflected

No fly fishing. No Buffalo River guiding (White near the confluence only). No Little Red. Year-round, weekdays, full day default. Tackle and bait. Trout first, walleye and smallmouth when they are in. No cooked shore lunch: cold fried chicken box, pre-order local, or bring your own. Weather rule and cancellation policy as published.

## Checks

- [ ] `npm run lint` (htmlhint) green
- [ ] `node scripts/check-site.mjs` and `node scripts/check-guiding.mjs` green
- [ ] `deno test supabase/functions` green (18 tests)
- [ ] Trip request from the preview lands in `leads` with `source='trip'`
- [ ] Lighthouse mobile performance ≥ 90 on `/guiding/`
- [ ] Every PFG link carries `utm_source=twt&utm_medium=referral&utm_campaign=guiding`
- [ ] Migration applied to project `feldynpqhzvstpssztra` after merge (`supabase db push`)

## Not in this PR

River report subscribe route (PR 2), tailwater pages (PR 3), bio and policies pages (PR 4), subdomain hand-off (PR 7).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_016XccWDj8cqMjHuwhHnQKw6
```

Before opening it, the branch needs one more commit: `data/guiding.json` and the page copy still carry the earlier shore-lunch packages and the $400/$550/$600 and $650/$1,100 prices. Bring them to the current offer first so reviewers see one story.

## Dev prep

Four weeks to Request mode live on the subdomain, with Booking mode behind the gate. Week numbers assume evenings and one weekday block; the long poles are Twilio registration and the Google OAuth consent screen, so both start on day one.

### Accounts and registrations (day 1, in parallel with code)

- [ ] Twilio: buy a local 501 number, create the A2P 10DLC brand (Sole Proprietor on your own name now; re-register as Low-Volume Standard with the EIN if you form the LLC), one campaign "Trip confirmations and reminders" with sample messages and the STOP line
- [ ] Resend: add `talewatersandtides.com`, publish SPF and DKIM, sending address `trips@`
- [ ] Stripe: account in test mode, enable Connect (Express), one product per package, webhook endpoint for the preview URL
- [ ] Google Cloud: project `twt-guides`, Calendar API on, OAuth client (web), consent screen in Testing with your Google account as test user, scope `calendar.events` only
- [ ] Vercel: confirm PFG is on Pro; add `guides.talewatersandtides.com` to the project (CNAME at your DNS host); preview deployments on for PRs
- [ ] Supabase: confirm PFG project `wokyutorqkhoqocglnte` is on Pro; enable preview branching on the repo; marketing project `feldynpqhzvstpssztra` stays Free
- [ ] GitHub: grant this session write access to both repos when you want the branches pushed and PRs opened; add `CODEOWNERS`; protect `main` with required checks

### Secrets (never in git)

| Where | Keys |
| --- | --- |
| Supabase Edge Functions (`supabase secrets set`) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`, `TWILIO_WEBHOOK_SECRET`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GUIDES_ICS_SIGNING_KEY` |
| Supabase Vault | Google refresh token per guide, Stripe Connect account ids |
| Vercel project env (Preview and Production separately) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_GA_ID` |
| GitHub Actions | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` for `deploy-functions.yml` and migrations; `VERCEL_TOKEN` only if Playwright needs to find the preview URL |

### Environments

1. Local: `supabase start` + `npm run dev` in `web/`; Stripe CLI `stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook`; Twilio and Resend in sandbox or dry-run flag `COMMS_DRY_RUN=1` that writes `booking_events` without sending.
2. Preview: every PR gets a Vercel preview and, for schema PRs, a Supabase preview branch seeded with Corey + packages. Twilio sends only to a verified allow-list of your own numbers. Stripe test keys.
3. Production: `main` deploys to Vercel; migrations applied by `deploy-functions.yml` on merge after a manual approval environment in Actions. Live Stripe keys only after the hardening gate.

### CI additions

- `web-ci.yml`: add `npx playwright test` against the preview URL, required from PR C
- New `supabase-lint.yml`: `supabase db lint` and a cross-user RLS test SQL on every migration PR
- New `env-sync.yml`: fails if `.env.example` keys and the Vercel env list diverge
- Marketing `html-lint.yml`: already runs `check-guiding.mjs`; add a Lighthouse CI step with a mobile performance budget of 90 on `/` and `/guiding/`
- Dependabot or Renovate weekly on both repos, grouped minor updates

### Timeline

| Week | Marketing repo | PFG repo | Outside |
| --- | --- | --- | --- |
| 1 (Oct 12) | PR 1 updated and opened, PR 2 | A, B opened | Twilio brand, Resend DNS, Google consent screen, Stripe test |
| 2 (Oct 19) | PR 3, PR 4 | C, D; Request mode on preview | Playwright smoke; Twilio campaign approval lands |
| 3 (Oct 26) | PR 5, PR 6 | E, F | DNS for `guides.` subdomain; first real request from a friend |
| 4 (Nov 2) | PR 7 (hand-off) | G in test mode; hardening checklist walk | Commercial auto and boat insurer notice; AGFC guide license in hand |
| 5+ | Content: tailwater seasonal updates | H; flip Stripe live when gate passes | First paid weekday |

### Risks and the mitigation already in the plan

- Twilio registration slips: email is the system of record and runs from week 2; SMS joins when approved.
- Google verification needed sooner than planned: `.ics` feed and email invites cover anglers; only your own calendar needs OAuth and Testing mode allows that.
- Vercel Hobby terms: confirm Pro before the booking page goes public.
- Supabase Free pausing: Pro on the PFG project before any cron reminder depends on it.
- Two codebases drift: `data/guiding.json` prices and `trip_packages` rows must match; add a nightly check that fetches the public packages endpoint and diffs it against the JSON.
