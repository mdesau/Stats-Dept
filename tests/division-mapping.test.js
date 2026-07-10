/**
 * division-mapping.test.js
 * ============================================================================
 * WHAT THIS TESTS
 *   The two functions in "AutoUpdate Regs to Stats" that decide how a coach's
 *   registration "Division Name" becomes the value written to the Draft_Stats
 *   "Draft" column:
 *     - shortenDiv(name)   -> abbreviated label ("IMP", "AMP", "Minors", "Majors")
 *     - isExcludedDiv(name) -> true if the division is NOT part of the draft
 *
 * WHY IT EXISTS
 *   The league renames its programs almost every season. This test locks in the
 *   expected mapping for the CURRENT season's names AND older spellings, so a
 *   future edit that breaks the mapping fails here instead of silently
 *   corrupting the draft board. (Covers BUG-003.)
 *
 * HOW IT WORKS
 *   Apps Script code can't run under Node directly (it calls Google globals at
 *   load time). We load the REAL source into a Node `vm` sandbox with those
 *   globals stubbed, then exercise the genuine functions — no copies, no mocks
 *   of the logic under test.
 *
 * HOW TO RUN
 *   node tests/division-mapping.test.js
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
  "StatsUpdate.js",
);

function loadFunctions() {
  const src = fs.readFileSync(SOURCE, "utf8");
  const sandbox = {
    // Referenced at module load (line ~110) and by unrelated helpers.
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
    src + "\n;this.__shortenDiv = shortenDiv; this.__isExcludedDiv = isExcludedDiv;";
  vm.runInContext(exposed, sandbox, { filename: "AutoUpdate.js" });
  return { shortenDiv: sandbox.__shortenDiv, isExcludedDiv: sandbox.__isExcludedDiv };
}

const { shortenDiv, isExcludedDiv } = loadFunctions();

// ---------------------------------------------------------------------------
// Tiny assertion helper (no test framework dependency).
// ---------------------------------------------------------------------------
let passed = 0;
const failures = [];

function check(label, actual, expected) {
  if (actual === expected) {
    passed += 1;
  } else {
    failures.push(`${label}\n     expected: ${JSON.stringify(expected)}\n     actual:   ${JSON.stringify(actual)}`);
  }
}

/**
 * Assert the FULL outcome for a division name: whether it is excluded, and (for
 * draft divisions) the label written to the Draft column. Excluded divisions
 * are gated before shortenDiv in the pipeline, so their label is "" here.
 */
function expectDivision(name, { excluded, label }) {
  check(`isExcludedDiv("${name}")`, isExcludedDiv(name), excluded);
  const effectiveLabel = isExcludedDiv(name) ? "" : shortenDiv(name);
  check(`draftLabel("${name}")`, effectiveLabel, excluded ? "" : label);
}

// ---------------------------------------------------------------------------
// CURRENT SEASON — 2026 Fall Draft program names (the reason for BUG-003).
// ---------------------------------------------------------------------------
expectDivision("Intermediate Machine Pitch - Little League Baseball", { excluded: false, label: "IMP" });
expectDivision("Minor - Player Pitch - Little League Baseball", { excluded: false, label: "Minors" });
expectDivision("Advanced Machine Pitch - Little League Baseball", { excluded: false, label: "AMP" });
expectDivision("Major - Little League Baseball", { excluded: false, label: "Majors" });
expectDivision("Rookie - Coach Pitch - Little League Baseball", { excluded: true, label: "" });
expectDivision("Evaluation - Little League Baseball", { excluded: true, label: "" });
expectDivision("Junior - Little League Baseball", { excluded: false, label: "Juniors" });

// ---------------------------------------------------------------------------
// REGRESSION — older season spellings must keep working (keyword matching).
// ---------------------------------------------------------------------------
expectDivision("IMP Machine Pitch", { excluded: false, label: "IMP" });
expectDivision("AMP Machine Pitch", { excluded: false, label: "AMP" });
expectDivision("Majors", { excluded: false, label: "Majors" });
expectDivision("Minor - Player Pitch", { excluded: false, label: "Minors" });
expectDivision("Rookie (Coach Pitch)", { excluded: true, label: "" });
expectDivision("Tee Ball - Little League Baseball", { excluded: true, label: "" });

// ---------------------------------------------------------------------------
// EDGE CASES — empty/blank inputs must not throw and must be non-draft-safe.
// ---------------------------------------------------------------------------
check('shortenDiv("")', shortenDiv(""), "");
check("shortenDiv(null)", shortenDiv(null), "");
check("isExcludedDiv(null)", isExcludedDiv(null), false);
check('isExcludedDiv("")', isExcludedDiv(""), false);

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------
const total = passed + failures.length;
if (failures.length === 0) {
  console.log(`✅ division-mapping: all ${total} checks passed`);
  process.exit(0);
} else {
  console.error(`❌ division-mapping: ${failures.length}/${total} checks FAILED\n`);
  failures.forEach((f, i) => console.error(`  ${i + 1}. ${f}\n`));
  process.exit(1);
}
