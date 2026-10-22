# CLAUDE.md — Tale Waters & Tides

> This file provides Claude Code with persistent project context. It follows a shared base template reused across all TWT repos, with a repo-specific section at the bottom.

---

## Organization Context

**Tale Waters & Tides (TWT)** is an Arkansas-based outdoor recreation innovation lab.
- **Founder:** Corey Boelkens (@sirgaladad) — product, CRM, marine tech
- **CTO:** Abby Sims — full-stack, government and nonprofit delivery
- **Mission:** Build software, strategy, and field-tested execution for outdoor and marine environments

**Active products:**
- `pocket-fishing-guide` — live fishing intelligence app for Arkansas anglers (Next.js on Vercel, Supabase backend)
- `talewatersandtides-marketing` — marketing site for talewatersandtides.com

---

## Co-Development Process

Green Team / Red Team AI-assisted pipeline. Full SOP: `.github/TRIAGE.md`

| Step | Who | Action |
|------|-----|--------|
| 1. Triage | Green Team (AI) | Classify, label, scope, post comment, set Human Review |
| 2. Review | @sirgaladad | Approve → Backlog, Reject, Needs Info, or Duplicate |
| 3. Scope | AI + Human | Design decision or scoping doc for larger work |
| 4. Break | AI + Human | One PR per shippable slice |
| 5. Build | Human + AI | New branch from `main`, implement locally |
| 6. Merge | Human | Review PR, approve, merge — no direct push to `main` |

**AI Agent assignment by task type:**

| Task Type | Agent |
|-----------|-------|
| Release notes, versioning, changelog | Copilot |
| Design decisions, scoping, specs, UX write-ups | Claude (Claude Code) |
| Code implementation, bug fixes, PR-level work | Codex |
| Strategic decisions, approval gates | Human (@sirgaladad) |

---

## Branch & PR Rules

- Branch from up-to-date `main`: `git fetch origin && git checkout -b branch-name origin/main`
- No direct commits to `main`
- One PR per issue or shippable slice — keep PRs reviewable and focused
- PR title format: `[Type] Short description` where Type = Bug / Feature / UX / Chore
- Human review required before merge

---

## Markdown Conventions

- **Process docs:** ALL-CAPS filenames (e.g., `TRIAGE.md`, `CHANGELOG.md`)
- **Formatting:** Tables for structured data, checklists for action items, `---` dividers between major sections
- **Issue titles:** `[Bug]`, `[Feature]`, `[UX]`, `[Feedback]` prefix — matched by triage automation
- **No emoji** in docs unless explicitly requested

---

## Labels Reference

| Label | Meaning |
|-------|---------|
| `user-feedback` | Originated from end-user submission |
| `green-team` | AI is working on this item |
| `red-team` | Human review required |
| `epic` | Parent issue grouping sub-tasks |
| `bug` | Something is not working |
| `enhancement` | Improvement to existing feature |
| `ux` | User experience focused |
| P0–P3 | Priority (P0 critical → P3 future) |

---

## This Repo: talewatersandtides-marketing

**What it is:** Marketing site for talewatersandtides.com — static HTML pages (no framework, no build step) deployed to GitHub Pages.

**Live site:** https://talewatersandtides.com

**Purpose:** Brand presence, team bios, product portfolio (Pocket Fishing Guide, RaftUp, NMMA), and lead pipeline for the TWT innovation lab.

### Architecture

| Path | Purpose |
|------|---------|
| `index.html` | Home page (Consult door) |
| `lab/`, `guiding/`, `events/`, `partners/`, `projects/`, `first-contact/`, `prompt-play/`, `quest/`, `readiness/`, `unbound/`, `corey/`, `privacy/` | One folder per page or section, each with its own `index.html` |
| `admin/`, `sales-kit/` | Internal pages (metrics, sales kit); public URLs, not linked from the nav |
| `assets/css/site.css`, `assets/js/site.js` | Shared tokens and `window.TWT.intake`; reuse, do not fork |
| `supabase/functions/intake`, `supabase/functions/metrics` | Edge Functions, deployed by hand (`supabase functions deploy <name>`) |
| `supabase/migrations/` | Database migrations, applied by hand; no CI test yet |
| `assets/` | Team photos, logos, background images |
| `CNAME` | Custom domain configuration (`talewatersandtides.com`) |
| `.github/workflows/static.yml` | Deploy to GitHub Pages on push to `main` |
| `.github/workflows/triage.yml` | Green Team AI triage (triggers on `issues.labeled: user-feedback`) |
| `.github/workflows/html-lint.yml` | HTMLHint + `scripts/check-design.mjs` + `scripts/check-site.mjs` on HTML changes |
| `.github/workflows/intake-function.yml`, `metrics-function.yml` | Deno lint, type-check and tests for the Edge Functions |
| `.github/workflows/workflow-lint.yml` | actionlint on any workflow change |

### Before you open a PR

Run what CI runs:

```bash
npx --yes htmlhint@1 "**/*.html" --ignore "design/**"
node scripts/check-design.mjs
node scripts/check-site.mjs
```

For a change under `supabase/functions/<name>/`: `deno lint && deno check index.ts && deno test --allow-env`.
For a workflow change: `actionlint`. Pass untrusted text (titles, bodies, comments, branch names)
to shell steps through `env:`, never inline as `${{ ... }}`.

### Development Notes

- No build step — edit `index.html` directly, preview in browser
- Custom domain via `CNAME` — do not delete or rename this file
- Images in `assets/` are referenced directly from `index.html`
- Deploy is automatic on merge to `main` via GitHub Actions

---

## Guides (Tale Waters & Tides · Guides)

The guide service section of the site. Three doors on the site: Consult (`/`) · Build (`/lab/`) · Guides (`/guiding/`).

| Path | Purpose |
|------|---------|
| `design/guides/` | Design package: canvas boards, shared `g.css`, species and background assets. Read `design/guides/README.md` for the board-to-route map. |
| `docs/guides/` | Planning docs exported from Claude Docs. `GUIDES-PR-PLAN-DEV-ENVIRONMENT.md` is current; it wins over earlier docs. |
| `data/guiding.json` | Single source for packages, prices, hours, lunch options, credentials flags, policy text. |
| `guiding/` | The built pages. |
| `scripts/check-guiding.mjs` | CI: page, JSON and intake function agree. |
| `scripts/check-design.mjs` | CI: boards reference real assets, no placeholders ship, rules hold. |
| `.github/workflows/design-build.yml` | Label an issue `design-build` (use the Design Build issue template) and the agent builds that board into a PR. |

### Rules

- Prices, hours and policy text come only from `data/guiding.json`. Never hard-code them in HTML.
- No fly fishing. No guiding on the Buffalo River. No Little Red River. CI blocks all three.
- Trips are weekdays, year-round, full day by default, on the White (Bull Shoals), Norfork and Beaver tailwaters.
- Every link into Pocket Fishing Guide carries `utm_source=twt&utm_medium=referral&utm_campaign=guiding`.
- Tailwater cards link to `/water/<id>?tab=tailwaters`; species cards to `/species/<id>?water=<water_id>`.
- Booking, calendar and comms live in `pocket-fishing-guide` (Vercel + Supabase), not here. This repo is request intake and static pages only.
- Headlines short and literal. No catch counts, sizes or guarantees. No bracketed placeholder copy in a PR.
- The weather rule and cancellation table appear once above the book button and once at the review step.
