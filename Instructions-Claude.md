# Instructions — Stats-Dept (LLM Working Context)

> Purpose: mitigate context loss between sessions. Read this first when resuming
> work. Update the **Current State** section at the end of each working session.

---

## Current State

- **Repo version:** `0.1.0` (initial development phase, `0.x.x`).
- **Last release tag:** `v0.1.0`.
- **Uncommitted work:** none expected after the "pull real code" commit.
- **Code status:** Authoritative `.gs`/`.js` code pulled from the Apps Script
  cloud via clasp into `StatsUpdate/` and `StatsImport/`. Verified byte-for-byte
  identical to `_original-exports/`.
- **Golden rule this phase:** **NO application code changes.** We only established
  version control and pulled authoritative code from the cloud.

### Accounts (IMPORTANT)
Two Google accounts own the two projects:
- `StatsUpdate` → **mdesau@gmail.com** (clasp default user)
- `StatsImport` → **gamechanger@wcwaabaseball.org** (clasp named user `gamechanger`)

Sync commands:
```bash
# StatsUpdate (default account)
cd StatsUpdate && clasp pull

# StatsImport (org account) — MUST pass the named user
cd StatsImport && clasp pull --user gamechanger
```
---

## To Do / Roadmap

Non-bug, forward-looking tasks for the migration. (Actual defects go in `BUGS.md`.)

- [ ] **Account consolidation (decide + execute).** The two projects are owned by
  different Google accounts (`mdesau@gmail.com` vs `gamechanger@wcwaabaseball.org`).
  Everything works today via clasp named users, but the org account creates a
  continuity/bus-factor risk (losing org access = losing owner control of
  StatsImport, its Script Properties incl. `GEMINI_API_KEY`, and triggers).
  Options to weigh (each touches live production):
    1. Transfer ownership of the StatsImport **Sheet** (container-bound script
       moves with its Sheet); may be blocked by org cross-domain policy.
    2. "Make a copy" under the target account — creates a **new Script ID** and
       does **not** carry over Script Properties or triggers (needs re-setup).
    3. Leave as-is and simply guarantee durable access to the org account.
- [ ] **Verify + test each project in its new (clasp) workflow** before any
  `1.0.0` release — this is the gate that ends the migration phase.
- [x] **Reconcile legacy in-file changelogs** into the single `CHANGELOG.md`
  (done — preserved verbatim in the "Pre-migration project history" section;
  keep it tidy as new changes land under `[Unreleased]`).
- [ ] **Rename script files to drop stale version labels.** Filenames still
  carry old per-project versions (e.g. `AutoUpdate Regs to Stats-v2.0-STABLE.js`,
  `StatsAlignPipeline-6.3-Stable.js`) that no longer match repo-level SemVer.
  Renaming touches the cloud project (file identity) so it belongs to the code
  phase, not this migration. When done, update `appsscript.json`/clasp as needed
  and `clasp push` deliberately.
- [ ] Only after the above: consider actual code changes (a new, separate phase).

---

## Architecture / Projects

Two Apps Script projects, one repo, one pipeline:

| Folder | Project | Internal Ver | Owner account | Role |
|--------|---------|--------------|---------------|------|
| `StatsImport/` | Stats Align Pipeline | 6.3 | gamechanger@wcwaabaseball.org | Normalize coach CSVs → `Raw_Stats` |
| `StatsUpdate/` | AutoUpdate Regs to Stats (+ Mock Draft) | 2.4 | mdesau@gmail.com | Sync → `Draft_Stats`; AI tools |

`StatsImport/` also contains dormant legacy files pulled from the cloud project:
`StatsAlignPipeline-v5.0-Stable.js` and `StatsAlignPipeline-v4.6-Stable.js`
(kept as-is; the active version is 6.3).

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

## clasp quick reference
```bash
export PATH="/opt/homebrew/bin:$PATH"   # node/clasp live under Homebrew
clasp pull                # inside StatsUpdate/  (mdesau@gmail.com, default)
clasp pull --user gamechanger   # inside StatsImport/  (org account)
clasp push                # send local → cloud (use with care; not this phase)
clasp open-script         # open the cloud project in the editor
```

## Security notes
- Gemini key comes from Script Properties `GEMINI_API_KEY` (never hardcoded).
- Verified: no `AIza...` keys or inline secret assignments in the code.
- clasp OAuth tokens live in `~/.clasprc.json` (git-ignored, never committed).

---

## Session handoff protocol
1. Update **Current State** (version, last commit, uncommitted work).
2. Log notable changes in `CHANGELOG.md` under `[Unreleased]`.
3. Log/append any bugs in `BUGS.md`.
4. Commit with a conventional message (`feat:`, `fix:`, `docs:`, `refactor:`).
5. Push to `origin`. Tag only when cutting a release.
