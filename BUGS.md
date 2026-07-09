# Bug Tracker — Stats-Dept

A living developer record of problems, investigations, and resolutions.
Kept separate from `CHANGELOG.md` on purpose:

- **`CHANGELOG.md`** = stakeholder-facing release history (the *what* and *when*).
- **`BUGS.md`** = developer record of root causes and fixes (the *why* and *how*).

When a bug is fixed, add a one-line `### Fixed` note in `CHANGELOG.md` that
references the Bug ID (e.g., `Fixed crash in pitch parser (BUG-003)`); full
detail stays here.

> Roadmap / to-do items (non-bugs) live in `Instructions-Claude.md` under
> "To Do / Roadmap", not here.

---

## Severity guide
- **Critical** — system crash, data loss, or complete feature failure
- **High** — major feature broken with no workaround
- **Medium** — feature degraded but a workaround exists
- **Low** — cosmetic, minor UX, or rare edge case

## Status definitions
- **Open** — confirmed, not yet being worked
- **In Progress** — actively being investigated or fixed
- **Fixed** — resolved
- **RV** — resolved, verified, and shipped in a release
- **Won't Fix / C** — acknowledged but not being addressed (document the reason)
- **Deferred** — valid but postponed

---

<!-- Copy the template below for each new bug. Number sequentially. -->

<!--
---

## BUG-001 · [STATUS: Open]

**Title:** Concise one-line description of the bug

**Severity:** Critical | High | Medium | Low
**Date Reported:** YYYY-MM-DD
**Release Found:** v0.x.x
**Release Fixed:** N/A — Open

### Observable Problem
Plain-language description of what the user/developer sees going wrong. No code.

### Steps to Reproduce
1. Step one
2. Step two
3. Expected: [what should happen] — Actual: [what actually happens]

### Fix Explanation (Exec Level — No Code)
Human-readable explanation of the cause and how it was resolved.

### Fix Details (Technical)
Root cause, what changed, and why. Reference file/function names — no code blocks.

### Workaround
Any available workaround, or "None".
-->

## BUG-001 · [STATUS: Fixed]

**Title:** AI section-profiling output could silently misalign every stat column

**Severity:** High
**Date Reported:** 2026-07-07
**Release Found:** v0.1.0
**Release Fixed:** N/A — pending production verification

### Observable Problem
On the 1-row (flat) header import path, `generateAISectionProfile()` trusted the
Gemini response verbatim as the per-column key array. If the model ever returned
an array of the wrong length (or a non-array), the import would continue and
every downstream column could be written to the wrong master column in
`Raw_Stats` — corrupt data with **no error and no warning**. Never observed in
production; this is a preventive (latent-defect) fix.

### Steps to Reproduce
1. Import a coach CSV that uses a single-row worded header (triggers the AI
   section-profiling path).
2. Have the AI return an array whose length ≠ the number of header columns
   (e.g. it drops or adds one entry).
3. Expected: import halts with a clear error and appends nothing — Actual (before
   fix): import proceeded and appended misaligned rows to `Raw_Stats`.

### Fix Explanation (Exec Level — No Code)
The pipeline now validates the AI's section labels before using them: the result
must be a list with exactly one entry per header column. If it isn't, the import
stops immediately with a plain-language error instead of writing scrambled stats.
Failing loudly protects the master `Raw_Stats` table from silent corruption.

### Fix Details (Technical)
In `StatsAlignPipeline-6.3-Stable.js`, `generateAISectionProfile()` now wraps
`JSON.parse` in a guarded block and asserts `Array.isArray(profile) &&
profile.length === headers.length`. Any parse failure or length/type mismatch
throws a descriptive `Error`, which is caught by `aggregateAndAlignStats()`'s
handler (logged to `Automation_Logs` and surfaced via `ui.alert`). No other
behavior changed; the valid path returns the parsed array unchanged.

Verification: 13-case Node vm harness that loads the real source with stubbed
Apps Script globals (`PropertiesService`, `UrlFetchApp`) and exercises the true
`callGemini` → `generateAISectionProfile` path — valid pass-through, too-short,
too-long, non-array, and invalid-JSON cases, plus regression guards on the
untouched helpers. All passing.

### Workaround
Before the fix, the `Automation_Logs` reconciliation row (visual audit) was the
only way to notice a misalignment after the fact. Now unnecessary — the import
refuses to proceed.

---

## BUG-002 · [STATUS: Fixed]

**Title:** Retired Gemini preview model broke every AI call in the pipeline

**Severity:** High
**Date Reported:** 2026-07-07
**Release Found:** v0.1.0
**Release Fixed:** N/A — pending production verification

### Observable Problem
Any import that reached a Gemini call failed with:
`API Error: models/gemini-2.5-flash-preview-09-2025 is not found for API
version v1beta, or is not supported for generateContent.` This blocked the
1-row worded-header path (`generateAISectionProfile`) outright and would also
break Tier-4 residual mapping (`callBatchResidualAI`) on any import. Surfaced
during live verification of BUG-001 when testing the 1-row layout.

### Steps to Reproduce
1. Run an import that invokes Gemini (e.g. a 1-row worded-header CSV, which calls
   `generateAISectionProfile`).
2. Expected: AI section profiling returns and the import proceeds — Actual: hard
   failure with a "model not found for API version v1beta" API error.

### Fix Explanation (Exec Level — No Code)
The pipeline was pointed at a **dated preview** version of the Gemini model.
Google retires preview models on a rolling basis, and this one was removed, so
every AI request was rejected. The fix switches to the **stable** release of the
same model family, which Google maintains for production use and does not expire
on a date schedule. No behavior or prompt logic changed — only the model target.

### Fix Details (Technical)
In `StatsAlignPipeline-6.3-Stable.js`, `CONFIG.AI_MODEL` was changed from
`"gemini-2.5-flash-preview-09-2025"` to the stable alias `"gemini-2.5-flash"`.
Availability was confirmed against the live account key via the ListModels
endpoint (`GET /v1beta/models`), which returned `models/gemini-2.5-flash` among
the supported models. `callGemini` builds its URL from `CONFIG.AI_MODEL`, so this
single constant governs both `generateAISectionProfile` and `callBatchResidualAI`.

### Workaround
None in-code. Prior to the fix the only mitigation was to avoid any AI-dependent
path (i.e. only import clean 2-row sectional layouts with no residual/unknown
stats), which is impractical for real coach CSVs.

---

## BUG-003 · [STATUS: RV]

**Title:** Division-name renames silently broke draft-label abbreviation and Rookie exclusion

**Severity:** High
**Date Reported:** 2026-07-08
**Release Found:** v0.1.3
**Release Fixed:** v0.1.4 (deployed to production 2026-07-08)

### Observable Problem
When running **Update Draft Stats** for the Fall 2026 draft, the `Draft` column
in `Draft_Stats` was populated but **not abbreviated** for several divisions:
`Intermediate Machine Pitch…` stayed verbose instead of `IMP`, `Advanced Machine
Pitch…` instead of `AMP`, and `Major - Little League Baseball` produced `Major`
instead of `Majors`. Separately, **Rookie** players (a non-draft division) were
**not excluded** — they were written to the draft board as `Rookie`.

### Steps to Reproduce
1. Have Registrations use the 2026 program names (e.g. "Intermediate Machine
   Pitch - Little League Baseball", "Major - Little League Baseball",
   "Rookie - Coach Pitch - Little League Baseball").
2. Run GameChanger → Update Draft Stats.
3. Expected: Draft column shows IMP/AMP/Minors/Majors and Rookie is excluded —
   Actual: IMP/AMP not abbreviated, Majors shown as "Major", Rookie included.

### Fix Explanation (Exec Level — No Code)
The league renames its programs almost every season. The old code matched the
**entire** program name against last season's exact spelling, so any wording
change (e.g. "IMP" → "Intermediate", "Majors" → "Major", "(Coach Pitch)" →
"- Coach Pitch") silently stopped matching. The fix switches to **keyword
matching**: the code now looks for one stable word (like "Intermediate" or
"Major") anywhere in the name, so it keeps working across seasonal renames with
no code changes. The recognized keywords live in a small, clearly documented
configuration block at the top of the file for easy future updates.

### Fix Details (Technical)
In `AutoUpdate Regs to Stats-v2.0-STABLE.js`: replaced the literal
`EXCLUDED_DIV_PATTERNS` constant with two config tables — `DIVISION_RULES`
(ordered `{ keywords[], label }` rules) and `EXCLUDED_DIV_KEYWORDS`. Rewrote
`shortenDiv()` to return the first rule whose any-keyword matches
(case-insensitive), with the original first-token cleanup kept as a fallback for
unrecognized divisions. Rewrote `isExcludedDiv()` to do case-insensitive keyword
matching. Each rule carries multiple keywords so current and historical spellings
both map (e.g. `["Intermediate","IMP"] → "IMP"`). Verified by a committed Node
`vm` harness, `tests/division-mapping.test.js`, that loads the real source with
stubbed Apps Script globals and asserts all 7 of the 2026 names plus older
spellings and edge cases (30/30 checks passing). Deployed to the production
StatsUpdate script and confirmed working via a live Update Draft Stats run.

### Workaround
Before the fix: manually correct the Draft column after each sync and manually
delete Rookie rows. No longer needed.

---

## BUG-004 · [STATUS: RV]

**Title:** StatsUpdate clasp target pointed at an orphan copy, not the production script

**Severity:** High
**Date Reported:** 2026-07-08
**Release Found:** v0.1.0 (migration setup)
**Release Fixed:** v0.1.4 (2026-07-08)

### Observable Problem
After pushing the BUG-003 fix with `clasp push`, the live Apps Script editor
still showed the old code (different line count). Code changes appeared to have
"not taken", even though clasp reported a successful push.

### Steps to Reproduce
1. Edit `StatsUpdate/AutoUpdate Regs to Stats-v2.0-STABLE.js` locally.
2. `clasp push` from `StatsUpdate/`.
3. Expected: the production script bound to the Draft_Stats sheet updates —
   Actual: production is unchanged; the edit lands in a different (orphan) script.

### Fix Explanation (Exec Level — No Code)
The project's clasp configuration was wired to the wrong Google Apps Script
project — a standalone **copy** owned by a personal account — rather than the
real production script (owned by the org `gamechanger` account) that the
Draft_Stats spreadsheet actually runs. Pushes therefore updated a dead copy. We
re-pointed the configuration to the production script, re-authenticated the org
account, and verified production had not diverged from our baseline before
pushing the real fix. Our internal notes had the two projects' account ownership
reversed, which is what caused the mistake; the notes were corrected.

### Fix Details (Technical)
`StatsUpdate/.clasp.json` `scriptId` was changed from
`12Auuw3BrMikiCSzT8moRnZ_33SEcgiczhjZm-v47rfglqKsyw80eYqAR` (orphan copy, mdesau)
to `1HyMi6t_CogB2613MDkRgll2s0NuoGLc-a7aIvYQ_6ZeFrsK6eI7YSezF` (production, bound
to Draft_Stats, owned by gamechanger). The `gamechanger` clasp token had expired
(`invalid_grant / invalid_rapt`) and was refreshed via `clasp login --user
gamechanger`. Before pushing, production was pulled to a temp dir and diffed:
3 of 4 files were byte-identical to local and AutoUpdate was byte-identical to
our pre-edit git baseline, confirming no production-only drift. `StatsUpdate`
pushes now require `--user gamechanger`. `Instructions-Claude.md` account
ownership (both projects are under gamechanger) was corrected.

### Workaround
None needed post-fix. (The orphan `12Auuw3…` copy remains and can be ignored or
deleted; it is not referenced by any sheet.)
