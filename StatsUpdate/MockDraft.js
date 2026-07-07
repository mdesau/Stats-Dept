/**
 * MOCK DRAFT TOOL
 * ==============================================================================
 * Provides the backend logic for the AI Mock Draft Tool.
 * Handlers for the HTML Modal Dialog and interaction with Gemini.
 */

// --- DEBUGGING KNOBS ---
const ENABLE_MOCK_DEBUG_INSPECTION = false; // Set to TRUE to inspect JSON payload errors without calling AI. Set to FALSE for production.

// Debug Logger Helper for Mock Draft (uses main script's logDebug if available)
function logMockDebug(event, payload) {
  // Safe check for DEBUG_FLAGS to prevent null pointer errors
  if (typeof DEBUG_FLAGS !== 'undefined' && DEBUG_FLAGS && DEBUG_FLAGS.MOCK_DRAFT) {
     if (typeof logDebug === 'function') {
       logDebug("Mock Draft", event, payload);
     } else {
       console.log(`[Mock Draft] ${event}:`, payload);
     }
  }
}

/**
 * Opens the Mock Draft Wizard dialog.
 */
function showMockDraftDialog() {
  const html = HtmlService.createHtmlOutputFromFile('MockDraftDialog')
      .setWidth(450)
      .setHeight(600)
      .setTitle('AI Mock Draft Wizard');
  SpreadsheetApp.getUi().showModalDialog(html, 'AI Mock Draft Configuration');
}

/**
 * HELPER: Finds the header row index (1-based) by searching for "Season" key.
 * Scans first 10 rows. Returns { rowNum: number, values: string[] } or throws.
 */
function findHeaderRow(sheet) {
  const maxSearch = 10;
  // Get block of data to minimize calls
  const lastCol = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();

  if (lastCol < 1 || lastRow < 1) throw new Error("Sheet appears to be empty (0 rows or 0 columns).");
  
  // Calculate safe range
  const rowsToRead = Math.min(lastRow, maxSearch);
  const data = sheet.getRange(1, 1, rowsToRead, lastCol).getValues();

  for (let i = 0; i < data.length; i++) {
    const rowValues = data[i].map(c => c.toString().trim());
    const rowStr = rowValues.join(" ").toLowerCase();
    
    // Check for "season" AND "player" to be sure it's the main table
    // or just 'season' if 'player' might be missing in some views
    if (rowValues.some(v => v.toLowerCase() === 'season')) {
      return { rowNum: i + 1, values: rowValues };
    }
  }
  
  // If we get here, we failed
  throw new Error(`Could not find a header row containing 'Season' in the first ${maxSearch} rows.`);
}

/**
 * CLIENT-SIDE HANDLER: Fetches unique Seasons from the selected Division sheet.
 * @param {string} divisionSheetName - "IMP", "AMP", "Minors", or "Majors"
 * @return {string[]} Array of unique season strings (e.g. ["Spring 2025", "Fall 2025"])
 */
function getDivisionSeasons(divisionSheetName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(divisionSheetName);
    if (!sheet) throw new Error(`Sheet "${divisionSheetName}" not found. Please ensure it exists.`);

    // 1. Find Header Row dynamically
    const headerInfo = findHeaderRow(sheet);
    logMockDebug("HEADERS_FOUND", { row: headerInfo.rowNum, headers: headerInfo.values });

    // 2. Find Season Column Index
    const seasonIdx = headerInfo.values.findIndex(h => h.toLowerCase() === 'season');
    if (seasonIdx === -1) {
       throw new Error(`Header row found at ${headerInfo.rowNum}, but 'Season' column index is -1. Headers: ${JSON.stringify(headerInfo.values)}`);
    }

    // 3. Read Data (Start from row AFTER headers)
    const startRow = headerInfo.rowNum + 1;
    if (startRow > sheet.getLastRow()) return []; // No data yet

    const data = sheet.getRange(startRow, seasonIdx + 1, sheet.getLastRow() - startRow + 1, 1).getValues();
    const seasons = new Set();
    
    data.forEach(r => {
      if (r[0]) seasons.add(r[0].toString().trim());
    });

    return Array.from(seasons).sort();
  } catch (e) {
    logMockDebug("SEASONS_ERROR", { error: e.message, division: divisionSheetName });
    console.error("SEASONS_ERROR Details:", e);
    
    // Log failure to sheet for visibility
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const logSheet = ss.getSheetByName("Automation Log");
      if (logSheet) {
        logSheet.appendRow([new Date(), "AI", "❌ Failed", `Mock Draft (Seasons): ${e.message}`]);
      }
    } catch (loggingErr) {
      console.error("Failed to write to Automation Log", loggingErr);
    }

    throw e;
  }
}

/**
 * CLIENT-SIDE HANDLER: Fetches headers to use as potential Weighted Stats.
 * Excludes metadata columns like Name, Season, Team.
 */
function getDivisionStatColumns(divisionSheetName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(divisionSheetName);
    if (!sheet) return [];

    // Use helper to find correct headers
    const headerInfo = findHeaderRow(sheet);
    const headers = headerInfo.values;

    const excluded = ['player', 'name', 'first', 'last', 'season', 'team', 'division', 'id', 'timestamp', 'draft', 'challenge', 'birth'];
    
    return headers.filter(h => {
      const lower = h.toString().toLowerCase();
      // Filter out empty headers and excluded keywords
      return h && !excluded.some(ex => lower.includes(ex));
    });
  } catch (e) {
     logMockDebug("STATS_COLS_ERROR", { error: e.message, division: divisionSheetName });

    // Log failure to sheet for visibility
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const logSheet = ss.getSheetByName("Automation Log");
      if (logSheet) {
        logSheet.appendRow([new Date(), "AI", "❌ Failed", `Mock Draft (Stats Load): ${e.message}`]);
      }
    } catch (loggingErr) {
      console.error("Failed to write to Automation Log", loggingErr);
    }

     throw e; 
  }
}

/**
 * MAIN EXECUTION: Runs the Mock Draft process.
 * 1. Reads data from Division sheet
 * 2. Filters by Season
 * 3. Builds Prompt
 * 4. Calls Gemini
 * 5. Creates Output Sheet
 */
function runMockDraft(config) {
  try {
    // Guard against manual execution to prevent cryptic parameters errors
    if (!config || !config.division) throw new Error("Configuration missing. This function must be called from the Mock Draft Dialog.");

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(config.division);
    if (!sheet) throw new Error("Sheet not found: " + config.division);

    logMockDebug("START_DRAFT", { config: config });

    // 1. FIND HEADERS & READ DATA
    const headerInfo = findHeaderRow(sheet);
    const headers = headerInfo.values;
    const startRow = headerInfo.rowNum + 1;

    // Log the structure we are working with
    logMockDebug("SHEET_STRUCTURE", { headerRow: headerInfo.rowNum, cols: headers });

    const data = sheet.getRange(startRow, 1, sheet.getLastRow() - startRow + 1, sheet.getLastColumn()).getValues();
  
    const seasonIdx = headers.findIndex(h => h.toLowerCase() === 'season');
    if (seasonIdx === -1) throw new Error('Season column missing in found header row.');

    // Helper to find name and identification columns
    const fNameIdx = headers.findIndex(h => h.toLowerCase().includes('first name'));
    const lNameIdx = headers.findIndex(h => h.toLowerCase().includes('last name') && !h.toLowerCase().includes('first'));
    const birthIdx = headers.findIndex(h => h.toLowerCase().includes('birth'));

    // --- CONSOLIDATE PLAYERS LOGIC ---
    // Instead of filtering by a single season, we group ALL data by player (Name + Birthdate)
    // Then we select the "Most Recent Available Stats" for each player to build the draft pool.
    
    const playersMap = new Map(); // Key: "First_Last_Birth", Value: Array of row arrays

    data.forEach(row => {
       // Ensure we have at least a name
       if (fNameIdx === -1 || !row[fNameIdx]) return;
       
       const uniqueKey = `${row[fNameIdx]}_${lNameIdx > -1 ? row[lNameIdx] : ''}_${birthIdx > -1 ? row[birthIdx] : ''}`.toLowerCase().trim();
       
       if (!playersMap.has(uniqueKey)) {
         playersMap.set(uniqueKey, []);
       }
       playersMap.get(uniqueKey).push(row);
    });

    logMockDebug("UNIQUE_PLAYERS_FOUND", { count: playersMap.size });

    const players = [];

    // Iterate through every unique player and resolve their best stats
    for (const [key, rows] of playersMap.entries()) {
      let pObj = {};
      
      // 1. Establish Identity (from the first row found, as name/birth shouldn't change)
      const r0 = rows[0]; 
      if (fNameIdx > -1 && lNameIdx > -1) {
        pObj.name = `${r0[fNameIdx]} ${r0[lNameIdx]}`;
      } else {
        pObj.name = r0[0]; 
      }
      if (pObj.name) pObj.name = pObj.name.toString().replace(/"/g, "").trim();

      // 2. Select the "Best" Row based on Season Priority
      // Priority A: The user-selected "Most Recent Season" (config.season)
      // Priority B: Any other season that has populated stats (Fallback)
      // If neither, they are a "New Player".

      // Helper to check if a row has meaningful stats?
      // We check if "At Least One" of the user's weighted stats is > 0 or not empty.
      // If no weighted stats, we check generic ones.
      const hasStats = (rowToCheck) => {
         const someStats = [...(config.weightedStats1||[]), ...(config.weightedStats2||[]), ...(config.weightedStats3||[])];
         if (someStats.length === 0) someStats.push('G', 'AB', 'IP', 'AVG'); // fallback check
         
         return someStats.some(s => {
            const idx = headers.indexOf(s);
            if (idx === -1) return false;
            const val = rowToCheck[idx];
            return (val !== "" && val !== null && val !== undefined);
         });
      };

      let selectedRow = null; 
      
      // Find row matching selected season
      const seasonRow = rows.find(r => r[seasonIdx] == config.season);
      
      if (seasonRow && hasStats(seasonRow)) {
         selectedRow = seasonRow;
      } else {
         // Fallback: Find *any* row with stats. Ideally the "most recent" one if we could parse dates, 
         // but for now we take the first one that has data.
         selectedRow = rows.find(r => hasStats(r));
      }

      // 3. Mark as "New" if no stats found
      if (!selectedRow) {
         pObj.isNew = true;
         // Use the seasonRow if it exists (even if empty stats) just to get metadata, otherwise first row
         selectedRow = seasonRow || rows[0]; 
      }

      // 4. Extract Stats from the selected row
      const addStats = (list) => {
        if (!list || !Array.isArray(list)) return;
        list.forEach(statName => {
          const idx = headers.indexOf(statName);
          if (idx > -1 && !pObj[statName]) {
             let val = selectedRow[idx];
             if (!isNaN(parseFloat(val)) && isFinite(val)) {
                val = parseFloat(val);
             }
             pObj[statName] = val;
          }
        });
      };

      if (!pObj.isNew) {
         addStats(config.weightedStats1);
         addStats(config.weightedStats2);
         addStats(config.weightedStats3);
         
         // Generic Fill
         if ((!config.weightedStats1?.length) && (!config.weightedStats2?.length) && (!config.weightedStats3?.length)) {
            ['AVG', 'OBP', 'SLG', 'ERA', 'IP'].forEach(s => {
               const idx = headers.findIndex(h => h.includes(s));
               if (idx > -1) pObj[s] = selectedRow[idx];
            });
         }
      }

      players.push(pObj);
    }
  
  if (players.length < config.teams) {
      throw new Error(`Not enough players (${players.length}) for ${config.teams} teams.`);
    }

    logMockDebug("PLAYERS_FILTERED", { count: players.length, sample: players.slice(0, 3) });

  // 2. BUILD PROMPT
  
  // LIMITATION: To prevent AI Output Token overflow (JSON cut-off), we must limit the drafting pool.
  // 150 players allow for ~12 teams of 12 players.
  // If we send 200+ players, the output JSON becomes too large (8k+ tokens) and crashes.
  const MAX_PLAYERS_FOR_AI = 150;
  let activePlayers = players;
  let poolLimitMsg = "";
  
  if (players.length > MAX_PLAYERS_FOR_AI) {
    activePlayers = players.slice(0, MAX_PLAYERS_FOR_AI);
    poolLimitMsg = `(Note: Drafting pool limited to top ${MAX_PLAYERS_FOR_AI} loaded players to prevent data overflow)`;
    logMockDebug("POOL_LIMITED", { original: players.length, new: activePlayers.length });
  }

  // Construct user weighting text
  let weightingText = "";
  if (config.weightedStats1?.length) weightingText += `- TIER 1 (HIGHEST VALUE): ${config.weightedStats1.join(', ')}\n`;
  if (config.weightedStats2?.length) weightingText += `- TIER 2 (NEAR ELITE): ${config.weightedStats2.join(', ')}\n`;
  if (config.weightedStats3?.length) weightingText += `- TIER 3 (SOLID OPTIONS): ${config.weightedStats3.join(', ')}\n`;
  if (!weightingText) weightingText = "- Use standard baseball evaluation (OBP, SLG, ERA, IP, INN for catchers)";
  weightingText += `\n- NEW PLAYERS (isNew:true): Draft these LAST ROUND ONLY.`;

  // Build compact prompt for single API call
  const playerJson = JSON.stringify(activePlayers);
  const totalPicks = config.teams * 12; // 12 rounds standard
  
  const prompt = `
ROLE: Baseball draft analyst for youth league snake draft.
TASK: Generate complete ${config.teams}-team draft order (12 rounds, ${totalPicks} total picks).

DRAFT RULES:
- Snake format: Rounds alternate direction (1→${config.teams}, ${config.teams}→1)
- 12 players per team
- Two-way players (hitting + pitching) are premium
- Catchers (high INN stat) are scarce/valuable

SELECTION CRITERIA:
${weightingText}
${config.guidelines ? '- User Note: ' + config.guidelines : ''}

PLAYER POOL (${activePlayers.length} available):
${playerJson}

OUTPUT (COMPACT FORMAT):
Return ONLY a flat array of ${totalPicks} player names in draft order.
{
  "draftOrder": ["Pick1 Name", "Pick2 Name", "Pick3 Name", ...]
}

CRITICAL REQUIREMENTS:
- Exactly ${totalPicks} names
- Use EXACT names from player pool
- NO markdown, NO comments, JUST JSON
- Best available each pick considering ALL players
`;

  // 3. CALL GEMINI (SINGLE COMPACT REQUEST)
  const client = new GeminiClient("gemini-3-flash-preview", 0.4);
  
  // PRODUCTION LOGGING: Record the start of the draft
  try {
     const logSheet = ss.getSheetByName("Automation Log");
     if (logSheet) {
        let statsPrefix = "";
        try {
          const props = PropertiesService.getScriptProperties().getProperties();
          if (props.AI_METRIC_RPM) {
            const fmt = (n) => n > 999 ? (n/1000).toFixed(1) + 'k' : n;
            statsPrefix = `[Before: RPM(${props.AI_METRIC_RPM}) TPM(${fmt(props.AI_METRIC_TPM)}) RPD(${props.AI_METRIC_RPD})] --- `;
          }
        } catch (e) { /* ignore */ }
        
        logSheet.appendRow([
            new Date(), 
            "AI", 
            "▶️ Draft Start", 
            `${statsPrefix}Drafting ${totalPicks} picks from ${activePlayers.length} players for ${config.teams} teams using ${client.modelName}...`
        ]);
     }
  } catch(e) { console.error(e); }

  let generationSuccess = false;
  let draftResult;
  
  try {
     logMockDebug("SENDING_PROMPT", { players: activePlayers.length, totalPicks, promptSize: prompt.length });
     draftResult = client.generateJson(prompt, { maxTokens: 2048 });
     
     if (!draftResult.draftOrder || !Array.isArray(draftResult.draftOrder)) {
       throw new Error("AI response missing 'draftOrder' array");
     }
     
     if (draftResult.draftOrder.length < totalPicks) {
       throw new Error(`Received ${draftResult.draftOrder.length} picks, expected ${totalPicks}. Try fewer teams or simpler criteria.`);
     }
     
     generationSuccess = true;
     
  } catch (genError) {
     logMockDebug("DRAFT_FAIL", { msg: genError.message });
     
     // Log the failure with accounting stats
     const guidelinesText = config.guidelines ? ` | Note: ${config.guidelines}` : "";
     const p1 = config.weightedStats1?.length ? `P1:[${config.weightedStats1}]` : "";
     const p2 = config.weightedStats2?.length ? `P2:[${config.weightedStats2}]` : "";
     const p3 = config.weightedStats3?.length ? `P3:[${config.weightedStats3}]` : "";
     const logDetails = 
       `Mock Draft Generator --- ${config.division} --- ${config.season} --- ${config.teams} Teams --- Priorities: (${p1} ${p2} ${p3}) ${guidelinesText} ${poolLimitMsg} [FAILED: ${genError.message.substring(0, 100)}]`;
     
     if (typeof logAiActivity === 'function') {
       logAiActivity("Mock Draft Generator", client.modelName || "gemini-3-flash-preview", logDetails);
     }
     
     throw new Error(`Draft failed: ${genError.message}`);
  }

  // 4. APPLY SNAKE DRAFT LOGIC
  // Convert flat draft order into team rosters
  const teams = [];
  for (let i = 0; i < config.teams; i++) {
    teams.push({ name: `Team ${i + 1}`, players: [] });
  }
  
  let pickIdx = 0;
  for (let round = 0; round < 12; round++) {
    const isSnakeReverse = (round % 2 === 1); // Even rounds (0,2,4...) go forward, odd go reverse
    
    for (let teamOffset = 0; teamOffset < config.teams; teamOffset++) {
      const teamIdx = isSnakeReverse ? (config.teams - 1 - teamOffset) : teamOffset;
      const playerName = draftResult.draftOrder[pickIdx];
      
      if (playerName && pickIdx < totalPicks) {
        teams[teamIdx].players.push(playerName);
      }
      pickIdx++;
    }
  }
  
  const result = { teams };
  logMockDebug("DRAFT_COMPLETE", { totalTeams: teams.length, avgRoster: teams[0]?.players.length });

  // 4. WRITE TO SHEET
  const targetSheetName = `${config.division} Mock Draft`;
  let targetSheet = ss.getSheetByName(targetSheetName);
  if (targetSheet) {
    targetSheet.clear();
  } else {
    targetSheet = ss.insertSheet(targetSheetName);
  }

  // Setup Headers: Row 1 = Team Names
  if (!result.teams || result.teams.length === 0) throw new Error("AI returned no teams.");
  
  // Sort teams by numeric name if possible to ensure Team 1, Team 2 order
  result.teams.sort((a,b) => {
    const na = parseInt(a.name.replace(/\D/g,'')) || 0;
    const nb = parseInt(b.name.replace(/\D/g,'')) || 0;
    return na - nb;
  });

  const teamNames = result.teams.map(t => t.name);
  targetSheet.getRange(1, 2, 1, teamNames.length).setValues([teamNames])
    .setFontWeight('bold')
    .setBackground('#cfe2f3')
    .setHorizontalAlignment('center');
    
  targetSheet.getRange(1, 1).setValue("Round").setFontWeight('bold');

  // Fill Data
  // Determine max roster size
  const maxRoster = Math.max(...result.teams.map(t => t.players.length));
  const grid = [];
  
  for (let r = 0; r < maxRoster; r++) {
    const row = [r + 1]; // Round Number
    for (let t = 0; t < teamNames.length; t++) {
      const player = result.teams[t].players[r] || "";
      row.push(player);
    }
    grid.push(row);
  }

  targetSheet.getRange(2, 1, grid.length, grid[0].length).setValues(grid);
  
  // Format
  targetSheet.autoResizeColumns(1, grid[0].length);
  targetSheet.setFrozenRows(1);
  targetSheet.setFrozenColumns(1);
  
  // Highlighting New Players
  // We need to scan the grid we just wrote, or scan the result object to find where the "isNew" players landed
  // Since the result object structure is Team -> Players Array, we can lookup the cell coordinates.
  // We need to match names back to the Result.
  
  // Build a set of 'New' names from the input
  const newPlayerNames = new Set(players.filter(p => p.isNew).map(p => p.name));
  
  if (newPlayerNames.size > 0) {
      const range = targetSheet.getRange(2, 2, grid.length, grid[0].length - 1); // Content only
      const values = range.getValues();
      const backgrounds = range.getBackgrounds();
      
      let hasChanges = false;
      for (let r = 0; r < values.length; r++) {
         for (let c = 0; c < values[r].length; c++) {
            const nameInCell = values[r][c];
            if (newPlayerNames.has(nameInCell)) {
               backgrounds[r][c] = "#ffcdd2"; // Light Red/Pink
               hasChanges = true;
            }
         }
      }
      if (hasChanges) {
         range.setBackgrounds(backgrounds);
      }
  }

  // --- FINAL LOGGING (SUCCESS CASE) ---
  if (generationSuccess) {
    // Mock Draft Generator --- [Division] --- [Season] --- [# of Teams] --- [Priorites]
    const guidelinesText = config.guidelines ? ` | Note: ${config.guidelines}` : "";
    // Construct simplified logging for priorities
    const p1 = config.weightedStats1?.length ? `P1:[${config.weightedStats1}]` : "";
    const p2 = config.weightedStats2?.length ? `P2:[${config.weightedStats2}]` : "";
    const p3 = config.weightedStats3?.length ? `P3:[${config.weightedStats3}]` : "";
    
    const logDetails = 
      `Mock Draft Generator --- ${config.division} --- ${config.season} --- ${config.teams} Teams --- Priorities: (${p1} ${p2} ${p3}) ${guidelinesText} ${poolLimitMsg}`;

    // Assuming logAiActivity is available from the main script
    if (typeof logAiActivity === 'function') {
      logAiActivity("Mock Draft Generator", client.modelName || "gemini-3-flash-preview", logDetails);
    }
  }

  return true;

  } catch (e) {
    // Log failure
    logMockDebug("MOCK_FAIL", { error: e.message, stack: e.stack });
    
    // Try to log to Automation Log if handled error
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName("Automation Log");
    if (logSheet) {
       logSheet.appendRow([new Date(), "AI", "❌ Failed", `Mock Draft Generator: ${e.message}`]);
    }
    
    throw e;
  }
}

/**
 * DIAGNOSTIC TOOL
 * Run this from the Apps Script Editor to verify permissions and read access.
 * If this fails, the issue is environmental (permissions/scopes).
 * If this works, the issue is likely strictly in the UI/Client communication.
 */
function runDiagnostics() {
  const result = {
    step: "Start",
    success: false,
    details: []
  };

  function log(msg) {
    console.log(msg);
    result.details.push(msg);
  }

  try {
    log("1. Checking Spreadsheet Access...");
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    log(`   ✅ Success. Name: "${ss.getName()}"`);

    log("2. Checking 'Automation Log' Sheet...");
    let logSheet = ss.getSheetByName("Automation Log");
    if (logSheet) {
      log("   ✅ Found 'Automation Log'. Testing write...");
      try {
        logSheet.appendRow([new Date(), "DIAGNOSTIC", "INFO", "Diagnostics Run Initiated"]);
        log("   ✅ Write successful.");
      } catch (logErr) {
        log(`   ❌ Write Failed: ${logErr.message}`);
      }
    } else {
      log("   ⚠️ 'Automation Log' sheet MISSING. Logging will fail silently.");
    }

    log("3. Checking for Division Sheets...");
    const sheets = ss.getSheets().map(s => s.getName());
    log(`   Found ${sheets.length} sheets: ${sheets.slice(0, 5).join(", ")}...`);

    // Try to read 'IMP' or first sheet
    const targetName = "IMP"; 
    const impSheet = ss.getSheetByName(targetName);
    
    if (impSheet) {
       log(`4. Testing Read on '${targetName}'...`);
       const rows = impSheet.getLastRow();
       const cols = impSheet.getLastColumn();
       log(`   Dims: ${rows} rows, ${cols} columns.`);
       
       if (rows > 0 && cols > 0) {
         try {
           const val = impSheet.getRange(1, 1).getValue();
           log(`   ✅ Read A1: "${val}"`);
         } catch (readErr) {
           log(`   ❌ Read A1 Failed: ${readErr.message}`);
         }
         
         // Test header scanning
         log("5. Testing Header Scan (findHeaderRow)...");
         try {
           // We define a local version or call the global one if in scope
           const headerInfo = findHeaderRow(impSheet);
           log(`   ✅ Header found on Row ${headerInfo.rowNum}: ${headerInfo.values.slice(0,3)}...`);
         } catch (hErr) {
           log(`   ❌ Header Scan Failed: ${hErr.message}`);
         }

       } else {
         log("   ⚠️ Sheet is empty, cannot test read.");
       }
    } else {
       log(`   ⚠️ Sheet '${targetName}' not found. Skipping specific read test.`);
    }
    
    result.success = true;
    log("✅ DIAGNOSTICS COMPLETE. No crashing errors.");

  } catch (e) {
    log(`❌ CRITICAL FAILURE: ${e.message}`);
    log(`   Stack: ${e.stack}`);
    result.error = e.message;
  }

  return result.details.join("\n");
}
