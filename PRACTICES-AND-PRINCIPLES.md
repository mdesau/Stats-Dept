# Practices & Principles — Stats-Dept

> **Purpose:** The single source of truth for *how* we author, document, secure,
> version, and hand off code in this repository. Every code or documentation
> change from this point forward is expected to follow these principles.
>
> **Audience:** The maintainer (learning-focused) and any LLM/agent resuming
> work. Pair this file with `Instructions-Claude.md` (live working context),
> `CHANGELOG.md` (release history), and `BUGS.md` (defect record).

---

## 0. Mentorship & Working Style

We treat this codebase as a **learning tool**, not just a deliverable. When
writing or changing code:

- **Explain the *why*, not just the *what*** — assume a novice reader.
- **Surface tradeoffs** when making architectural decisions (classes vs.
  functions, inheritance vs. composition, etc.).
- **Pause to check understanding** at meaningful decision points instead of
  charging ahead.
- **Improve ideas without dismissing them** — suggest, don't override.
- Keep the journey from `0.x.x` → `1.0.0` explicit: what makes code
  "production-ready" is a running conversation, not a silent judgment.

**Before starting a new body of work**, confirm project specifics and goals so
these principles integrate cleanly rather than being bolted on.

---

## 1. Code Documentation & Learning

- **Comment the *why*, not the *what*.** Explain decisions, business rules, and
  non-obvious logic — not self-evident syntax.
- **Docstrings/JSDoc for every function, class, and module** — purpose,
  parameters, return values.
- **File-level workflow summary** at the top of each file describing the overall
  flow, so a reader understands the script before reading any single function.
- Write comments a stakeholder-facing person could read to explain the system.

## 2. DRY (Don't Repeat Yourself)

- Encapsulate reusable logic in **classes/modules**; extract repeated code into
  **well-named functions**; create **utility/helper** modules for common ops.
- **Teach the choice:** note *why* a class vs. a function was chosen for a given
  piece of logic.

## 3. API & External Runtime Best Practices

- **Read the official docs *before* writing code**, not after errors appear.
  Identify the interfaces/methods/types needed, verify exact names, signatures,
  and return types, *then* code against them.
- **Local type defs, mocks, and wrappers are conveniences — never the source of
  truth.** If we didn't author the API, we verify it before coding against it.
- **Never assume a method/property exists** because it "seems like it should."
  Confirm it — and watch for deprecated/renamed/version-specific differences.
- **Handle API failure modes explicitly:** rate limits, timeouts, auth failures,
  missing methods, malformed responses.
- **Version-pin** external dependencies where possible.
- **Cite the doc pages referenced** in comments for non-trivial API work.

## 4. Security

- **No hardcoded credentials, API keys, or secrets** in source. Ever.
- **Use environment/secret stores** for sensitive config (`.env`, or in Apps
  Script, **Script Properties** — e.g. `GEMINI_API_KEY`).
- **Git-ignore sensitive files** (`.env`, secret configs, `~/.clasprc.json`).
- **Validate all input** to prevent injection.
- **Use secure transport** (HTTPS/SSH) for API calls and data movement.
- **Least privilege** for permissions; **keep dependencies patched**.
- **Teach the pitfalls:** call out the specific risk being mitigated.

## 5. Environment Isolation (Python projects)

> Applies when/if Python tooling is added to this repo. The current pipeline is
> Google Apps Script; this section is the standard we adopt for any Python work.

- **Always use a virtual environment** (`venv`/`virtualenv`/`conda`); never
  install globally without a strong reason.
- Standard setup:
  ```bash
  python -m venv venv
  source venv/bin/activate   # macOS/Linux
  venv\Scripts\activate      # Windows
  ```
- **Document activation in README**, track deps with `requirements.txt`
  (`pip freeze > requirements.txt`), and **git-ignore `venv/`**.
- **Teach the why:** isolation prevents cross-project dependency conflicts.

## 6. Testability & Quality

- **Design for testability from the start:** small, single-responsibility
  functions; **separate business logic from I/O**; dependency injection where it
  helps.
- **Write unit tests for critical components**; provide test data / mocks.
  - *Established pattern in this repo:* a Node `vm` harness that loads the real
    Apps Script source with stubbed globals (`PropertiesService`,
    `UrlFetchApp`) and exercises the true call path (see BUG-001 verification).
- **After adding ~3–5 functions, pause to consider refactoring/cleanup.**

## 7. Readability & Maintainability

- **Optimize for humans over cleverness.**
- Clear, descriptive names for variables and functions.
- Follow the language style guide (PEP 8 for Python, idiomatic JS for Apps
  Script).
- **Keep functions short** (generally < 50 lines) with **one clear purpose**.

## 8. Debugging Infrastructure

- **Build in debug capability from the start.** Maintain a single
  **DEBUG CONFIGURATION** section near the top of the main file with explicit
  flags, e.g.:
  ```js
  // DEBUG CONFIGURATION
  const DEBUG_ALL_MODE        = false; // master toggle
  const DEBUG_API_CALLS       = false; // log all API requests/responses
  const DEBUG_DATA_PROCESSING = false; // show intermediate transformations
  const DEBUG_FILE_OPERATIONS = false; // log read/write operations
  ```
- Debug logging throughout should **respect these flags** (this repo already has
  `logDebug` / `DEBUG_FLAGS` in StatsUpdate — align new code to that pattern).
- **Teach the strategy:** when to use which debug level.

## 9. Git & Version Control

- Git repo initialized; **thoughtful `.gitignore`** for the stack (clasp/Node/
  macOS here).
- **Conventional Commits** for every message:
  - `feat:` new features · `fix:` bug fixes · `docs:` documentation ·
    `refactor:` restructuring · `test:` tests
- Commit the trailer:
  `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`

## 10. Versioning — Semantic Versioning (`MAJOR.MINOR.PATCH`)

- **MAJOR** = breaking changes / compatibility-breaking refactors.
- **MINOR** = backwards-compatible features / notable enhancements.
- **PATCH** = bug fixes, small improvements, doc updates.

**Initial development (`0.x.x`) — where this repo is now:**
- Start at `0.1.0`. Breaking changes allowed freely.
- Breaking change *or* new feature → bump **MINOR** (`0.1.0 → 0.2.0`).
- Bug fix → bump **PATCH** (`0.2.0 → 0.2.1`).

**First stable release (`1.0.0`):**
- Cut only when tested, stable, and production-ready — a milestone. 🎉
- After `1.0.0`, follow strict SemVer rules for breaking changes.

**Tagging:**
- Tag real releases only: `v0.1.0`, `v0.2.0`, `v1.0.0`, …
- **Do not tag** daily/nightly builds — track those under `[Unreleased]`.
- Update the version in **code + git tag + CHANGELOG** simultaneously.
- **Do NOT bump MAJOR until testing is confirmed successful.**

> **Repo gate:** we do not leave `0.x.x` until *every* project is verified and
> tested stable in its clasp/Git home.

## 11. Change Tracking — `CHANGELOG.md`

- Follow **[Keep a Changelog](https://keepachangelog.com/)**.
- Day-to-day changes land under **`[Unreleased]`**; move them into a new
  versioned section when a tag is cut. Link tags to their entries.
- **Cross-reference bugs:** when a bug is fixed, add a one-liner under
  `### Fixed` citing the Bug ID (e.g. `Fixed AI misalignment guard (BUG-001)`).
  Full detail lives in `BUGS.md`, not here.
- `CHANGELOG.md` is for **stakeholders / release history** (the *what* & *when*).

## 12. Bug Tracking — `BUGS.md`

- Keep investigation detail **out of CHANGELOG**. `BUGS.md` is the developer
  record (the *why* & *how*). Use this entry template:

  ```markdown
  ## BUG-001 · [STATUS: Open | In Progress | Fixed | Won't Fix | Deferred]

  **Title:** Concise one-line description
  **Severity:** Critical | High | Medium | Low
  **Date Reported:** YYYY-MM-DD
  **Release Found:** v0.x.x
  **Release Fixed:** v0.x.x  (or "N/A — Open")

  ### Observable Problem
  What the user/developer sees. No code.

  ### Steps to Reproduce
  1. ...  2. ...  3. Expected: … — Actual: …

  ### Fix Explanation (Exec Level — No Code)
  Cause + resolution in plain language, stakeholder-safe.

  ### Fix Details (Technical)
  Root cause, what changed, and why. File/function names — no code blocks.

  ### Workaround
  Any available workaround, or "None".
  ```

- **Severity:** `Critical` (crash/data loss/total failure) · `High` (major
  feature broken, no workaround) · `Medium` (degraded, workaround exists) ·
  `Low` (cosmetic/minor/rare edge case).
- **Status:** `Open` (confirmed, not started) · `In Progress` · `Fixed` ·
  `Won't Fix` / `C` (acknowledged, not addressed or not a code bug — document
  why) · `Deferred`. Use `RV` when *resolved **and** verified* in a shipped
  release.
- **Teach the discipline:** separate the **symptom** (Observable Problem) from
  the **root cause** (Fix Details) — you can't reliably fix what you haven't
  correctly diagnosed.

## 13. Working Context — `Instructions-<LLM>.md`

Maintain an LLM-specific instructions file (e.g. `Instructions-Claude.md`) to
mitigate context rot across sessions. It must carry:

- **Current State** (updated at each session end): repo version, last commit,
  **uncommitted work that needs revisiting**.
- **Function Map:** per script — function, what it does.
- **Data-dependencies diagram:** one-line flow.
- **Session handoff protocol.**

---

## Session Handoff Protocol (do this at the end of every session)

1. Update **Current State** in `Instructions-<LLM>.md` (version, last commit,
   uncommitted work).
2. Log notable changes in `CHANGELOG.md` under `[Unreleased]`.
3. Log/append any bugs in `BUGS.md` (cross-reference the Bug ID in CHANGELOG).
4. Commit with a Conventional Commit message.
5. Push to `origin`. **Tag only when cutting a release.**

---

## New-Project / New-Module Setup Checklist

When standing up a new project or a substantial new module, work through:

1. Initialize git repo.
2. Create a stack-appropriate `.gitignore`.
3. Set up project structure (folders, main files).
4. Create `CHANGELOG.md` starting at `[0.1.0]`.
5. Create `BUGS.md` with the empty template.
6. Create `README.md` (description, setup, usage, versioning link + version
   badge).
7. Create `Instructions-<LLM>.md` (Current State, Function Map, data-flow
   diagram, handoff protocol).
8. Discuss & document the versioning scheme.
9. Add the version number to the code (start at `0.1.0`).
10. Add the **DEBUG CONFIGURATION** placeholder.
11. Plan high-level architecture **before** coding.
12. First commit: `feat: initial project setup v0.1.0`, tag `v0.1.0`.
