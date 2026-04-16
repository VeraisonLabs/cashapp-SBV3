// ── Sandbar Cashout — Google Apps Script v3 (frontend v3) ────────────────────
// Writes cashout data into a single permanent "master" Google Sheet.
// One tab per day is auto-created by copying the Template tab the first time
// a cashout for that date is submitted.
//
// NEW IN v3:
//   • Single master sheet — no more per-day Drive files, no monthly folders
//   • Protected Template tab lives inside the master sheet (not a separate file)
//   • LockService serializes all writes (fixes the v2 nextEmptyRow race condition)
//   • REF# is written to EVERY row of a cashout (not just the first)
//   • Fresh submit with existing REF# → rejected with conflict error
//   • Resubmit flag (data.isResubmit === true) → overwrites existing rows in place
//   • Overwritten rows get a " (Resubmitted)" tag in column A as a visual audit trail
//   • Orphan rows from shrinking splits are left un-tagged, visually standing out
//
// SETUP INSTRUCTIONS:
//   1. Make sure DailyCashout-Master exists in Drive and has a tab named
//      exactly "⚠️ TEMPLATE — DO NOT DELETE" with the SBCashSheet layout.
//      Protect the tab (Right-click → Protect sheet → Only you can edit).
//   2. Make sure [BackupTemplate]DailyCashout-Master exists as a separate
//      Drive file with a "Template" tab, in case the master's Template is
//      ever accidentally deleted.
//   3. Paste the master sheet's ID into MASTER_SHEET_ID below.
//   4. Deploy as a Web App (Execute as: Me, Who has access: Anyone).
//   5. Paste the Web App URL into the HTML file's SCRIPT_URL constant.
// ─────────────────────────────────────────────────────────────────────────────

const MASTER_SHEET_ID   = '1DQKwjm938StCFjOFijAALU_ApHZAW5krUXoU1_3Usxo';
const TEMPLATE_TAB_NAME = '⚠️ TEMPLATE — DO NOT DELETE';
const RESUBMIT_TAG      = ' (Resubmitted)';
const LOCK_TIMEOUT_MS   = 5000;

// ── Error codes ──────────────────────────────────────────────────────────────
// The Apps Script throws stable short codes, NOT user-facing prose. The iPad's
// JavaScript is responsible for translating each code into reassurance-first
// display copy. Full recovery steps (including URLs like the Template backup
// sheet) live in [CashApp]DevelopmentTroubleshooting.md — never in error messages sent
// back to the client.
//
//   TEMPLATE_MISSING         — the Template tab was deleted from the master sheet
//   REF_CONFLICT: <refNum>   — fresh submit tried to reuse an existing REF#
//   SECTION_FULL: <section>  — no empty rows left in that section's row range
//   RESUBMIT_NOT_FOUND: <refNum> in <section>  — currently unreachable (resubmit falls through
//       to fresh write instead of erroring). Kept in docs as a safety net in case the logic
//       is ever tightened back up.
//   UNKNOWN_SECTION: <section>  — section name didn't match SECTION_MAP

// ── Section → row ranges in the SBCashSheet layout ──────────────────────────
// Columns: A=REF#  B=NAME  C=DUEBACK  D=HOUSE  E=BUSSER  F=BAR  G=EXPO  H=EVENTS
// Dueback convention:  negative = restaurant owes staff
//                      positive = staff owes restaurant
const SECTION_MAP = {
  //                        data rows          bartender name rows (col B)
  'AM Server Main':     { dataStart: 3,  dataEnd: 10,  bartRows: null        },
  'AM Server Upstairs': { dataStart: 12, dataEnd: 16,  bartRows: null        },
  'AM Bar Main':        { dataStart: 3,  dataEnd: 10,  bartRows: [70, 72]    },
  'AM Bar Upstairs':    { dataStart: 12, dataEnd: 16,  bartRows: [74, 75]    },
  'PM Server Main':     { dataStart: 21, dataEnd: 36,  bartRows: null        },
  'PM Server Upstairs': { dataStart: 38, dataEnd: 43,  bartRows: null        },
  'PM Bar Main':        { dataStart: 21, dataEnd: 36,  bartRows: [77, 81]    },
  'PM Bar Upstairs':    { dataStart: 38, dataEnd: 43,  bartRows: [83, 84]    },
  'PM Sushi':           { sushiTipsRow: 51                                   },
};

// ── Entry point ───────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const rows = data.rows;
    const isResubmit = data.isResubmit === true;

    if (!rows || rows.length === 0) throw new Error('No rows provided');

    const cashoutDate = rows[0].cashoutDate;  // 'YYYY-MM-DD'
    const section     = rows[0].section;
    const refNum      = String(rows[0].refNum || '').trim();
    const config      = SECTION_MAP[section];

    if (!config) throw new Error('UNKNOWN_SECTION: ' + section);

    // ── Serialize all writes to prevent races ────────────────────────────────
    // Covers both the getOrCreateDailyTab race and the nextEmptyRow race that
    // existed (latently) in v2. Two simultaneous submits will be serialized.
    const lock = LockService.getScriptLock();
    lock.waitLock(LOCK_TIMEOUT_MS);
    try {
      const ss  = SpreadsheetApp.openById(MASTER_SHEET_ID);
      const tab = getOrCreateDailyTab(ss, cashoutDate);

      // ── Sushi: special path — only writes to B51, no row-based logic ─────
      if (config.sushiTipsRow) {
        writeSushiTips(tab, config.sushiTipsRow, rows[0].totalTips, isResubmit);
        return successResponse(rows.length + ' row(s) recorded (sushi)', ss);
      }

      // ── Server / Bar: find existing rows for this ref# in this section ───
      const existingRows = findRowsForRefNum(tab, config.dataStart, config.dataEnd, refNum);

      if (isResubmit) {
        // Upsert: overwrite if existing rows found, otherwise fresh-write.
        // The common case is WiFi recovery the morning after — the original
        // submit never landed, so there's nothing to overwrite. Falling
        // through to a fresh write is the correct behavior here.
        // The (Resubmitted) tag only applies to the overwrite path.
        if (existingRows.length > 0) {
          writeRowsOverwrite(tab, config, rows, existingRows);
        } else {
          writeRowsFresh(tab, config, rows);
        }
      } else {
        if (existingRows.length > 0) {
          throw new Error('REF_CONFLICT: ' + refNum);
        }
        writeRowsFresh(tab, config, rows);
      }

      return successResponse(rows.length + ' row(s) recorded', ss);
    } finally {
      lock.releaseLock();
    }

  } catch (err) {
    return errorResponse(err);
  }
}

function doGet() {
  return ContentService.createTextOutput('Sandbar Cashout API v3 — running');
}

// ── Response helpers ──────────────────────────────────────────────────────────
function successResponse(message, ss) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status:         'success',
      message:        message,
      spreadsheetUrl: ss.getUrl(),
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(err) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Daily tab management ──────────────────────────────────────────────────────
// Returns the tab for the given date, creating it from the Template tab if
// needed. Called from inside the script lock in doPost, so no internal locking.
function getOrCreateDailyTab(ss, cashoutDate) {
  const tabName = cashoutDate;  // ISO format 'YYYY-MM-DD' sorts chronologically

  let tab = ss.getSheetByName(tabName);
  if (tab) return tab;

  const template = ss.getSheetByName(TEMPLATE_TAB_NAME);
  if (!template) {
    throw new Error('TEMPLATE_MISSING');
  }

  const newTab = template.copyTo(ss);
  newTab.setName(tabName);
  return newTab;
}

// ── Find rows where column A matches the given ref# ─────────────────────────
// Match logic: extract first word from column A (handles both plain "42" and
// tagged "42 (Resubmitted)" patterns), compare as number so "1" doesn't match
// "10" or "11". Returns absolute row numbers within the sheet.
function findRowsForRefNum(sheet, startRow, endRow, refNum) {
  const target = parseInt(refNum, 10);
  if (isNaN(target)) return [];

  const range  = sheet.getRange(startRow, 1, endRow - startRow + 1, 1);
  const values = range.getValues();

  const found = [];
  for (var i = 0; i < values.length; i++) {
    var cellVal = values[i][0];
    if (cellVal === '' || cellVal == null) continue;
    var firstWord = String(cellVal).split(' ')[0];
    var num = parseInt(firstWord, 10);
    if (!isNaN(num) && num === target) {
      found.push(startRow + i);
    }
  }
  return found;
}

// ── Fresh submit: write each row to the next empty slot in the section ──────
function writeRowsFresh(sheet, config, rows) {
  rows.forEach(function(row) {
    var targetRow = nextEmptyRow(sheet, config.dataStart, config.dataEnd);
    if (!targetRow) {
      throw new Error('SECTION_FULL: ' + row.section);
    }
    writeDataRow(sheet, targetRow, row, /* isResubmitted */ false);
  });

  // Bar cashout: also write bartender name + hours to the bottom bartender section
  var isBar = rows[0].section.includes('Bar');
  if (isBar && config.bartRows) {
    rows.forEach(function(row) {
      var bartHours = (row.hours && row.hours !== '') ? Number(row.hours) : 1;
      writeBartenderRow(sheet, config.bartRows[0], config.bartRows[1], row.name || '', bartHours);
    });
  }
}

// ── Resubmit: overwrite existing rows in place, add (Resubmitted) tag ───────
// If the resubmit has fewer rows than existed (e.g. 3→2 split correction),
// orphan rows are auto-cleared (columns A-H wiped). The cleared slot becomes
// available for future cashouts via nextEmptyRow.
function writeRowsOverwrite(sheet, config, rows, existingRows) {
  var overwriteCount = Math.min(rows.length, existingRows.length);

  // Overwrite the first N rows in place
  for (var i = 0; i < overwriteCount; i++) {
    writeDataRow(sheet, existingRows[i], rows[i], /* isResubmitted */ true);
  }

  // If the resubmit has MORE rows than existed (split grew), append extras
  // using the normal next-empty-row flow. These also get the tag.
  if (rows.length > existingRows.length) {
    for (var j = overwriteCount; j < rows.length; j++) {
      var targetRow = nextEmptyRow(sheet, config.dataStart, config.dataEnd);
      if (!targetRow) {
        throw new Error('SECTION_FULL: ' + rows[j].section);
      }
      writeDataRow(sheet, targetRow, rows[j], /* isResubmitted */ true);
    }
  }

  // Clear orphan rows if the resubmit has fewer people than the original
  // (e.g. 3-way split corrected to 2-way). Only clears rows that were
  // identified by findRowsForRefNum as belonging to this specific REF#.
  for (var k = overwriteCount; k < existingRows.length; k++) {
    sheet.getRange(existingRows[k], 1, 1, 8).clearContent();
  }

  // Bar cashout: bartender-name-rows are rewritten (may leave stale duplicates
  // from the original submit that the manager will need to clean up manually).
  // Known limitation; documented in [CashApp]DevelopmentTroubleshooting.md.
  var isBar = rows[0].section.includes('Bar');
  if (isBar && config.bartRows) {
    rows.forEach(function(row) {
      var bartHours = (row.hours && row.hours !== '') ? Number(row.hours) : 1;
      writeBartenderRow(sheet, config.bartRows[0], config.bartRows[1], row.name || '', bartHours);
    });
  }
}

// ── Write a single data row (columns A-H) ────────────────────────────────────
// Centralized so fresh + resubmit paths produce identical row layouts, differing
// only in whether column A gets the (Resubmitted) tag.
function writeDataRow(sheet, targetRow, row, isResubmitted) {
  var section = row.section;
  var isBar   = section.includes('Bar');

  // Dueback value: negative = restaurant owes staff, positive = staff owes restaurant
  var duebackValue = (row.owesHouse > 0) ? row.owesHouse : -(row.dueback || 0);

  // Column F (BAR tip-out): blank for bar cashouts — bartenders don't tip themselves out
  var barValue = isBar ? '' : (row.bar || 0);

  // Column A (REF#): v3 writes the ref# to EVERY row (not just isFirst).
  // If resubmitted, append the " (Resubmitted)" tag.
  var refValue = String(row.refNum || '');
  if (isResubmitted && refValue) refValue = refValue + RESUBMIT_TAG;

  sheet.getRange(targetRow, 1, 1, 8).setValues([[
    refValue,           // A — REF#       (tagged if resubmit)
    row.name  || '',    // B — NAME
    duebackValue,       // C — DUEBACK    (neg = owed to staff, pos = staff owes house)
    row.house || 0,     // D — HOUSE      (3.5% of total sales)
    row.busser || 0,    // E — BUSSER     (1% of total sales)
    barValue,           // F — BAR        (1% of total sales; blank for bar cashouts)
    row.expo  || 0,     // G — EXPO       (1.5% of food sales)
    row.events || 0,    // H — EVENTS     (1% of BEO sales)
  ]]);
}

// ── Sushi: write total tips to B{row} ────────────────────────────────────────
// Fresh submit: only writes if the cell is currently empty (preserves v2 behavior
// where a second sushi person's submit is silently merged).
// Resubmit: forces the overwrite regardless of current value.
// Note: sushi does not support REF# conflict detection because the sheet layout
// only stores a single totalTips number, not individual REF#s. This is a hard
// constraint of the spreadsheet design, not a choice.
function writeSushiTips(sheet, tipRow, totalTips, isResubmit) {
  if (totalTips == null) return;
  sheet.getRange(tipRow, 2).setValue(totalTips);
}

// ── Bartender row: write name (col B) and hours (col C) to next empty row ────
// Equal split → hours passed as 1. Hours split → actual hours.
// Unchanged from v2.
function writeBartenderRow(sheet, startRow, endRow, name, hours) {
  if (!name) return;
  for (var r = startRow; r <= endRow; r++) {
    var nameCell = sheet.getRange(r, 2);  // Column B
    if (!nameCell.getValue()) {
      nameCell.setValue(name);
      sheet.getRange(r, 3).setValue(hours);  // Column C — hours
      return;
    }
  }
  // All slots filled — silently skip (won't break formulas)
}

// ── Find next empty row in a section (check column B = NAME) ─────────────────
// Unchanged from v2.
function nextEmptyRow(sheet, startRow, endRow) {
  for (var r = startRow; r <= endRow; r++) {
    var nameCell = sheet.getRange(r, 2);  // Column B
    if (!nameCell.getValue()) return r;
  }
  return null;
}

// ── Test function — run from Apps Script editor ──────────────────────────────
// IMPORTANT: Each test represents ONE cashout transaction (one section, one
// REF#, one or more persons for splits). Each call is an independent POST
// payload — just like the real iPad submits.
//
// Re-running this test against an already-populated tab will correctly fail
// on the conflict-detection step (that's the feature working). To re-test:
// delete the test date's tab from the master sheet first.
function testSubmission() {
  var TEST_DATE = '2026-04-11';

  // Test 1: solo server cashout
  runOneTest('Test 1 — solo server (REF 42)', {
    isResubmit: false,
    rows: [{
      cashoutDate: TEST_DATE,
      section:     'PM Server Main',
      refNum:      '42',
      name:        'Alice',
      isFirst:     true,
      house:       70, busser: 20, bar: 20, expo: 22.50, events: 0,
      dueback:     132.50, owesHouse: 0,
    }],
  });

  // Test 2: split server cashout (2 people, REF 43)
  runOneTest('Test 2 — 2-way split server (REF 43)', {
    isResubmit: false,
    rows: [
      {
        cashoutDate: TEST_DATE,
        section:     'PM Server Main',
        refNum:      '43',
        name:        'Bob',
        isFirst:     true,
        house:       35, busser: 10, bar: 10, expo: 11.25, events: 0,
        dueback:     0, owesHouse: 5.50,
      },
      {
        cashoutDate: TEST_DATE,
        section:     'PM Server Main',
        refNum:      '43',
        name:        'Carol',
        isFirst:     false,
        house:       35, busser: 10, bar: 10, expo: 11.25, events: 0,
        dueback:     66.25, owesHouse: 0,
      },
    ],
  });

  // Test 3: bar cashout (solo, REF 44)
  runOneTest('Test 3 — solo bar (REF 44)', {
    isResubmit: false,
    rows: [{
      cashoutDate: TEST_DATE,
      section:     'PM Bar Main',
      refNum:      '44',
      name:        'Dana',
      isFirst:     true,
      hours:       '',
      house:       52.50, busser: 15, bar: 0, expo: 16.50, events: 0,
      dueback:     84, owesHouse: 0,
    }],
  });

  // Test 4: sushi cashout
  runOneTest('Test 4 — sushi (REF 45)', {
    isResubmit: false,
    rows: [{
      cashoutDate: TEST_DATE,
      section:     'PM Sushi',
      refNum:      '45',
      name:        'Kenji',
      isFirst:     true,
      totalTips:   320,
    }],
  });

  // Test 5: CONFLICT — try to submit REF 42 again (should be rejected)
  runOneTest('Test 5 — conflict detection (expect rejection)', {
    isResubmit: false,
    rows: [{
      cashoutDate: TEST_DATE,
      section:     'PM Server Main',
      refNum:      '42',
      name:        'Duplicate',
      isFirst:     true,
      house:       0, busser: 0, bar: 0, expo: 0, events: 0,
      dueback:     0, owesHouse: 0,
    }],
  });

  // Test 6: RESUBMIT — overwrite REF 43 with corrected values
  runOneTest('Test 6 — resubmit REF 43 as solo (expect orphan Carol row)', {
    isResubmit: true,
    rows: [{
      cashoutDate: TEST_DATE,
      section:     'PM Server Main',
      refNum:      '43',
      name:        'Bob (corrected)',
      isFirst:     true,
      house:       70, busser: 20, bar: 20, expo: 22.50, events: 0,
      dueback:     132.50, owesHouse: 0,
    }],
  });

  // Test 7: RESUBMIT with no existing rows (WiFi recovery scenario)
  // REF 99 was never submitted. Resubmit should fall through to a
  // fresh write — this is the morning-after WiFi recovery case where
  // the original submit never reached the sheet.
  runOneTest('Test 7 — resubmit REF 99 with no existing rows (expect fresh write)', {
    isResubmit: true,
    rows: [{
      cashoutDate: TEST_DATE,
      section:     'AM Server Main',
      refNum:      '99',
      name:        'WiFi Recovery Test',
      isFirst:     true,
      house:       50, busser: 14, bar: 14, expo: 18, events: 0,
      dueback:     96, owesHouse: 0,
    }],
  });
}

function runOneTest(label, payload) {
  Logger.log('── ' + label + ' ──');
  var fakeEvent = { postData: { contents: JSON.stringify(payload) } };
  var result = doPost(fakeEvent);
  Logger.log(result.getContent());
}
