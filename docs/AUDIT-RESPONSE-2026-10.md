# Public Identity Audit Response — October 2026

> Scoping document for the response to the October 2026 external audit of talewatersandtides.com (SEO, AEO, GEO). Tracking epic: [#82](https://github.com/sirgaladad/talewatersandtides-marketing/issues/82). Owner: @sirgaladad. Author: Claude (scoping step of the co-development process).

---

## 1. What the audit said

The audit reviewed the live homepage, `/corey/`, `/lab/`, `/projects/`, `/events/`, `/readiness/`, `robots.txt`, `sitemap.xml` and page source. Its headline: the technical foundation is sound, the public identity needs tightening, and the consulting services are less discoverable and less credible than the lab projects.

| Area | Audit assessment                                                    | Our reading                                                                                                               |
| ---- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| SEO  | Good foundation, limited service depth                              | Agree. `check-site.mjs` already enforces the basics; the gap is pages, not tags.                                          |
| AEO  | Strong start; add cost, fit, tools, measurement answers             | Agree. The FAQ and 90-day plan are the right shape; the missing answers belong on service pages.                          |
| GEO  | Credibility needs cleanup; conflicting descriptions across channels | Agree, with one caveat: this is a transition still propagating through search and social profiles, not an indexing fault. |

The audit's closing point matches Google's own documentation: AI Overviews and AI Mode have no requirements beyond ordinary Search eligibility and helpful content. No "GEO" product is needed.

---

## 2. Claims verified against the repository

Every claim was checked against `main` at `2007cb5` on 2026-10-08. The live site could not be fetched from the agent container (egress blocked), so "live" statements rely on the audit plus the fact that `main` deploys automatically.

| #   | Claim                                                                                                     | Result             | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | --------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | A GTM container ID is passed to gtag.js                                                                   | Confirmed          | `GTM-TZVTR5TG` in the loader URL and in `gtag('config', …)` on 12 of the 18 HTML pages. `/projects/quest/` and `/projects/pfg-intelligence/` have no analytics snippet at all; the other four without one are the `noindex` or redirect pages. History: `G-NT708SKWZL` was the direct GA4 ID until 2026-03-18, when `17a1348` switched the loader to the GTM container and `5cb2786` removed the hard-coded config on purpose ("all analytics flow exclusively through GTM-TZVTR5TG, which already manages G-929WWD4EZ4"). `d0152bf` later re-added a `gtag('config', …)` call using the container ID, which is the malformed line now on every tagged page. |
| 2   | Site says Corey is currently at Allant Group                                                              | Confirmed          | `index.html` FAQ, About, JSON-LD; `corey/index.html` at-a-glance, results, timeline ("Dec 2025 – present"); `llms.txt`. Source per CHANGELOG: the June 2026 resume. Accuracy cannot be verified from the repo.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 3   | Dates for Tale Waters & Tides (Aug 2022) and Acoustic (Apr 2021 – Aug 2022) conflict with Corey's history | Cannot verify      | Only the owner can settle this. RaftUp (Jun 2017 – Dec 2021) also overlaps Acoustic.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 4   | Organization `sameAs` includes personal LinkedIn, TikTok, GitHub                                          | Confirmed          | `index.html` JSON-LD. The Person entity on `/corey/` already carries the same three links.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 5   | `/events/` shows June and September events as UPCOMING and LIVE NOW                                       | Confirmed          | `events/index.html` lines 170 and 181. `/prompt-play/` still has a booking link for June 9.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 6   | Competitive dashboard is indexable                                                                        | Confirmed          | `competitive-dashboard.html` at the site root, no `noindex`, no robots rule, served by the Pages deploy of `.`. 22 draft PRs from a scheduled routine (#54–#76) target it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 7   | Three services share one homepage                                                                         | Confirmed          | One "What you can hire me for" section with three offers; no service pages.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 8   | Result numbers lack context                                                                               | Confirmed          | Track-record strip on `/` gives numbers without role, baseline or period.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 9   | Search still shows the older lab homepage; LinkedIn says AI studio                                        | Not checkable here | Plausible: the services-first rebuild merged 2026-10-07 (PR #78).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

Additional findings while checking:

- `CLAUDE.md` references `.github/TRIAGE.md`, which does not exist, and still describes the company as an outdoor recreation innovation lab.
- Labels `green-team`, `design`, `P0`, `P2`, `P3` listed in `CLAUDE.md` or used by issue templates do not exist in the repo.
- `CONTRIBUTING.md` and `CLAUDE.md` give different commit and PR title conventions.

---

## 3. On the analytics finding specifically

Research (October 2026):

- Google's Tag Manager release note of 2026-07-09 ("Updates to container behavior for unsupported installation paths") says that a `GTM-` container loaded through `/gtag/js` now runs as a full container; before that date it ran in a restricted mode. So the container probably loads today.
- `gtag('config', 'GTM-…')` is not a valid command. It does nothing.
- The site's custom events are `gtag('event', …)` calls that push `arguments` objects onto `window.dataLayer`. Whether a GA4 tag inside the container forwards them is unverified and must be checked in Tag Assistant and GA4 DebugView.

Conclusion: the audit is right that collection is unconfirmed. The owner's intent in March was GTM-first with GA4 property `G-929WWD4EZ4` inside the container; `G-NT708SKWZL` is the older, superseded property and must not simply be restored, or new data lands in the wrong property. The decision in [#85](https://github.com/sirgaladad/talewatersandtides-marketing/issues/85) starts with confirming in GA4 admin which property is used for reporting and its current measurement ID.

---

## 4. Decisions needed from the owner

| Decision                          | Options                                                                                                                                                                                                      | Blocks                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| Analytics install path            | First confirm the reporting GA4 property (expected `G-929WWD4EZ4`). Then A: gtag.js with that ID directly. B: official GTM snippet with the GA4 tag inside the container, custom events verified in preview. | #85                                     |
| Career dates and current role     | Confirm or correct each row in #86                                                                                                                                                                           | #86, then any copy on `/` and `/corey/` |
| Competitive dashboard             | A: public with `noindex` (in PR #81, not yet merged or deployed). B: move to a private repo or doc. C: keep in repo, exclude from deploy.                                                                    | #83                                     |
| Service pages                     | A: three pages. B: one `/services/` page.                                                                                                                                                                    | #87                                     |
| Case-study candidates and numbers | Which two or three, and the verified figures                                                                                                                                                                 | #88                                     |

---

## 5. Slices and sequencing

| Order | Slice                                                                         | Issue  | Type             | Who                                             | Status        |
| ----- | ----------------------------------------------------------------------------- | ------ | ---------------- | ----------------------------------------------- | ------------- |
| 0     | Archive events on `/events/`, split `sameAs`, `noindex` dashboard, `llms.txt` | PR #81 | Chore            | Claude                                          | Draft PR open |
| 1     | Analytics decision, fix, verification, `check-site.mjs` rule                  | #85    | Bug              | Owner decides, Codex implements                 | Open          |
| 2     | Career facts confirmed and updated everywhere                                 | #86    | Bug              | Owner, then Codex                               | Open          |
| 3     | Service pages (design decision, then one PR per page)                         | #87    | Design / Feature | Claude scopes, owner writes facts, Codex builds | Open          |
| 4     | Case studies                                                                  | #88    | Feature          | Owner supplies numbers, Claude drafts           | Open          |
| 5     | `/prompt-play/` archive and date gate                                         | #89    | Chore            | Codex                                           | Open          |
| 6     | Dashboard location and the 22 routine PRs                                     | #83    | Chore            | Owner                                           | Open          |
| 7     | Company description across channels, Search Console recrawl                   | #84    | Chore            | Owner                                           | Open          |
| 8     | Process-doc hygiene                                                           | #90    | Chore            | Claude                                          | Open          |

Why this order: measurement and factual accuracy first (cheap, credibility and data depend on them), then the pages that create demand, then cleanup that only removes noise.

---

## 6. Interlocks

Things that should fail CI rather than wait for a human to notice:

- [ ] `check-site.mjs`: fail if any indexable page has no analytics snippet (explicit exemption list for `noindex` and redirect pages), if any page passes a `GTM-` ID to `gtag('config', …)`, or if pages disagree on the tag ID (after #85 decides the ID)
- [ ] `check-site.mjs`: fail on UPCOMING or LIVE NOW badges next to a date earlier than today (after #89)
- [ ] `check-site.mjs`: when a page has Organization JSON-LD with `sameAs`, fail if the list contains `/in/` LinkedIn URLs or `github.com/<user>` profiles (personal identities belong on Person)
- [ ] `check-site.mjs`: fail when an indexable page (no `noindex`, not a redirect stub) is missing from `sitemap.xml`. Today the script only checks that sitemap entries exist as files; the reverse is not enforced. Also make `STRICT` default-on for any page under a service or case-study path
- [ ] README "Facts used on the site" table stays the single source for dates, numbers and IDs; a PR that changes a fact changes the table

---

## 7. Testing and quality control

| Check                         | When                                                                                                                                   | How                                                                                                                                                                                                                                                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTMLHint and `check-site.mjs` | Every PR that touches `.html`, `sitemap.xml`, the script or the workflow (path filter in `html-lint.yml`); docs-only PRs do not run it | `html-lint.yml` (already in place; PR #81 passes locally)                                                                                                                                                                                                                                                       |
| Rich results                  | After JSON-LD changes                                                                                                                  | Google Rich Results Test on `/`, `/corey/`, new service pages                                                                                                                                                                                                                                                   |
| Analytics                     | After #85                                                                                                                              | Tag Assistant on three pages; GA4 Realtime shows `page_view` and one custom event                                                                                                                                                                                                                               |
| Indexing                      | After each content PR                                                                                                                  | Search Console URL inspection, request indexing; resubmit sitemap                                                                                                                                                                                                                                               |
| Removal                       | After `noindex` on the dashboard ships                                                                                                 | Search Console removal request (temporary, buys time) while the crawlable `noindex` does the permanent work. Never add a `robots.txt` Disallow for it: a crawl block hides the `noindex` and a blocked URL can be indexed again from external links. If it must not be readable, remove it or protect it (#83). |
| Copy accuracy                 | Before merging #86 and #88                                                                                                             | Owner sign-off on every date and number in the PR description                                                                                                                                                                                                                                                   |

---

## 8. Deployment notes

- Pages deploys the whole repository on push to `main` (`static.yml`). There is no staging; the PR diff and local `python3 -m http.server 8080` are the review surface.
- The `noindex` on the dashboard takes effect on the next crawl. No `robots.txt` Disallow for it, now or later: a crawl block would hide the `noindex`, and a blocked URL can still be indexed from external links (Google's removal guidance: keep it crawlable with `noindex`, or remove or protect the page).
- Service pages and case studies add to `sitemap.xml`; the `lastmod` values should be updated in the same PR.

---

## 9. Learning and measurement

Baseline before the content work lands, so the effect can be seen:

- Search Console: impressions and clicks for `/`, `/corey/`, `/readiness/`; queries containing "AI implementation", "Little Rock", "fractional", "workshop"
- GA4 (once #85 is verified): `book_call` clicks, readiness submissions, contact form submissions per week
- AI visibility: once a month, ask three assistants "Who is Tale Waters and Tides?" and "AI implementation consultant Little Rock" and record whether the answer matches the canonical description in #84. Ahrefs Brand Radar can automate this if the connector is enabled.
- Revisit this document at the end of November 2026 and mark each slice done or dropped.

---

## 10. Sources

- Google Search Central, "AI features and your website": https://developers.google.com/search/docs/appearance/ai-features
- Google Tag Manager release notes (2026-07-09 entry on unsupported installation paths): https://support.google.com/tagmanager/answer/4620708
- Google Tag Manager web install reference: https://developers.google.com/tag-platform/tag-manager/web
- Repository: `README.md` facts table, `CHANGELOG.md` Unreleased section, `scripts/check-site.mjs`
