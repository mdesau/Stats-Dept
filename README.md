# Stats-Dept

![version](https://img.shields.io/badge/version-0.1.0-blue)

Version-controlled home for the **WCWAA Stats Department** youth-baseball
automation tools. These are [Google Apps Script](https://developers.google.com/apps-script)
projects that power draft preparation — synchronizing registrations, normalizing
coach-provided stats, and running AI-assisted scouting/mock-draft tooling on top
of Google Sheets.

This repository exists to give those cloud-hosted scripts **proper versioning,
sharing, and collaboration** via Git/GitHub, using Google's official
[`clasp`](https://github.com/google/clasp) CLI for two-way sync with the Apps
Script cloud.

---

## Projects

This repo tracks **two related Apps Script projects** that together form one
draft-prep pipeline (one feeds the other):

| Folder | Project | Purpose |
|--------|---------|---------|
| [`StatsImport/`](./StatsImport) | **Stats Align Pipeline** | Normalizes messy coach `.csv` stat exports into a single clean `Raw_Stats` master table. Runs first. |
| [`StatsUpdate/`](./StatsUpdate) | **AutoUpdate Regs to Stats** | The hub: syncs Registrations/Challenge data into `Draft_Stats`, plus AI Scout, Draft Insights, and the Mock Draft wizard. Consumes data prepared by StatsImport. |

> **Data flow:** `Coach CSVs → StatsImport (Raw_Stats) → StatsUpdate (Draft_Stats) → Draft prep / AI tools`

`_original-exports/` holds the pre-Git `.txt`/`.html` snapshots exactly as they
were first exported from the Apps Script editor — kept as a historical baseline.

---

## How the code is stored (clasp)

The authoritative code lives in the **Apps Script cloud**, bound to Google
Sheets. `clasp` syncs it to these local folders so it can be committed here.

- Each project folder contains a `.clasp.json` (holds the cloud **Script ID**)
  and an `appsscript.json` (the Apps Script manifest).
- `.gs` files are JavaScript; `.html` files are Apps Script HTML service views.

Common commands (run inside a project folder):

```bash
clasp pull      # bring the latest cloud code down into this folder
clasp push      # send local changes up to the cloud project
clasp open      # open the project in the Apps Script editor
```

### First-time setup

```bash
# 1. Install Node (macOS, Homebrew) and clasp
brew install node
npm install -g @google/clasp

# 2. Enable the Apps Script API for your account (one-time):
#    https://script.google.com/home/usersettings  → turn ON "Google Apps Script API"

# 3. Authenticate
clasp login
```

---

## Security

- **No secrets in source.** The Gemini API key is read at runtime from Apps
  Script **Script Properties** (`GEMINI_API_KEY`), never hardcoded.
  Set it via: *Extensions → Apps Script → Project Settings → Script Properties*.
- `.env`, `*.key`, `*.pem`, and clasp credentials are git-ignored.

---

## Versioning

This project follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`)
and is currently in the **initial development phase (`0.x.x`)** — things may still
change. See [`CHANGELOG.md`](./CHANGELOG.md) for the release history and
[`BUGS.md`](./BUGS.md) for the bug tracker.

- Releases are git-tagged (`v0.1.0`, `v0.2.0`, …).
- Day-to-day changes are logged under `[Unreleased]` in the changelog.
- We move to `1.0.0` when the pipeline is tested, stable, and production-ready.
