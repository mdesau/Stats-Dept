# Instructions — Stats-Dept (LLM Working Context)

> Purpose: mitigate context loss between sessions. Read this first when resuming
> work. Update the **Current State** section at the end of each working session.

---

## Current State

- **Repo version:** `0.1.3` (initial development phase, `0.x.x`).
- **Last commit:** `350eafc` — fix: harden AI section profiling and use stable Gemini model (BUG-001, BUG-002).
- **Last release tag:** `v0.1.3`.
- **Uncommitted work:** none — BUG-001/BUG-002 fixes, their `BUGS.md` entries,
  the CHANGELOG `[Unreleased]` updates, and the new `PRACTICES-AND-PRINCIPLES.md`
  were committed this session.
- **Standards:** `PRACTICES-AND-PRINCIPLES.md` is now the source of truth for how
  we author/document/version/hand off code. Read it alongside this file.
- **Code status:** Authoritative `.gs`/`.js` code pulled from the Apps Script
  cloud via clasp into `StatsUpdate/` and `StatsImport/`. Verified byte-for-byte
  identical to `_original-exports/`.
- **Documentation status:** 
  - README.md updated with "Seasonal Operations Workflow" section (concise SOP)
  - `How To Build Draft Stats.docx` committed (full procedural guide with screenshots)
- **Next phase priority:** Code quality assessment (see "Active Task" below)

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

## Active Task (Priority)

**Verify + test both projects in the clasp workflow — the gate to `1.0.0`**

Confirm each Apps Script project runs correctly end-to-end in its new
Git/clasp home. This is the milestone that ends the migration phase: once the
user confirms everything is working, we cut **`1.0.0`** (first stable,
production-ready release).

**Context:**
- Two projects: `StatsImport` (Stats Align Pipeline, v6.3) and `StatsUpdate`
  (AutoUpdate Regs to Stats, v2.4).
- Recent fixes (BUG-001, BUG-002) shipped in `v0.1.3` need real-world
  confirmation on live imports.

**Approach:**
1. User exercises each project's real workflow (imports, sync, AI paths).
2. Capture any defects in `BUGS.md`; fix and re-verify as needed.
3. On user confirmation that everything works → cut **`1.0.0`** (update code
   version, `CHANGELOG.md`, tag `v1.0.0`, push).

**Expected outcome:**
- User-confirmed working pipeline, then a tagged `v1.0.0` release.

**After `1.0.0`:** work through the remainder of the To Do / Roadmap list
(code assessment, account consolidation, file renames, then code changes).

---

## To Do / Roadmap

Non-bug, forward-looking tasks for the migration. (Actual defects go in `BUGS.md`.)

- [ ] **⭐ Verify + test each project in its new (clasp) workflow (PRIORITY).**
  This is the gate that ends the migration phase. Once the user confirms both
  projects work end-to-end, cut **`1.0.0`** (first stable release). See
  "Active Task" above.
- [ ] **Code assessment: StatsImport.** Deep-dive on
  `StatsAlignPipeline-6.3-Stable.js` against `PRACTICES-AND-PRINCIPLES.md`.
  Determine if refactor/optimization is warranted. *Unblocked — best-practices
  doc now delivered. Scheduled for after `1.0.0`.*
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
- [ ] **🚀 Major change / Feature (targets `2.0.0`): bulk import from folder.**
  Investigate the ability to implement a "bulk import" feature that ingests
  multiple coach CSVs directly from a folder (e.g. Google Drive) in one run,
  rather than one file at a time. Breaking/behavior-changing scope → will land
  as a `2.0.0` release when built.

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
