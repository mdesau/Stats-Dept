# Changelog

All notable changes to the **Stats-Dept** repository are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Note on scope:** This is a **single consolidated changelog** for the whole
> repository, which contains two Apps Script projects (**StatsImport** = Stats
> Align Pipeline, **StatsUpdate** = AutoUpdate Regs to Stats). Each entry is
> prefixed with the affected project where useful. The projects previously kept
> their own in-file change logs (StatsUpdate internal v2.4, StatsImport internal
> v6.3); those historical, per-project logs are preserved inside the source file
> headers and will be reconciled into this file over time.

## [Unreleased]
### Added
- Pulled authoritative source code from the Apps Script cloud via `clasp`:
  - `StatsUpdate/` — AutoUpdate main, MockDraft, MockDraftDialog.html, manifest.
  - `StatsImport/` — Stats Align Pipeline 6.3 plus dormant legacy versions
    (`v5.0`, `v4.6`) that exist in the cloud project, and manifest.
- `.clasp.json` wiring committed for both projects (Script IDs; not secrets).

### Notes
- Reconciliation confirmed the pulled cloud code is **byte-for-byte identical**
  to the `_original-exports/` snapshots — no version drift.
- **Two Google accounts** are in play: `StatsUpdate` is owned by
  `mdesau@gmail.com`; `StatsImport` is owned by `gamechanger@wcwaabaseball.org`.
  clasp is configured with a named user (`gamechanger`) to sync StatsImport.
  Account consolidation is deferred and tracked in `BUGS.md` (BUG-001).
- **No application code changed.** Live Sheets/scripts untouched.

## [0.1.0] - 2026-07-07
### Added
- Initial Git repository for the WCWAA Stats Department tooling.
- Repository scaffolding: `README.md`, `CHANGELOG.md`, `BUGS.md`,
  `Instructions-Claude.md`, and a clasp/Node/macOS-aware `.gitignore`.
- Two-project structure established:
  - `StatsImport/` — Stats Align Pipeline (internal header version 6.3).
  - `StatsUpdate/` — AutoUpdate Regs to Stats + Mock Draft (internal header
    version 2.4).
- `_original-exports/` baseline snapshot of the original `.txt`/`.html` exports
  as first pulled out of the Apps Script editor (checksum-verified during move).
- Decision to adopt Google `clasp` for two-way sync between the Apps Script
  cloud projects and this repository.

### Notes
- **No application code was changed** in this release. This is purely the
  version-control foundation. Live scripts in Google Sheets are untouched.
