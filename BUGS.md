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

_No bugs logged yet._
