# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A single-page app (`index.html`, no dependencies, no build step, no tests) that triggers a `workflow_dispatch` on the `deploy.yml` workflow of the [ELiDDI](https://github.com/centreforTimeUseResearch/ELiDDI) repository via the GitHub REST API, sending it a large JSON configuration payload.

## Architecture

Split across two files:

- `config.js` — a top-level `const config = {...};` object holding the full ELiDDI experiment/deployment configuration: general settings (`app_name`, `experimentID`, accessibility options, etc.) plus a `timeline` of activity categories/activities/`childItems` with codes, labels, and colors. It's loaded via `<script src="config.js"></script>` and used as-is — `JSON.stringify`'d into the dispatch payload, never parsed or transformed by the app logic.
- `index.html` — the page markup plus `deploy_eliddi()`, wired to the "Deploy ELiDDi" button's `onclick`. It reads a GitHub PAT from the `#token` text input (entered by the user at runtime, not stored in source), then POSTs to `https://api.github.com/repos/centreforTimeUseResearch/ELiDDI/actions/workflows/deploy.yml/dispatches` with `{ ref: "main", inputs: { data: JSON.stringify(config) } }`.

Note there are two distinct `deploy.yml` workflows in play: this repo's own `.github/workflows/deploy.yml` (below) deploys *this app* to GitHub Pages, while the `deploy.yml` targeted by the fetch call above lives in the separate ELiDDI repo and is what actually gets triggered.

## Deployment

Pushes to `main` automatically deploy this app via `.github/workflows/deploy.yml` (GitHub Pages). There is no build step — the repo contents are served directly.
