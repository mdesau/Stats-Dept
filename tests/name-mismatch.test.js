/**
 * name-mismatch.test.js
 * ============================================================================
 * WHAT THIS TESTS
 *   findPossibleNameMismatches(clearedNames, addedNames) in
 *   "AutoUpdate Regs to Stats" — the review-only safety net for the
 *   "Cleared (unregistered)" logic.
 *
 * WHY IT EXISTS
 *   Draft_Stats and Registrations are matched by EXACT full name. When the same
 *   child is spelled differently between the two sheets (nickname, typo, middle
 *   name), the sync silently CLEARS them from Draft_Stats and re-ADDS them as a
 *   brand-new duplicate. findPossibleNameMismatches spots that pattern — a
 *   cleared player and an added player sharing a last name — and surfaces it for
 *   a human to verify. It must NEVER auto-merge, and must NOT flag genuinely
 *   different people who happen to have different last names.
 *
 * HOW IT WORKS
 *   Loads the REAL Apps Script source into a Node `vm` sandbox with Google
 *   globals stubbed, then calls the genuine function — no copies of the logic.
 *
 * HOW TO RUN
 *   node tests/name-mismatch.test.js
 *   (Exit code 0 = all passed; non-zero = at least one failure.)
 */

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

// ---------------------------------------------------------------------------
// Load the real Apps Script source into a sandbox with Google globals stubbed.
// ---------------------------------------------------------------------------
const SOURCE = path.join(
  __dirname,
  "..",
  "StatsUpdate",
  "AutoUpdate Regs to Stats-v2.0-STABLE.js",
);

function loadFunctions() {
  const src = fs.readFileSync(SOURCE, "utf8");
  const sandbox = {
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: () => "" }),
    },
    SpreadsheetApp: {},
    UrlFetchApp: {},
    Utilities: {},
    Logger: { log() {} },
    console,
  };
  vm.createContext(sandbox);
  const exposed =
    src + "\n;this.__findPossibleNameMismatches = findPossibleNameMismatches;";
  vm.runInContext(exposed, sandbox, { filename: "AutoUpdate.js" });
  return { findPossibleNameMismatches: sandbox.__findPossibleNameMismatches };
}

const { findPossibleNameMismatches } = loadFunctions();

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

/** Run the function and assert the resulting pairs (order-independent). */
function expectPairs(label, cleared, added, expectedPairs) {
  const result = findPossibleNameMismatches(new Set(cleared), new Set(added));
  // Normalize to a stable, comparable shape.
  const norm = (arr) =>
    arr
      .map((p) => ({ cleared: p.cleared, added: [...p.added].sort() }))
      .sort((x, y) => x.cleared.localeCompare(y.cleared));
  check(label, norm(result), norm(expectedPairs));
}

// ---------------------------------------------------------------------------
// CORE CASE — same last name cleared + added => flagged (the Plunkett case).
// ---------------------------------------------------------------------------
expectPairs(
  "nickname/typo: same last name is flagged",
  ["Rhys Plunkett"],
  ["Patrick Plunkett"],
  [{ cleared: "Rhys Plunkett", added: ["Patrick Plunkett"] }],
);

// ---------------------------------------------------------------------------
// TRUE NEGATIVE — genuinely different people (different last names) => no flag.
// ---------------------------------------------------------------------------
expectPairs(
  "different last names are NOT flagged",
  ["Sam Roster"],
  ["Alex Newkid"],
  [],
);

// ---------------------------------------------------------------------------
// CASE-INSENSITIVE last-name match.
// ---------------------------------------------------------------------------
expectPairs(
  "last-name match is case-insensitive",
  ["Jonathan SMITH"],
  ["Jon smith"],
  [{ cleared: "Jonathan SMITH", added: ["Jon smith"] }],
);

// ---------------------------------------------------------------------------
// MULTIPLE ADDED sharing the cleared last name are all reported.
// ---------------------------------------------------------------------------
expectPairs(
  "multiple added same last name are grouped",
  ["Robert Garcia"],
  ["Bob Garcia", "Bobby Garcia"],
  [{ cleared: "Robert Garcia", added: ["Bob Garcia", "Bobby Garcia"] }],
);

// ---------------------------------------------------------------------------
// NO overlap at all => empty.
// ---------------------------------------------------------------------------
expectPairs("nothing cleared or added => empty", [], [], []);
expectPairs(
  "cleared but nothing added => empty",
  ["Rhys Plunkett"],
  [],
  [],
);

// ---------------------------------------------------------------------------
// SINGLE-TOKEN names (no last name) must never match each other or throw.
// ---------------------------------------------------------------------------
expectPairs(
  "single-token names have no last name => not flagged",
  ["Madonna"],
  ["Cher"],
  [],
);
expectPairs(
  "single-token identical names are still not flagged (no last name)",
  ["Prince"],
  ["Prince"],
  [],
);

// ---------------------------------------------------------------------------
// MULTI-WORD last names match on the final token (conservative by design).
// ---------------------------------------------------------------------------
expectPairs(
  "multi-word surname matches on final token",
  ["Maria De La Cruz"],
  ["Mari Cruz"],
  [{ cleared: "Maria De La Cruz", added: ["Mari Cruz"] }],
);

// ---------------------------------------------------------------------------
// EXTRA WHITESPACE around/inside names is tolerated.
// ---------------------------------------------------------------------------
expectPairs(
  "extra whitespace tolerated",
  ["  Rhys   Plunkett  "],
  ["Patrick  Plunkett"],
  [{ cleared: "  Rhys   Plunkett  ", added: ["Patrick  Plunkett"] }],
);

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------
const total = passed + failures.length;
if (failures.length === 0) {
  console.log(`✅ name-mismatch: all ${total} checks passed`);
  process.exit(0);
} else {
  console.error(`❌ name-mismatch: ${failures.length}/${total} checks FAILED\n`);
  failures.forEach((f, i) => console.error(`  ${i + 1}. ${f}\n`));
  process.exit(1);
}
