# Contributing to Tale Waters & Tides Marketing Site

Thanks for your interest in improving the marketing site for [talewatersandtides.com](https://talewatersandtides.com)!

## Quick Ways to Help

- **Report a bug** — Use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) template
- **Request a feature** — Use the [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) template
- **Share feedback** — Use the [General Feedback](.github/ISSUE_TEMPLATE/feedback.md) template
- **Flag a UX issue** — Use the [UX Evaluation](.github/ISSUE_TEMPLATE/ux_evaluation.md) template

## Development Setup

No build step required. Clone the repo and open `index.html` directly:

```bash
git clone https://github.com/sirgaladad/talewatersandtides-marketing.git
cd talewatersandtides-marketing
open index.html
```

## Making Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature-name`
3. Make your changes in `index.html` (or other files as needed)
4. Commit using [conventional commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `chore:`
5. Open a pull request against `main`

## Deployment

The site deploys automatically to GitHub Pages on every push to `main` via the GitHub Actions workflow in `.github/workflows/static.yml`.

## Code Style

This project uses Prettier for formatting. Run formatting with:

```bash
npx prettier --write index.html
```

## Related Projects

- [Pocket Fishing Guide](https://github.com/sirgaladad/pocket-fishing-guide) — The companion app this site promotes
