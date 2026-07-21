/**
 * COMPONENT: Duplicate Detection (StatsImport)
 * ==============================================================================
 * A self-contained component of the Stats Align Pipeline. Google Apps Script
 * treats every file in a project as one shared global namespace, so the primary
 * pipeline (StatsImport-and-Align.js) calls into this file by function name with
 * no import/require — the two files are linked simply by living in the same
 * Apps Script project.
 *
 * WHY IT EXISTS
 *   Coach stat files arrive at different times and are imported one team at a
 *   time. It is easy to lose track of which teams have already been imported and
 *   accidentally append the same team's players to Raw_Stats twice. This
 *   component compares the aligned incoming rows against the existing Raw_Stats
 *   rows BEFORE they are written and warns the user, who confirms or cancels.
 *
 * TWO-TIER MATCHING (why AVG matters)
 *   A player identity is number + last + first (normalized). Identity alone
 *   answers "is this player already in Raw_Stats?" but cannot tell a true
 *   re-import from a legitimate mid-season stats UPDATE for the same child.
 *   Batting AVG (more unique than a name) disambiguates:
 *     - identity + AVG match  → EXACT: almost certainly a re-import of the same
 *       file. Blocking these avoids literal duplicate rows.
 *     - identity match, AVG differs → IDENTITY-ONLY: same player, different
 *       numbers — possibly newer stats. Surfaced separately so the human decides.
 *   When the layout has no AVG column, the AVG tier is skipped gracefully and
 *   every identity match is reported as identity-only.
 *
 * SAFETY
 *   This component NEVER edits or deletes data. Its only effects are a
 *   confirmation dialog and (on cancel) a single Automation_Logs entry.
 *
 * PUBLIC SURFACE
 *   confirmNoDuplicatesOrAbort(...) — orchestrator called by the pipeline.
 *   detectDuplicates / buildIdentityKey / normToken — pure, unit-tested helpers
 *   (see tests/duplicate-detection.test.js).
 */

// ============================================================================
// PURE HELPERS (unit-tested — no Google globals)
// ============================================================================

/**
 * Normalizes a cell value into a stable comparison token: coerced to string,
 * trimmed, lowercased, with internal whitespace collapsed to single spaces.
 * Null/undefined become "".
 *
 * @param {*} v - Any cell value.
 * @return {string} Normalized token.
 */
function normToken(v) {
  return (v == null ? "" : v.toString())
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Builds a player identity key "number|last|first" from a row that is already
 * aligned to the Raw_Stats master column model.
 *
 * Returns "" (a non-key) when both last and first are blank, so junk/blank rows
 * are ignored by the caller rather than colliding on an empty identity.
 *
 * @param {Array<*>} row - A row aligned to the master column model.
 * @param {{number:(number|undefined), last:number, first:number}} cols
 *        Column indices for Number, Last, First within the master model.
 * @return {string} Identity key, or "" if the row has no name.
 */
function buildIdentityKey(row, cols) {
  const last = normToken(row[cols.last]);
  const first = normToken(row[cols.first]);
  if (last === "" && first === "") return "";
  return normToken(row[cols.number]) + "|" + last + "|" + first;
}

/**
 * Classifies each incoming aligned row against the existing Raw_Stats rows.
 *
 * @param {Array<Array<*>>} incomingRows - Aligned rows about to be appended.
 * @param {Array<Array<*>>} existingRows - Current Raw_Stats data rows.
 * @param {{number:(number|undefined), last:number, first:number,
 *          avg:(number|undefined)}} cols
 *        Column indices. avg may be -1/undefined when no AVG column exists.
 * @return {{exact: string[], identityOnly: string[]}}
 *         Display labels for exact re-imports and identity-only matches.
 */
function detectDuplicates(incomingRows, existingRows, cols) {
  const hasAvg = cols.avg != null && cols.avg >= 0;
  const identitySet = new Set();
  const identityAvgSet = new Set();

  existingRows.forEach(function (r) {
    const id = buildIdentityKey(r, cols);
    if (id === "") return;
    identitySet.add(id);
    if (hasAvg) identityAvgSet.add(id + "|" + normToken(r[cols.avg]));
  });

  const exact = [];
  const identityOnly = [];

  incomingRows.forEach(function (r) {
    const id = buildIdentityKey(r, cols);
    if (id === "") return;

    const num = normToken(r[cols.number]);
    const lastRaw = (r[cols.last] == null ? "" : r[cols.last]).toString().trim();
    const label = num ? "#" + num + " " + lastRaw : lastRaw;

    if (hasAvg && identityAvgSet.has(id + "|" + normToken(r[cols.avg]))) {
      exact.push(label);
    } else if (identitySet.has(id)) {
      identityOnly.push(label);
    }
  });

  return { exact: exact, identityOnly: identityOnly };
}

/**
 * Resolves the master column index of the Batting AVG column, tolerating header
 * variations. Prefers the canonical "Batting_AVG" key, then any key ending in
 * "AVG" (e.g. a differently-sectioned average column).
 *
 * @param {Object<string, number>} masterColMap - Master key → column index.
 * @return {number} Column index, or -1 if no AVG column is present.
 */
function resolveAvgColumn(masterColMap) {
  if (masterColMap["Batting_AVG"] != null) return masterColMap["Batting_AVG"];
  const key = Object.keys(masterColMap).find(function (k) {
    return /(^|_)avg$/i.test(k);
  });
  return key != null ? masterColMap[key] : -1;
}

// ============================================================================
// ORCHESTRATOR (uses Google UI/Sheet — invoked by the pipeline)
// ============================================================================

/**
 * Reads existing Raw_Stats rows, detects duplicates among the aligned incoming
 * rows, and — if any are found — asks the user to confirm or cancel the import.
 * On cancel, writes one Automation_Logs entry and returns false so the pipeline
 * aborts before writing anything.
 *
 * @param {GoogleAppsScript.Base.Ui} ui - Spreadsheet UI for the dialog.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} rawStatsSheet - Raw_Stats sheet.
 * @param {Array<Array<*>>} alignedData - Rows aligned and ready to append.
 * @param {Object<string, number>} masterColMap - Master key → column index.
 * @param {number} masterColCount - Total columns in the master model.
 * @param {string} timestamp - Formatted timestamp for the log entry.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} logSheet - Automation_Logs sheet.
 * @return {boolean} true to proceed with the import, false to abort.
 */
function confirmNoDuplicatesOrAbort(
  ui,
  rawStatsSheet,
  alignedData,
  masterColMap,
  masterColCount,
  timestamp,
  logSheet,
) {
  const cols = {
    number: masterColMap["General_Number"],
    last: masterColMap["General_Last"],
    first: masterColMap["General_First"],
    avg: resolveAvgColumn(masterColMap),
  };

  // Without name columns there is nothing meaningful to compare on — proceed.
  if (cols.last == null || cols.first == null) return true;

  // Raw_Stats has two header rows; player data starts on row 3.
  const existingRowCount = rawStatsSheet.getLastRow() - 2;
  if (existingRowCount <= 0) return true;

  const existingRows = rawStatsSheet
    .getRange(3, 1, existingRowCount, masterColCount)
    .getValues();

  const dup = detectDuplicates(alignedData, existingRows, cols);
  if (dup.exact.length === 0 && dup.identityOnly.length === 0) return true;

  const sample = function (arr) {
    return arr.slice(0, 8).join(", ") + (arr.length > 8 ? ", …" : "");
  };

  let msg = "";
  if (dup.exact.length) {
    msg +=
      "• " +
      dup.exact.length +
      " player(s) already in Raw_Stats with identical stats " +
      "(likely a re-import):\n   " +
      sample(dup.exact) +
      "\n\n";
  }
  if (dup.identityOnly.length) {
    msg +=
      "• " +
      dup.identityOnly.length +
      " player(s) match by name/number but a different AVG " +
      "(possibly updated stats):\n   " +
      sample(dup.identityOnly) +
      "\n\n";
  }
  msg += "Proceed with import anyway?";

  const resp = ui.alert(
    "⚠️ Possible Duplicates Detected",
    msg,
    ui.ButtonSet.YES_NO,
  );
  if (resp === ui.Button.YES) return true;

  logSheet.appendRow([
    timestamp,
    "🛑 CANCELLED (duplicates)",
    dup.exact.length +
      " exact re-import match(es), " +
      dup.identityOnly.length +
      " possible-update match(es); user cancelled the import.",
    "---",
    "---",
  ]);
  return false;
}
