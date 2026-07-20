# Stats-Dept

![version](https://img.shields.io/badge/version-1.1.0-blue)

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

## Seasonal Operations Workflow

Each draft-prep season follows a standardized pipeline to build and sync player statistics. The process is ~95% automated; historically this was manual and error-prone.

### Full procedure documentation
For detailed step-by-step instructions with screenshots, see [`How To Build Draft Stats.docx`](./docs/How%20To%20Build%20Draft%20Stats.docx).


### High-level flow
```
Coach .csv files → Staging (ALL_Seasons_Stats) → Raw_Stats (auto-aligned) → Draft_Stats (subset) → Registrations sync → Final draft list per division
```

### Step-by-step process

#### 1. Collect coach statistics
After the season ends, gather `.csv` exports from each coach via GameChanger:
- **Mobile app:** Team → Stats → Export Stats
- **Web GUI:** Team → Stats → Export Stats

#### 2. Import and align stats (automated)
In **ALL_Seasons_Stats** (single source of truth for historical data):

1. Copy/paste each coach's `.csv` into the **Staging** sheet (one team at a time; clear prior team before adding next)
2. Align cell alignment: ensure the first player row in Staging matches the corresponding row position from the original `.csv`
3. Run **GC Automation → Import and Align Staging Data** (stale stats will be highlighted yellow)
4. Review the import report (shows imported players, aligned stats, missing stats, AI mappings)

> **Note:** GameChanger exports inconsistent `.csv` formats across coaches (column order/naming varies). The automation handles this via header detection and AI mapping for edge cases.

#### 3. Create new seasonal draft file
1. Open **Template-Seasonal_Stats-Automated_Fully** (do not edit this template)
2. **Make a Copy**, rename to `Spring 2026 Draft Stats` (adjust season/year), save to appropriate folder
3. Copy the **last 2 seasons of stats** from ALL_Seasons_Stats → Draft_Stats sheet and paste into the new file's Draft_Stats sheet
   - Use a simple filter to select 2-season date range

#### 4. Import registration and challenge data
Download custom reports from **Sports Connect**:
- **Registrations report:** Export, rename for new season (e.g., "Spring 2026 Rec"), update Program/Year if needed
- **Challenge report:** Export similarly (usually one-time per season once challenge teams are set)

Paste data (rows 2+ only; skip headers) into the new **Spring 2026 Draft Stats** file:
- Registrations data → **Registrations** tab
- Challenge data → **Challenge** tab

#### 5. Update player info and sync draft list
Run **Gamechanger → Update Draft Stats**:
- Matches names from Registrations sheet against Draft_Stats
- Updates player info for matched records (see mapping table below)
- Generates a report: registered count, already-updated (existing), newly updated, cleared, added, not-updated, excluded divisions

The **Draft_Stats** sheet auto-populates division tabs (IMP, AMP, Minors, Majors) via `QUERY` functions.

#### 6. Sanity checks
Before finalizing, verify alignment:
- **Registrations sheet:** Division registration counts ↔ Draft_Stats counts should match
- **Division tabs:** Same counters/trackers
- If mismatch: use **Manual Sanity Checker** (instructions on tab) or run **Gamechanger → Run Sanity Checker** (automated)

### Data mapping reference

When **Gamechanger → Update Draft Stats** runs, it maps the following columns from Registrations/Challenge into Draft_Stats:

| Source Sheet   | Source Column            | Destination (Draft_Stats) |
|---|---|---|
| Registrations  | Player Birth Date        | Player Birth Date         |
| Registrations  | Division Name            | Draft                     |
| Registrations  | Special Player Request   | Special Player Requests   |
| Challenge      | Team Name                | Challenge                 |

### Key guardrails

- **Template is immutable:** Do not edit or alter `Template-Seasonal_Stats-Automated_Fully`; always "Make a Copy"
- **Challenge one-time:** Paste challenge report once per season (teams are static after setup)
- **Registrations recurring:** Repeat registration import + update each time registration window updates (up until close)
- **Negative requests:** Before final handoff to coaches, scrub Special Player Requests to remove negative/sensitive comments (use Sports Connect "Special Player Requests" report; commissioners should review separately)
- **Red vs. green:** Red rows = unregistered (missing DoB/Draft); green rows = registered (ready for draft list)

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
and reached its **first stable release (`1.0.0`)** on 2026-07-09 — both Apps Script
projects are verified and tested stable in their Git/clasp home. See
[`docs/CHANGELOG.md`](./docs/CHANGELOG.md) for the release history and
[`docs/BUGS.md`](./docs/BUGS.md) for the bug tracker.

- Releases are git-tagged (`v0.1.0`, …, `v1.0.0`).
- Day-to-day changes are logged under `[Unreleased]` in the changelog.
- From `1.0.0` onward we follow strict SemVer: breaking changes bump MAJOR,
  backwards-compatible features bump MINOR, fixes bump PATCH.
