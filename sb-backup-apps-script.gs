// ── Sandbar Cashout — Backup Apps Script ─────────────────────────────────────
// Append-only raw log of every cashout submission. Completely independent from
// the main Apps Script — no shared code, no shared sheet, no shared state.
//
// Design: maximally boring on purpose. One sheet, one row per submission,
// append forever. No date tabs, no template cloning, no section mapping, no
// row-slot logic. If the main Apps Script breaks for any reason, this one
// keeps logging because it has none of the same moving parts.
//
// SETUP:
//   1. Set BACKUP_SHEET_ID to the [BackupLog]AllCashouts spreadsheet ID.
//   2. Deploy as a SEPARATE Web App (Execute as: Me, Who has access: Anyone).
//      This must be a different deployment from the main Apps Script.
//   3. Paste the Web App URL into the HTML file's BACKUP_SCRIPT_URL constant.
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
    var cashoutId = cashoutDate + '[REF' + refNum + ']';

    // Append one row per submission (not per person)
    // Columns: Cashout ID | Received At | Cashout Type | Shared By | Names | Submit Type | Raw Data
    sheet.appendRow([
      cashoutId,                           // A — Cashout ID (2026-04-11[REF42])
      receivedAt,                          // B — When the backup script received it
      section,                             // C — Cashout type (e.g. PM Server Main)
      rows.length,                         // D — Shared by (number of people)
      names,                               // E — All names (comma-separated)
      isResubmit ? 'RESUBMIT' : 'NEW',    // F — Submit type
      JSON.stringify(data),                // G — Full raw JSON payload
    ]);

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
