# ELiDDI_deployer

A single-page app for researchers to create and edit an ELiDDI `config.json` and deploy it straight to a live
[ELiDDI](https://github.com/CentreforTimeUseResearch/ELiDDI) diary study, via GitHub Pages.

## Using it

Open the deployed site (or `index.html` via a local server - see below), edit the config in the General/Onboarding/
Timeline tabs, check the Validation panel is green, then enter a GitHub personal access token with `actions:write`
on the ELiDDI repo and click **Deploy ELiDDI**. That triggers ELiDDI's own deploy workflow with your config, which
publishes it to ELiDDI's GitHub Pages site.

The token is entered at runtime and used only for that one request - it is never stored or sent anywhere else.

## Running it locally

Live schema validation needs the page served over HTTP (`fetch()` of a local file, and of the schema from GitHub,
is blocked under `file://`). From this repo's root:

```bash
npx serve .
```

Without a server the editor still works for editing, exporting, and deploying - a banner explains what's missing.

## No build step

This is intentionally a vanilla HTML/CSS/JS app with no dependencies and no build tooling - see `CLAUDE.md` for the
full architecture.
