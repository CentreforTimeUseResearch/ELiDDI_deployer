# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A single-page app (no dependencies, no build step; the two pure modules, `htmlWarnings.js` and `validationRules.js`, have `node --test` tests) for researchers to create and edit an ELiDDI
`config.json` and deploy it - by triggering a `workflow_dispatch` on the `deploy.yml` workflow of the
[ELiDDI](https://github.com/CentreforTimeUseResearch/ELiDDI) repository via the GitHub REST API, sending it the
edited config as a JSON payload.

## Architecture

- `config.json` — the current/last-used ELiDDI config (general settings, `day_boundary`, onboarding `instructions`,
  and the `timeline` of activity categories/activities/`childItems`). Fetched on load as the editor's starting
  document; otherwise just data, not read by any build step (this repo has none).
- `index.html` — page markup: tabs (General/Onboarding/Timeline/Validation), a validation/JSON-preview side panel, and the
  Deploy panel (GitHub PAT input + "Deploy ELiDDI" button).
- `app.js` — all app logic: tab rendering, undo/redo, file open/save (File System Access API with a download/file-
  picker fallback), and `deployToELiDDI()` wired to the Deploy button.
- `dom.js` — a tiny hyperscript-style DOM helper (`h()`) plus field builders and a generic add/remove/reorder/
  collapse list editor (`listSection`) used for every repeatable structure (dimensions, categories, activities,
  child items, onboarding steps, subselection question groups).
- `model.js` — factories for blank dimensions/categories/activities/etc.
- `htmlWarnings.js` — advisory (non-blocking) warnings for onboarding step `text`, which ELiDDI renders as unescaped HTML on purpose: flags `<script`, inline `on*=` handlers and `javascript:` URLs. Shown under the validation results; `title` is escaped by ELiDDI, so it is never checked. Tested by `htmlWarnings.test.mjs` - run `node --test` (built into Node, nothing to install).
- `validationRules.js` — the four pre-made validation rules ELiDDI ships (id, name, description), and pure helpers to read and set how strictly each is applied: `config.validation` maps a rule id to `off`, `soft` or `hard`, and a rule missing from it is Off. Setting a level writes all four ids and throws for an unknown rule or level. Backs the Validation tab; a new blank config starts with every rule Off. Tested by `validationRules.test.mjs` (`node --test`). The ids and the `validation` shape are defined by ELiDDI's config schema and `src/validation/`, so a new ELiDDI rule needs adding here too.
- `validator.js` — a ~100-line draft-07 JSON Schema subset, covering only the keywords the real schema uses (not a
  general-purpose engine).

### Schema validation - fetched live, not duplicated

`app.js` fetches the schema from `https://raw.githubusercontent.com/CentreforTimeUseResearch/ELiDDI/main/config/config.schema.json`
at load time rather than keeping a local copy. This repo used to hold its own hand-maintained JS copy of the config
shape (the old `config.js`, a `const config = {...}` literal); that could silently drift from what ELiDDI's own
build/tests actually validate against. Fetching live means there is exactly one source of truth for the schema, in
the ELiDDI repo. If that URL/path ever moves, update `SCHEMA_URL` in `app.js`.

### Deploy flow

`deployToELiDDI()` (in `app.js`) reads a GitHub PAT from the `#deploy-token` input (entered at runtime, never
stored), validates the current config against the fetched schema (confirming with the user before proceeding if
there are issues, not hard-blocking), then POSTs to
`https://api.github.com/repos/CentreforTimeUseResearch/ELiDDI/actions/workflows/deploy.yml/dispatches` with
`{ ref: "main", inputs: { data: JSON.stringify(state.config), researcher_email: researcherEmail } }` - the editor's
live in-memory state, not a file on disk. `researcher_email` comes from the optional `#researcher-email` field and is
sent as `''` when left blank; ELiDDI's `deploy.yml` only sends a completion email when it's non-empty. A status line
under the button reports the dispatch result (204 = triggered; anything else shows the GitHub API's response body).

Note there are two distinct `deploy.yml` workflows in play: this repo's own `.github/workflows/deploy.yml` (below)
deploys *this app* to GitHub Pages, while the `deploy.yml` targeted by the fetch call above lives in the separate
ELiDDI repo and is what actually publishes a configured diary study.

## Why this stays a separate repo from ELiDDI

GitHub Pages gives one live site per repository. This app's Pages site is the config/deploy tool; ELiDDI's Pages
site is the live diary study a researcher just configured. Merging them into one repo would mean losing one of
those two independently-addressable sites, so they're kept separate - the two are linked at runtime (the schema
fetch and the dispatch call above), not through shared source or a shared build.

## Deployment

Pushes to `main` automatically deploy this app via `.github/workflows/deploy.yml` (GitHub Pages). There is no build
step - the repo contents are served directly.
