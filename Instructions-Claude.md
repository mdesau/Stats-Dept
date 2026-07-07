# Instructions — Stats-Dept (LLM Working Context)

> Purpose: mitigate context loss between sessions. Read this first when resuming
> work. Update the **Current State** section at the end of each working session.

---

## Current State

- **Repo version:** `0.1.0` (initial development phase, `0.x.x`).
- **Last commit:** _pending — first commit not yet made at time of writing._
- **Uncommitted work:** Repository scaffolding created (README, CHANGELOG, BUGS,
  this file, .gitignore). Source `.gs` code NOT yet pulled via clasp — the
  `StatsUpdate/` and `StatsImport/` project folders are still empty placeholders.
  `_original-exports/` holds the checksum-verified baseline `.txt`/`.html`.
- **Golden rule this phase:** **NO application code changes.** We are only
  establishing version control and pulling authoritative code from the cloud.

### Immediate next steps
1. `git init`, first commit `feat: initial project setup v0.1.0`, tag `v0.1.0`.
2. Connect SSH remote `git@github.com:mdesau/Stats-Dept.git` and push.
3. Install Node + clasp; `clasp login`.
4. Capture the two Script IDs; `clasp clone/pull` into `StatsUpdate/` and
   `StatsImport/`.
5. Diff pulled cloud code against `_original-exports/` (filenames say v2.0/6.3
   but headers say v2.4/6.3 — determine true source of truth).

---

## Architecture / Projects

Two Apps Script projects, one repo, one pipeline:

| Folder | Project | Internal Ver | Role |
|--------|---------|--------------|------|
| `StatsImport/` | Stats Align Pipeline | 6.3 | Normalize coach CSVs → `Raw_Stats` |
| `StatsUpdate/` | AutoUpdate Regs to Stats (+ Mock Draft) | 2.4 | Sync → `Draft_Stats`; AI tools |

### Data dependencies (one-line flow)
`Coach CSVs → StatsImport(aggregateAndAlignStats) → Raw_Stats → StatsUpdate(updateStatsFromRegistrations) → Draft_Stats → AI Scout / Mock Draft / Evals`

---

## Function Map

### StatsImport — Stats Align Pipeline (`StatsAlignPipeline-6.3-Stable`)
| Function | What it does |
|----------|--------------|
| `onOpen` | Builds the "GC Automation" Sheets menu |
| `aggregateAndAlignStats` | Main entry: header detection + tiered mapping + append to Raw_Stats |
| `callBatchResidualAI` | Single Gemini call to map all unknown/residual stat headers |
| `generateAISectionProfile` | AI labels Batting/Pitching/Fielding zones for 1-row headers |
| `processPlayerData` | Filters junk rows, aligns player rows to master columns |
| `logData` | Writes before/after mapping reconciliation to Automation_Logs |
| `createSectionHeaderArray` | Builds sectioned keys from 2-row headers |
| `headerIsIdentity` / `mapIdentity` | Identity-tier header matching |
| `callGemini` | Low-level Gemini API wrapper (JSON or text) |
| `openLogsSheet` | Opens the Automation_Logs sheet |

### StatsUpdate — AutoUpdate Regs to Stats (`AutoUpdate Regs to Stats`)
| Function | What it does |
|----------|--------------|
| `onOpen` | Builds the Sheets automation menu |
| `updateStatsFromRegistrations` | Core sync: Registrations/Challenge → Draft_Stats |
| `updateEvalsFromDraftStats` | Syncs draft values into the Evals sheet (3-way match) |
| `runSanityChecker` | Bi-directional validation; writes Sanity_Check_Results |
| `runNegativeCoachAssistant` | AI sentiment scan of "avoid coach" requests; red flags |
| `askGeminiAdHoc` / `processScoutingQuestion` | On-demand AI scout Q&A |
| `aiDraftSummary` | AI draft board summary / top-talent ID |
| `logAiActivity` | Logs AI agent activity |
| `getDraftBoardContext` | Assembles board context for AI prompts |
| `handleAiError` | Standardized AI error handling |
| `getMap` / `shortenDiv` / `isExcludedDiv` | Header + division helpers |
| `fuzzyFirstNameMatch` / `levenshteinDistance` | Fuzzy name matching |
| `logDebug` | Debug logger gated by DEBUG_FLAGS |

### StatsUpdate — Mock Draft (`MockDraft` + `MockDraftDialog.html`)
| Function | What it does |
|----------|--------------|
| `showMockDraftDialog` | Opens the Mock Draft wizard modal (HTML) |
| `findHeaderRow` | Locates the header row in a division sheet |
| `getDivisionSeasons` / `getDivisionStatColumns` | Populate wizard dropdowns |
| `runMockDraft` | Snake-draft simulation via Gemini over historical stats |
| `runDiagnostics` | Diagnostic checks for the mock draft data |
| `logMockDebug` | Debug logger (defers to main `logDebug` if present) |

---

## Security notes
- Gemini key comes from Script Properties `GEMINI_API_KEY` (never hardcoded).
- Verified: no `AIza...` keys or inline secret assignments in the exports.

---

## Session handoff protocol
1. Update **Current State** (version, last commit, uncommitted work).
2. Log notable changes in `CHANGELOG.md` under `[Unreleased]`.
3. Log/append any bugs in `BUGS.md`.
4. Commit with a conventional message (`feat:`, `fix:`, `docs:`, `refactor:`).
5. Push to `origin`. Tag only when cutting a release.
