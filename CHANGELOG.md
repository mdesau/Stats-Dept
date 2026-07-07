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
- (track day-to-day changes here)

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
