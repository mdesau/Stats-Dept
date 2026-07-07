# Bug Tracker — Stats-Dept

A living developer record of problems, investigations, and resolutions.
Kept separate from `CHANGELOG.md` on purpose:

- **`CHANGELOG.md`** = stakeholder-facing release history (the *what* and *when*).
- **`BUGS.md`** = developer record of root causes and fixes (the *why* and *how*).

When a bug is fixed, add a one-line `### Fixed` note in `CHANGELOG.md` that
references the Bug ID (e.g., `Fixed crash in pitch parser (BUG-003)`); full
detail stays here.

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

## BUG-001 · [STATUS: Deferred]

**Title:** Two Google accounts own the two Apps Script projects (ownership split)

**Severity:** Medium
**Date Reported:** 2026-07-07
**Release Found:** v0.1.0 (setup)
**Release Fixed:** N/A — Deferred

### Observable Problem
The two projects are owned by different Google accounts:
- `StatsUpdate` (AutoUpdate Regs to Stats) → `mdesau@gmail.com`
- `StatsImport` (Stats Align Pipeline) → `gamechanger@wcwaabaseball.org`

`clasp` could pull StatsUpdate immediately, but StatsImport returned
"The caller does not have permission" until a second account login was added.

### Fix Explanation (Exec Level — No Code)
Nothing is broken today. Git versioning is account-agnostic, and clasp supports
multiple named logins, so both projects sync fine. The real concern is
**continuity risk**: StatsImport lives under an *organization* email. If access
to that org account is ever lost, owner control of that script (and its Script
Properties such as the Gemini API key, plus triggers) would be lost with it.

### Fix Details (Technical)
Workaround in place: `clasp login --user gamechanger` stores a second credential;
StatsImport is pulled/pushed with `-u gamechanger`. `StatsImport/.clasp.json`
does not record the user, so clasp commands for that folder must pass
`--user gamechanger`.

Consolidation options to evaluate later (each touches live production, so it is
intentionally out of scope for the initial setup):
1. Transfer ownership of the StatsImport **Sheet** (container-bound script moves
   with its Sheet). May be blocked by org policy for cross-domain transfers.
2. "Make a copy" under the target account — creates a **new Script ID** and does
   **not** carry over Script Properties (API key) or triggers; requires re-setup.
3. Leave as-is and simply ensure durable access to the org account.

### Workaround
Use clasp named user `gamechanger` for all StatsImport sync operations:
`clasp pull --user gamechanger` (run inside `StatsImport/`).

---

_No other bugs logged yet._
