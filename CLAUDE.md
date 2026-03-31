# CLAUDE.md — Tale Waters & Tides

> This file provides Claude Code with persistent project context. It follows a shared base template reused across all TWT repos, with a repo-specific section at the bottom.

---

## Organization Context

**Tale Waters & Tides (TWT)** is an Arkansas-based outdoor recreation innovation lab.
- **Founder:** Corey Boelkens (@sirgaladad) — product, CRM, marine tech
- **CTO:** Abby Sims — full-stack, government and nonprofit delivery
- **Mission:** Build software, strategy, and field-tested execution for outdoor and marine environments

**Active products:**
- `pocket-fishing-guide` — live fishing intelligence app for Arkansas anglers (GitHub Pages)
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

**What it is:** Marketing site for talewatersandtides.com — static HTML page deployed to GitHub Pages.

**Live site:** https://talewatersandtides.com

**Purpose:** Brand presence, team bios, product portfolio (Pocket Fishing Guide, RaftUp, NMMA), and lead pipeline for the TWT innovation lab.

### Architecture

| Path | Purpose |
|------|---------|
| `index.html` | The entire site (static HTML/CSS/JS, no framework) |
| `assets/` | Team photos, logos, background images |
| `CNAME` | Custom domain configuration (`talewatersandtides.com`) |
| `.github/workflows/static.yml` | Deploy to GitHub Pages on push to `main` |
| `.github/workflows/triage.yml` | Green Team AI triage (triggers on `issues.labeled: user-feedback`) |

### Development Notes

- No build step — edit `index.html` directly, preview in browser
- Custom domain via `CNAME` — do not delete or rename this file
- Images in `assets/` are referenced directly from `index.html`
- Deploy is automatic on merge to `main` via GitHub Actions
