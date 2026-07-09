# Instructions — Stats-Dept (LLM Working Context)

> Purpose: mitigate context loss between sessions. Read this first when resuming
> work. Update the **Current State** section at the end of each working session.

---

## Current State

- **Repo version:** `1.0.0` — 🎉 **first stable release** (migration phase complete).
- **Last commit:** `bb100d9` — refactor: simplify Apps Script filenames.
- **Last release tag:** `v1.0.0`.
- **Uncommitted work:** none — active Apps Script files were renamed to
  `StatsUpdate.js` and `StatsImport-and-Align.js`; deprecated StatsImport `v4.6`
  / `v5.0` files were removed locally, from GitHub-tracked source, and from the
  cloud project via clasp.
- **Tagging policy:** tag every release that contains anything beyond pure doc
  updates (code/config/bug fixes) with a SemVer patch/minor bump. Doc-only
  changes stay under `[Unreleased]` with no tag.
- **Standards:** `PRACTICES-AND-PRINCIPLES.md` is now the source of truth for how
  we author/document/version/hand off code. Read it alongside this file.
- **Code status:** Authoritative Apps Script source is now tracked under the
  simplified active filenames `StatsUpdate/StatsUpdate.js` and
  `StatsImport/StatsImport-and-Align.js`. Deprecated StatsImport legacy files
  were removed from the tracked project and cloud script so local, GitHub, and
  Apps Script now share the same lean file set.
- **Documentation status:** 
  - README.md updated with "Seasonal Operations Workflow" section (concise SOP)
  - `How To Build Draft Stats.docx` committed (full procedural guide with screenshots)
- **Next phase priority:** StatsImport code-quality assessment (see "Active Task" below)

### Accounts (IMPORTANT)
Both **production** projects are owned/accessed via the org account
**gamechanger@wcwaabaseball.org** (clasp named user `gamechanger`). An earlier
version of these notes wrongly listed StatsUpdate under `mdesau@gmail.com`; that
was an **orphan copy** (`12Auuw3…`), not the live script — see BUG-004.

- `StatsUpdate` (prod `1HyMi6t…`) → **gamechanger@wcwaabaseball.org**
- `StatsImport` (prod)            → **gamechanger@wcwaabaseball.org**

> `mdesau@gmail.com` remains the clasp **default** user and still owns the
> unused orphan StatsUpdate copy `12Auuw3…` (safe to ignore/delete).

Sync commands — **both** projects require the named user:
```bash
# StatsUpdate (production, org account)
cd StatsUpdate && clasp pull --user gamechanger

# StatsImport (org account)
cd StatsImport && clasp pull --user gamechanger
```
If a push/pull fails with `invalid_grant` / `invalid_rapt`, the token expired —
re-run `clasp login --user gamechanger`.
---

## Active Task (Priority)

**Post-1.0.0: StatsImport code-quality assessment**

The migration gate is **DONE** — `v1.0.0` shipped on 2026-07-09 with both projects
verified end-to-end in the clasp workflow. Next up is the first item on the
post-1.0.0 roadmap: a deep-dive on `StatsImport/StatsImport-and-Align.js`
against `PRACTICES-AND-PRINCIPLES.md` to decide whether a refactor/optimization is
warranted.

**Context:**
- Two projects: `StatsImport` (Stats Align Pipeline, v6.3) and `StatsUpdate`
  (AutoUpdate Regs to Stats, v2.4) — both now at repo version `1.0.0`.
- StatsUpdate received focused fixes this migration (BUG-003/004/005);
  StatsImport has not yet had a standards pass.

**Approach:**
1. Read `StatsImport-and-Align.js` against the practices doc.
2. Log any defects in `BUGS.md`; capture improvement ideas as roadmap items.
3. Propose (don't auto-apply) a refactor plan; discuss tradeoffs before changing code.

**Expected outcome:**
- A shared understanding of StatsImport's health and a prioritized improvement plan.

**SemVer from here:** we are past `1.0.0`, so strict SemVer applies — breaking
changes bump MAJOR, backwards-compatible features bump MINOR, fixes bump PATCH.

---

## To Do / Roadmap

Non-bug, forward-looking tasks for the migration. (Actual defects go in `BUGS.md`.)

- [x] **⭐ Verify + test each project in its new (clasp) workflow (DONE →
  `v1.0.0`, 2026-07-09).** Both projects confirmed working end-to-end; this gate
  ended the migration phase and cut the first stable release.
- [ ] **⭐ Code assessment: StatsImport (NEXT PRIORITY).** Deep-dive on
  `StatsImport-and-Align.js` against `PRACTICES-AND-PRINCIPLES.md`.
  Determine if refactor/optimization is warranted. *See "Active Task" above.*
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
- [x] **Rename script files to drop stale version labels.** Done 2026-07-09:
  `StatsUpdate/StatsUpdate.js` and `StatsImport/StatsImport-and-Align.js` are now
  the active file names, and the deprecated `v4.6` / `v5.0` StatsImport files
  were removed so the cloud project mirrors the simplified repo layout.
- [x] **Review "Cleared (unregistered)" player logic.** In
  `updateStatsFromRegistrations()` (StatsUpdate), audit how players who are no
  longer in the current Registrations get their draft fields cleared. *Reviewed
  and RESOLVED: confirmed the gap — exact full-name matching wrongly clears a
  registered player and re-adds a duplicate when the name is spelled differently
  (BUG-005).* **Resolution (v0.1.5, accepted in v1.0.0):** review-only detection
  (`findPossibleNameMismatches()`) flags cleared↔added same-last-name pairs in the
  popup/log for human verification — no data is auto-changed. **Optional future
  enhancement** (not an open defect): normalize the match key (lowercase + collapse
  whitespace + strip punctuation); consider a fuzzy fallback only if normalization
  proves insufficient (higher collateral-damage risk).
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
| `StatsUpdate/` | AutoUpdate Regs to Stats (+ Mock Draft) | 2.4 | gamechanger@wcwaabaseball.org | Sync → `Draft_Stats`; AI tools |

`StatsImport/` now keeps only the active import pipeline source file plus the
manifest/config needed for clasp sync.

### Data dependencies (one-line flow)
`Coach CSVs → StatsImport(aggregateAndAlignStats) → Raw_Stats → StatsUpdate(updateStatsFromRegistrations) → Draft_Stats → AI Scout / Mock Draft / Evals`

---

## Function Map

### StatsImport — Stats Align Pipeline (`StatsImport-and-Align`)
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

### StatsUpdate — AutoUpdate Regs to Stats (`StatsUpdate`)
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
| `findPossibleNameMismatches` | Review-only: flags cleared↔added same-last-name pairs (BUG-005 detection) |
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
clasp pull --user gamechanger   # inside StatsUpdate/  (production 1HyMi6t…, org account)
clasp pull --user gamechanger   # inside StatsImport/  (org account)
clasp push --user gamechanger   # send local → cloud (deliberate; org account)
clasp login --user gamechanger  # refresh token if invalid_grant / invalid_rapt
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
