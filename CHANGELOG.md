# Changelog

All notable changes to the **Stats-Dept** repository are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **This is a single consolidated changelog** for the whole repository, which
> contains two Apps Script projects:
> **StatsUpdate** (AutoUpdate Regs to Stats) and **StatsImport** (Stats Align Pipeline).
>
> **Phase:** The project is in the initial-development / **migration** phase
> (`0.x.x`). "Migration" = moving already-working cloud scripts into Git/GitHub +
> clasp. We will **not** cut `1.0.0` until every project is verified and tested
> stable in its new home. Repo-level releases are numbered `0.x.x` and tagged.
>
> The **Pre-migration project history** section near the bottom preserves each
> script's original in-file change log verbatim (those version numbers — 2.x and
> 6.x — are the projects' own historical lineages, not repo releases).

---

## [Unreleased]
### Added
- `PRACTICES-AND-PRINCIPLES.md` — repository-wide coding standards (documentation,
  DRY, API verification, security, testability, debugging, SemVer, changelog/bug
  tracking, and session-handoff protocol) to be followed for all future work.

### Changed
- **StatsImport pipeline:** switched `CONFIG.AI_MODEL` from the retired dated
  preview `gemini-2.5-flash-preview-09-2025` to the stable alias
  `gemini-2.5-flash` (BUG-002).

### Fixed
- StatsImport: prevented silent stat-column misalignment on the 1-row worded-header
  path — `generateAISectionProfile()` now validates the AI response is an array of
  exactly the expected length and halts the import with a clear error otherwise
  (BUG-001).
- StatsImport: restored all AI calls that were failing with a "model not found for
  API version v1beta" error by targeting a supported Gemini model (BUG-002).

## [0.1.0] - 2026-07-07
_First version-controlled release — the migration baseline. **No application
code was changed**; live Sheets/scripts remain untouched._

### Added
- Initialized the Git repository and pushed to `github.com/mdesau/Stats-Dept`
  (SSH), located locally outside Google Drive to avoid `.git` sync corruption.
- Repository scaffolding: `README.md`, this `CHANGELOG.md`, `BUGS.md`,
  `Instructions-Claude.md`, and a clasp/Node/macOS-aware `.gitignore`.
- Two-project structure:
  - `StatsUpdate/` — AutoUpdate Regs to Stats + Mock Draft (internal v2.4),
    owned by `mdesau@gmail.com`.
  - `StatsImport/` — Stats Align Pipeline (internal v6.3), owned by
    `gamechanger@wcwaabaseball.org`; also contains dormant legacy files
    (`v5.0`, `v4.6`) preserved from the cloud project.
- Adopted Google **clasp** for two-way sync; committed each project's
  `.clasp.json` wiring (Script IDs — not secrets) and `appsscript.json` manifest.
- Pulled authoritative source code from the Apps Script cloud for both projects.
- `_original-exports/` — checksum-verified snapshot of the original `.txt`/`.html`
  exports as first taken from the Apps Script editor.

### Verified
- Pulled cloud code is **byte-for-byte identical** to `_original-exports/`
  (no version drift between the "stable" exports and live code).
- No secrets in source: Gemini key is read from Script Properties
  (`GEMINI_API_KEY`), never hardcoded.

### Notes
- Two Google accounts own the two projects; clasp uses a named user
  (`gamechanger`) for StatsImport. Consolidating accounts is a tracked roadmap
  item in `Instructions-Claude.md` (not a bug).
- Removed the original `.txt`/`.html` copies from Google Drive after confirming
  they are committed to Git and pushed to GitHub.

---

## Pre-migration project history

> Preserved verbatim from each script's in-file `CHANGE LOG` header for
> historical context. These version numbers belong to each project's own
> lineage and predate this repository. They are **not** repo (`0.x.x`) releases.

### StatsUpdate — AutoUpdate Regs to Stats
| Version | Date | Description |
|---------|------|-------------|
| 2.4 | 2026-02-20 | Added **Update Evals**: syncs Draft values from Draft_Stats to the Evals sheet using 3-way matching (First Name, Last Name, Division). Header-based column lookup for flexibility. Marks non-matches as "Not in Draft". |
| 2.3 | 2026-01-31 | Refactored AI infrastructure to use a unified `GeminiClient` class. Centralized API handling, retry logic, and JSON parsing, reducing code redundancy. |
| 2.2 | 2026-01-23 | Added **Sanity Checker**: bi-directional validation between Registration and Draft_Stats. Identifies orphaned records and missing players; generates a timestamped report in "Sanity_Check_Results". |
| 2.1 | 2026-01-23 | Enhanced sync accounting: "Already Updated" vs "Updated" tracking, "NOT Updated" verification, improved UI messaging, workflow docs. Fixed duplicate-registration handling (prioritizes draft-eligible over excluded divisions). Added NAME_MATCHING debug logging with character-code analysis and DUPLICATE_REG detection. |
| 2.0 | 2026-01-15 | [Baseline] Official foundation for AI-integrated lineage. |
| 1.0 | 2026-01-19 | Core sync and logging baseline (UI exposes Update Draft Stats only). |

### StatsImport — Stats Align Pipeline
| Version | Date | Status | Description |
|---------|------|--------|-------------|
| 6.3 | 2026-01-12 | ACTIVE | [Refactor] Batch AI mapping for Tier 4 residual stats. |
| 6.2 | 2026-01-12 | STABLE | [Logic] Dynamic header detection & AI section anchoring. |
| 6.1-Ref | 2026-01-12 | STABLE | [Refine] Added "glossary" filter & improved fail logging. |
| 6.0 | 2026-01-11 | STABLE | [Milestone] Hybrid Direct + Dynamic AI mapping introduced. |
| 5.0 | 2026-01-11 | STABLE | [Legacy] AI-only mapping for league-wide stats. |
| 4.6 | 2026-01-11 | STABLE | [Legacy] Direct-only mapping for single-team stats. |
