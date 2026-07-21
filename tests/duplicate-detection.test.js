/**
 * duplicate-detection.test.js
 * ============================================================================
 * WHAT THIS TESTS
 *   The pure helpers in StatsImport/DuplicateDetection.js:
 *     - buildIdentityKey(row, cols)
 *     - detectDuplicates(incomingRows, existingRows, cols)
 *   These power the "have I already imported this team?" warning that runs
 *   before rows are appended to Raw_Stats.
 *
 * WHY IT EXISTS
 *   Coach files are imported at different times and it is easy to re-import the
 *   same team. Detection must:
 *     - flag an exact re-import (identity + AVG match),
 *     - flag a same-player-different-AVG row as a POSSIBLE UPDATE (not exact),
 *     - NOT flag genuinely new players,
 *     - normalize case / whitespace so trivial formatting differences still match,
 *     - degrade gracefully when there is no AVG column.
 *   It must never touch data — these helpers only classify.
 *
 * HOW IT WORKS
 *   Loads the REAL component source into a Node `vm` sandbox (no Google globals
 *   needed — the helpers are pure) and calls the genuine functions, so there is
 *   no copy of the logic under test.
 *
 * HOW TO RUN
 *   node tests/duplicate-detection.test.js
 *   (Exit code 0 = all passed; non-zero = at least one failure.)
 */

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SOURCE = path.join(
  __dirname,
  "..",
  "StatsImport",
  "DuplicateDetection.js",
);

function loadFunctions() {
  const src = fs.readFileSync(SOURCE, "utf8");
  const sandbox = { console };
  vm.createContext(sandbox);
  const exposed =
    src +
    "\n;this.__buildIdentityKey = buildIdentityKey;" +
    "\n;this.__detectDuplicates = detectDuplicates;";
  vm.runInContext(exposed, sandbox, { filename: "DuplicateDetection.js" });
  return {
    buildIdentityKey: sandbox.__buildIdentityKey,
    detectDuplicates: sandbox.__detectDuplicates,
  };
}

const { buildIdentityKey, detectDuplicates } = loadFunctions();

// ---------------------------------------------------------------------------
// Tiny assertion helper (no test framework dependency).
// ---------------------------------------------------------------------------
let passed = 0;
const failures = [];

function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed += 1;
  } else {
    failures.push(`${label}\n     expected: ${e}\n     actual:   ${a}`);
  }
}

// Column layout used across the cases: [Number, Last, First, AVG].
const COLS = { number: 0, last: 1, first: 2, avg: 3 };
// Layout with no AVG column.
const COLS_NO_AVG = { number: 0, last: 1, first: 2, avg: -1 };

// ---------------------------------------------------------------------------
// buildIdentityKey
// ---------------------------------------------------------------------------
check(
  "identity key normalizes case and whitespace",
  buildIdentityKey(["12", "  Ramirez ", "Jose  Luis"], COLS),
  "12|ramirez|jose luis",
);
check(
  "identity key is blank when no name present",
  buildIdentityKey(["12", "", ""], COLS),
  "",
);
check(
  "identity key tolerates a missing jersey number",
  buildIdentityKey(["", "Chen", "Amy"], COLS),
  "|chen|amy",
);

// ---------------------------------------------------------------------------
// EXACT re-import: identity + AVG match => "exact", never "identityOnly".
// ---------------------------------------------------------------------------
check(
  "exact re-import (identity + AVG match) is flagged as exact",
  detectDuplicates(
    [["12", "Ramirez", "Jose", "0.412"]],
    [["12", "Ramirez", "Jose", "0.412"]],
    COLS,
  ),
  { exact: ["#12 Ramirez"], identityOnly: [] },
);

// ---------------------------------------------------------------------------
// POSSIBLE UPDATE: same identity, different AVG => "identityOnly".
// ---------------------------------------------------------------------------
check(
  "same player with a different AVG is a possible update, not exact",
  detectDuplicates(
    [["12", "Ramirez", "Jose", "0.455"]],
    [["12", "Ramirez", "Jose", "0.412"]],
    COLS,
  ),
  { exact: [], identityOnly: ["#12 Ramirez"] },
);

// ---------------------------------------------------------------------------
// TRUE NEGATIVE: a genuinely new player is not flagged at all.
// ---------------------------------------------------------------------------
check(
  "a brand-new player is not flagged",
  detectDuplicates(
    [["9", "Okafor", "Sam", "0.300"]],
    [["12", "Ramirez", "Jose", "0.412"]],
    COLS,
  ),
  { exact: [], identityOnly: [] },
);

// ---------------------------------------------------------------------------
// CASE/WHITESPACE INSENSITIVITY across import runs.
// ---------------------------------------------------------------------------
check(
  "case/whitespace differences still match as exact",
  detectDuplicates(
    [["12", " ramirez", "JOSE", "0.412"]],
    [["12", "Ramirez", "Jose", "0.412"]],
    COLS,
  ),
  { exact: ["#12 ramirez"], identityOnly: [] },
);

// ---------------------------------------------------------------------------
// NO AVG COLUMN: identity matches fall back to identityOnly (AVG tier skipped).
// ---------------------------------------------------------------------------
check(
  "without an AVG column, an identity match is reported as identity-only",
  detectDuplicates(
    [["12", "Ramirez", "Jose"]],
    [["12", "Ramirez", "Jose"]],
    COLS_NO_AVG,
  ),
  { exact: [], identityOnly: ["#12 Ramirez"] },
);

// ---------------------------------------------------------------------------
// MIXED BATCH + blank rows: correct bucketing, junk ignored.
// ---------------------------------------------------------------------------
check(
  "mixed batch buckets exact vs possible-update and ignores blank rows",
  detectDuplicates(
    [
      ["12", "Ramirez", "Jose", "0.412"], // exact
      ["7", "Chen", "Amy", "0.500"], // possible update (AVG changed)
      ["9", "Okafor", "Sam", "0.300"], // new
      ["", "", "", ""], // blank/junk → ignored
    ],
    [
      ["12", "Ramirez", "Jose", "0.412"],
      ["7", "Chen", "Amy", "0.480"],
    ],
    COLS,
  ),
  { exact: ["#12 Ramirez"], identityOnly: ["#7 Chen"] },
);

// ---------------------------------------------------------------------------
// EMPTY existing Raw_Stats: nothing can be a duplicate.
// ---------------------------------------------------------------------------
check(
  "no existing rows means no duplicates",
  detectDuplicates([["12", "Ramirez", "Jose", "0.412"]], [], COLS),
  { exact: [], identityOnly: [] },
);

// ---------------------------------------------------------------------------
// Summary.
// ---------------------------------------------------------------------------
const total = passed + failures.length;
if (failures.length === 0) {
  console.log(`✅ duplicate-detection: all ${total} checks passed`);
  process.exit(0);
} else {
  console.error(
    `❌ duplicate-detection: ${failures.length}/${total} checks FAILED\n`,
  );
  failures.forEach((f, i) => console.error(`  ${i + 1}. ${f}\n`));
  process.exit(1);
}
