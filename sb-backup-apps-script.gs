// ── Sandbar Cashout — Backup Apps Script ─────────────────────────────────────
// Append-only raw log of every cashout submission. Completely independent from
// the main Apps Script — no shared code, no shared sheet, no shared state.
//
// Design: maximally boring on purpose. One sheet, append forever.
// No date tabs, no template cloning, no row-slot logic. If the main Apps
// Script breaks for any reason, this one keeps logging because it has none
// of the same moving parts.
//
// Row granularity: ONE ROW PER PERSON (not per cashout). A 3-way split
// produces 3 rows sharing the same Cashout ID. This matches the iPad's
// N-rows-per-split payload shape and enables direct copy/paste from this
// backup's master-mirror columns (C-J) into the master sheet's A-H.
//
// COLUMN LAYOUT (15 columns — header row must match):
//   A: Cashout ID        (2026-04-11[REF42])
//   B: Names             (comma-separated summary of everyone in the split)
//   C: REFERENCE #       ← master sheet column A
//   D: NAME              ← master sheet column B
//   E: DUEBACK           ← master sheet column C
//   F: HOUSE             ← master sheet column D
//   G: BUSSER            ← master sheet column E
//   H: BAR               ← master sheet column F  (blank for bar cashouts)
//   I: EXPO              ← master sheet column G
//   J: EVENTS            ← master sheet column H
//   K: Received At
//   L: Cashout Type
//   M: Shared By
//   N: Submit Type       (NEW or RESUBMIT)
//   O: Raw Data          (full JSON of entire submission)
//
// To copy a cashout to the master sheet manually: select C:J for the rows
// you want, paste into A:H of the master sheet's daily tab.
//
// For sushi cashouts, columns C-J now mirror the master sheet (per-person
// rows with suffixed REF#, name, and dueback amount; tip-outs zeroed).
//
// SETUP:
//   1. Set BACKUP_SHEET_ID to the [BackupLog]AllCashouts spreadsheet ID.
//   2. Paste the header row into row 1 of the sheet:
//      Cashout ID | Names | REFERENCE # | NAME | DUEBACK | HOUSE | BUSSER |
//      BAR | EXPO | EVENTS | Received At | Cashout Type | Shared By |
//      Submit Type | Raw Data
//   3. Deploy as a SEPARATE Web App (Execute as: Me, Who has access: Anyone).
//      This must be a different deployment from the main Apps Script.
//   4. Paste the Web App URL into the HTML file's BACKUP_SCRIPT_URL constant.
// ─────────────────────────────────────────────────────────────────────────────

const BACKUP_SHEET_ID = '1AIsfen18Tzbvhrhd4pPsCLnZXi_-iGgNAN297chb7g4';

// ── Entry point ───────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var rows = data.rows;
    if (!rows || rows.length === 0) throw new Error('No rows provided');

    var ss = SpreadsheetApp.openById(BACKUP_SHEET_ID);
    var sheet = ss.getSheets()[0];  // Always use the first tab
    var receivedAt = Utilities.formatDate(new Date(), 'America/Vancouver', 'yyyy-MM-dd HH:mm:ss');
    var cashoutDate = rows[0].cashoutDate || '';
    var section = rows[0].section || '';
    var refNum = rows[0].refNum || '';
    var isResubmit = data.isResubmit === true;

    // Build a comma-separated list of names from all rows
    var names = rows.map(function(r) { return r.name || ''; }).join(', ');

    // Build the Cashout ID (matches the format used in the iPad Backups screen)
    // Format: YYYY-MM-DD[REF{nn}] — date first for scanning, REF# in brackets
    // Apply the same REF# suffix as the main script for backup consistency
    var suffix = '';
    if (section === 'PM Sushi') suffix = '-Sushi';
    else if (section.indexOf('Bar Main') !== -1) suffix = '-MainBar';
    else if (section.indexOf('Bar Upstairs') !== -1) suffix = '-UpstairsBar';
    var refNumFull = refNum + suffix;

    var cashoutId = cashoutDate + '[REF' + refNum + ']';
    var rawJson = JSON.stringify(data);
    var isSushi = (section === 'PM Sushi');
    var submitType = isResubmit ? 'RESUBMIT' : 'NEW';

    // Append one row PER PERSON (N rows per split, 1 row for solos).
    // Columns C-J mirror the master sheet's A-H layout exactly, so the manager
    // can select those cells and paste them directly into the master sheet if
    // they ever need to copy a cashout by hand.
    //
    // Layout (15 columns):
    //   A: Cashout ID
    //   B: Names (summary — comma-separated for splits, single name for solos)
    //   C: REFERENCE #     <-- master sheet column A
    //   D: NAME            <-- master sheet column B
    //   E: DUEBACK         <-- master sheet column C
    //   F: HOUSE           <-- master sheet column D
    //   G: BUSSER          <-- master sheet column E
    //   H: BAR             <-- master sheet column F  (blank for bar cashouts, matching the main script)
    //   I: EXPO            <-- master sheet column G
    //   J: EVENTS          <-- master sheet column H
    //   K: Received At
    //   L: Cashout Type
    //   M: Shared By
    //   N: Submit Type
    //   O: Raw Data (full JSON of entire submission — same in every row of a split)
    //
    rows.forEach(function(row) {
      var isBar = section.indexOf('Bar') !== -1;

      if (isSushi) {
        // Sushi: per-person rows with suffixed REF#, name, dueback; tip-outs zeroed
        var amt = row.amount || 0;
        var duebackValue = amt < 0 ? amt : (amt > 0 ? amt : 0);

        sheet.appendRow([
          cashoutId,          // A
          names,              // B
          refNumFull,         // C — REFERENCE # (e.g. "45-Sushi")
          row.name || '',     // D — NAME
          duebackValue,       // E — DUEBACK
          0,                  // F — HOUSE
          0,                  // G — BUSSER
          0,                  // H — BAR
          0,                  // I — EXPO
          0,                  // J — EVENTS
          receivedAt,         // K
          section,            // L
          rows.length,        // M
          submitType,         // N
          rawJson,            // O
        ]);
      } else {
        // Server / Bar: compute the master-sheet values using the same conventions
        // as the main Apps Script (dueback sign convention, BAR blank for bar cashouts).
        var duebackValue = (row.owesHouse > 0) ? row.owesHouse : -(row.dueback || 0);
        var barValue = isBar ? '' : (row.bar || 0);

        sheet.appendRow([
          cashoutId,          // A
          names,              // B
          refNumFull,         // C — REFERENCE # (with suffix for bar)
          row.name || '',     // D — NAME
          duebackValue,       // E — DUEBACK
          row.house || 0,     // F — HOUSE
          row.busser || 0,    // G — BUSSER
          barValue,           // H — BAR
          row.expo || 0,      // I — EXPO
          row.events || 0,    // J — EVENTS
          receivedAt,         // K
          section,            // L
          rows.length,        // M
          submitType,         // N
          rawJson,            // O
        ]);
      }
    });

    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Backup logged',
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput('Sandbar Cashout Backup API — running');
}

// ── Test function ─────────────────────────────────────────────────────────────
function testBackup() {
  var testData = {
    isResubmit: false,
    rows: [{
      cashoutDate: '2026-04-11',
      section:     'PM Server Main',
      refNum:      '42',
      name:        'Alice',
      isFirst:     true,
      house:       70, busser: 20, bar: 20, expo: 22.50, events: 0,
      dueback:     132.50, owesHouse: 0,
    }],
  };

  Logger.log('Running backup test...');
  var fakeEvent = { postData: { contents: JSON.stringify(testData) } };
  var result = doPost(fakeEvent);
  Logger.log(result.getContent());
}
