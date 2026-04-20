#SB CashApp — Developer Troubleshooting

**Living document.** Add to this as issues come up. When something breaks and you figure out how to fix it, write it down here so next time is faster.

---

## Quick orientation

The Sandbar Cashout App has **three layers** that each kick in for a different failure mode. Most problems only break ONE layer — knowing which one is broken tells you which recovery path to follow.

| Layer | What it is | When it saves you |
|---|---|---|
| **1 — Main Cashout Sheet** | The normal Google Sheet where cashouts land | Normal day |
| **2 — Backup Sheet** | A separate Google Sheet with a raw copy of every submission | Main sheet corruption, formula errors |
| **3 — iPad Local Storage** | Cashouts stored directly on the iPad itself | WiFi down, Google down, Apps Script broken |

**The golden rule:** every error message in the app ENDS with `✓ Cashout data saved to iPad`. If you see that line at the bottom of the message, **nothing is lost.** The cashout is safe on the iPad — you just need to figure out why it didn't make it to the sheet.

(The reassurance is deliberately placed LAST, not first. This is so staff can't scan the top of the screen, see "saved," and walk away without reading the actual problem. Read the whole message — the fix is in the middle, and the "it's okay" is at the bottom.)

---

## Quick reference: every status and message the Backups screen can show

| What happened | Status | Message on iPad | What to do |
|---|---|---|---|
| Cashout submitted successfully | Synced | *(blank)* | Nothing, cashout is in the sheet |
| WiFi down or no internet | Pending | `Network error, not submitted` | Check WiFi, resubmit when connected |
| Apps Script deployment broken or quota exceeded | Error | `Apps Script error (HTTP 500)` | Contact Matt |
| Apps Script URL is wrong or expired | Error | `Apps Script error (HTTP 404)` | Contact Matt |
| Template tab was deleted from cashout master sheet | Error | `Template tab not found on cashout master sheet` | Restore template from backup sheet (see steps below) |
| Staff used a REF# that's already on today's sheet | Conflict | `REF# X already exists on today's sheet` | Check if typo or intentional, then correct and resubmit or resubmit as-is to overwrite |
| Section has no empty rows left | Error | `X section is full, no empty rows` | Check sheet for duplicate/stale rows, clean up, resubmit |
| Resubmit tried but no matching rows and no empty slots | Error | `REF# X not found in [section], use fresh Submit instead` | Load into form, submit as fresh |
| Apps Script doesn't recognize the section name | Error | `Unknown section "X", contact Matt` | Screenshot it, contact Matt |
| Main sheet sync failed but backup sheet succeeded | Partial | `Main sheet sync failed, backup sheet OK` | Check backup sheet on desktop, resubmit to retry main sheet |
| Backup sheet sync failed but main sheet succeeded | Synced | `Backup sync failed (not urgent)` | Main sheet has the data, tell Matt when convenient |
| Both syncs failed | Pending | `Both syncs failed` | Resubmit when network/Google is stable |

**Flags (will be fine-tuned later):**
- The "Partial" status (main failed, backup succeeded) is a combined status from both POST results. If this needs to be simplified into just Synced/Pending/Error/Conflict, we can collapse it.
- The HTTP 500 vs 404 distinction may be unnecessary detail for the manager. These could be collapsed into a single "Apps Script error" row with "Contact Matt" as the action for both.

---

## If the staff says "the app told me to tell you something"

Staff on the iPad get specific error messages naming the artifact that's broken. They should pass you the phrase word-for-word (e.g. "template tab not found on cashout master sheet", "REF# 42 already exists"). Every error in the app also ends with `✓ Cashout data saved to iPad` at the bottom, so even if staff only quote half the message, you know nothing was lost. Look up the phrase in the table below to find the fix.

### Error: "Template tab not found on cashout master sheet"

**What it means:** Someone accidentally deleted or renamed the `⚠️ TEMPLATE — DO NOT DELETE` tab in the cashout master sheet (Drive filename: `DailyCashout-Master`). The app can't create today's tab without it.

**What's safe:** The cashout is stored on the iPad. Nothing is lost.

**How to fix:**
1. Open the **Template Backup** Google Sheet: https://docs.google.com/spreadsheets/d/18Uae4jTEDZXbn1JMTAP-Nh78QbewBc7qDHb2BDcxv8g/edit
2. Right-click the `Template` tab → **Copy to** → **Existing spreadsheet**
3. Choose the master cashout sheet (`DailyCashout-Master`)
4. Open the master cashout sheet, find the newly copied tab (usually called `Copy of Template`)
5. Rename it to exactly `⚠️ TEMPLATE — DO NOT DELETE` (including the warning symbol)
6. Right-click it → **Protect sheet** → "Only I can edit" → Save
7. Go to the iPad, open the **Backups screen**, find the cashout the staff was submitting, tap **Resubmit**
8. Verify the row appears in today's tab of the master sheet

---

### Error: "Network/WiFi down" or "Submission failed"

**What it means:** The iPad couldn't reach Google. Either the restaurant's WiFi is down, Google is down, or the network is unreliable.

**What's safe:** The cashout is stored on the iPad. Nothing is lost.

**How to fix:**
1. Check that the restaurant's WiFi is actually working (try loading any website on the iPad)
2. Once WiFi is back, open the iPad **Backups screen**
3. Find the pending cashout(s) and tap **Resubmit** on each
4. Verify they appear in the master sheet

**If WiFi stays broken for a while:**
- Don't worry — the cashouts stay on the iPad indefinitely
- When the iPad finally gets back online, use Resubmit on each pending entry

---

### Error: "Main sheet sync failed" (backup sheet still worked)

**What it means:** The main Apps Script failed for some reason (quota, permissions, script error), but the backup Apps Script succeeded. Both copies exist in the backup sheet — just not in the main one.

**What's safe:** The cashout is stored on the iPad AND in the Backup Sheet.

**How to fix:**
1. Open the **Backup Sheet** (`[BackupLog]AllCashouts`) on your desktop to confirm the row is there
2. Open the iPad **Backups screen**
3. Find the cashout and tap **Resubmit** — this will retry the main Apps Script
4. If Resubmit still fails, contact Matt with: the Cashout ID shown on the iPad + the date/time + a screenshot of any error in the Apps Script logs

---

### Error: "Backup sheet sync failed" (main sheet worked)

**What it means:** The main Apps Script worked fine. The backup Apps Script failed. This is a lower-priority issue because the main sheet has the data.

**What's safe:** The cashout is on the iPad AND in the main sheet.

**How to fix:**
1. Verify the row is in the master sheet
2. No urgent action needed
3. At end of shift, let Matt know — we'll investigate the backup Apps Script next time we work together

---

### Error: "Both sheet syncs failed"

**What it means:** Both Apps Scripts failed. This is rare — usually means Google Apps Script is having a platform-wide issue.

**What's safe:** The cashout is on the iPad. This is exactly what Layer 3 is for.

**How to fix:**
1. Check if Google is having a platform issue: https://www.google.com/appsstatus/dashboard/
2. If Google is down, wait it out — do NOT manually type cashouts until Google is back
3. Once Google is back, open the iPad **Backups screen**
4. Tap **Resubmit** on each pending cashout
5. Verify they all appear in the master sheet

---

### Error: "REF# X already exists on today's sheet"

**What it means:** Staff tried to submit a cashout using a REF# that's already been used on today's sheet. Either the staff typed the wrong REF#, or an older cashout genuinely needs to be updated.

**What's safe:** The new cashout is stored on the iPad. Nothing was written to the sheet.

**How to figure out what happened:**
1. Open the master sheet and find today's tab
2. Look at the existing row for that ref# — does it have the right name(s)?
3. Two possibilities:

**Case A: Staff typed the wrong ref#** (most common)
1. Go to the iPad **Backups screen**
2. Find the pending-conflict entry
3. Tap **View data** to confirm the details
4. Have the staff correct the ref# on the iPad and resubmit with the right number

**Case B: The existing cashout genuinely needs to be updated**
1. Confirm with the staff that they want to overwrite the existing cashout
2. On the iPad **Backups screen**, find the pending-conflict entry
3. Tap **Resubmit** — this will overwrite the existing rows in the sheet with the new data
4. The ref# in the sheet will now show `X (Resubmitted)` as an audit tag
5. If the split changed (e.g. from 3 people to 2), the extra row(s) are automatically cleared from the sheet

---

### Error: "[Section name] section is full, no empty rows"

**What it means:** The named section in today's tab of the cashout master sheet has no empty rows left. For example, PM Server Main has 16 slots (rows 21-36). If all 16 are used and a 17th cashout is submitted, the app can't write it to the sheet.

**What's safe:** The new cashout is stored on the iPad. Nothing was written to the sheet.

**Is this likely to happen?** Almost never. Sandbar rarely has more than a handful of people in any single section per shift. If you're seeing this error and the section genuinely has no spare rows, something unusual is going on.

**How to fix:**
1. Open today's tab in the cashout master sheet
2. Scroll to the named section and count the filled rows
3. Check for any accidental duplicate entries, test data, or rows that don't belong to today — these are often the cause
4. Delete any rows that shouldn't be there
5. Go to the iPad **Backups screen**, find the pending cashout, tap **Resubmit**
6. If the section is genuinely full (all rows are legitimate cashouts), contact Matt — the section layout may need to be expanded

---

### Error: "REF# X not found in [Section name], use fresh Submit instead"

**What it means:** Someone tapped **Resubmit** on a cashout from the iPad Backups screen, but the Apps Script couldn't find any existing rows with that REF# in the named section. Either the original submit never made it to the sheet, or the rows were manually deleted, or the REF# was changed in the sheet after the original submit.

**What's safe:** The cashout is stored on the iPad. Nothing was written to the sheet.

**How to fix:**
1. Open today's tab in the cashout master sheet
2. Look for the REF# in the named section's rows — is it really not there?
3. Two possibilities:

**Case A: REF# is genuinely missing from the sheet**
This means the original submit never landed. Use a **fresh Submit** instead of Resubmit:
1. Go to the iPad **Backups screen**
2. Find the entry
3. Tap **View data** to confirm the stored cashout values
4. Manually re-enter the cashout on the iPad using the regular Submit button (not Resubmit)
5. Mark the old Backups entry as manually synced once done

**Case B: REF# is in the sheet but the resubmit still failed**
This usually means the REF# in the sheet was manually edited after the original submit (e.g. someone added `(Manual fix)` or changed the number). The Apps Script can't recognize it anymore.
1. Undo the manual edit in the sheet if possible
2. Try Resubmit again

---

### Error: "Unknown section '[section name]', contact Matt"

**What it means:** The app tried to submit a cashout with a section name that the Apps Script doesn't recognize. This should never happen in normal operation — it means either the app code is out of sync with the Apps Script, or someone manually modified data somewhere.

**What's safe:** The cashout is stored on the iPad. Nothing was written to the sheet.

**How to fix:**
1. Screenshot the error (including the exact section name in the message)
2. Note the Cashout ID from the error screen
3. Contact Matt — this is a code-level bug, not an operational issue
4. In the meantime: either enter the cashout manually in the master sheet, or wait for the fix before syncing

---

### Known limitation: Bar cashout resubmits may leave stale bartender entries

**Context:** Bar cashouts write the bartender name and hours to a second area at the bottom of the sheet (the "bartender section"), in addition to the normal data rows. When a bar cashout is resubmitted, the data rows are correctly overwritten, but the bottom bartender entries are NOT automatically cleaned up. New bartender entries get appended, which may leave stale ones from the original submit.

**What to watch for:** After resubmitting a bar cashout, scroll down to the bottom bartender section of that day's tab. If you see duplicate bartender names (e.g. "Dana" appearing twice), the older entry is stale.

**How to fix:** Manually delete the stale bartender name and hours from the bottom section. Do not delete anything from the main data rows (those are handled correctly by the resubmit).

**Why this isn't automated:** The bartender section doesn't store the REF# next to the name, so there's no reliable way for the Apps Script to tell which bartender entries belonged to which cashout. Manual cleanup is the safe path.

---

## Archive workflow (when the master sheet gets too big)

The master cashout sheet accumulates one tab per day forever. Every so often (end of month, end of quarter, whenever it feels cluttered), archive the old tabs:

1. Open the master cashout sheet in Google Drive
2. Right-click the file → **Make a copy**
3. Rename the copy to something like `Sandbar Cashout — 2026-Q1 Archive`
4. Move the copy to an archive folder if desired
5. Open the ORIGINAL master sheet
6. Delete the old dated tabs you just archived (leave the `⚠️ TEMPLATE — DO NOT DELETE` tab and any tabs from the current period alone)

**Important:**
- The app doesn't care how many tabs exist — it only cares about today's tab
- NEVER delete the `⚠️ TEMPLATE — DO NOT DELETE` tab
- NEVER rename the master sheet file in a way that changes its ID (moving it or renaming the file itself is fine; the script tracks it by ID)

---

## The iPad Backups Screen — how it works

The Backups screen on the iPad is the safety net. Every cashout ever submitted from this iPad is stored there, even ones that successfully made it to the sheet. Each entry shows:

- **Cashout ID** — in the format `2026-04-11[REF42]`
- **Status** — one of:
  - `Synced` — successfully sent to the sheet
  - `Pending` — not yet synced (usually means network or sync error)
  - `Pending-conflict` — ref# collision detected, requires your review
- **Date, section, names, and final amounts**
- **Three action buttons:**
  - **View data** — expand to see everything stored for this cashout
  - **Resubmit** — re-send the cashout to both the main and backup sheets. Safe to tap multiple times.
  - **Mark as manually synced** — if you typed the row into the sheet by hand, tap this to clear the pending status

---

## Backup Sheet — Layout & Scan-for-Typo Reference

The `[BackupLog]AllCashouts` Google Sheet (ID `1AIsfen18Tzbvhrhd4pPsCLnZXi_-iGgNAN297chb7g4`) is an append-only raw log. One row PER PERSON — a 3-way split makes three rows sharing the same Cashout ID. This doc section is the reference for its **18-column layout** (live since 2026-04-19). For the raw truth, the authoritative source is the big comment block at the top of [`sb-backup-apps-script.gs`](sb-backup-apps-script.gs) — that's where the column contract lives in code.

### Full column layout

| Col | Name | What it holds | Notes |
|-----|------|---------------|-------|
| A | Cashout ID | `YYYY-MM-DD[REF##]` | e.g. `2026-04-11[REF42]` |
| B | Names | Comma-separated summary of everyone in the split | Same in every row of a split |
| C | CashoutType | The section (e.g. "PM Server Main") | Moved forward from column L in 2026-04-19 for scan-ability |
| **D** | **TotalSales** | ← INPUT | Server/Bar typed value. Blank for sushi. |
| **E** | **CashDue** | ← INPUT | `netCash` for server/bar; `totalTips` (pool pre-split) for sushi. |
| **F** | **FoodSales** | ← INPUT | Server/Bar typed value. Blank for sushi. |
| **G** | **HouseTip** | ← INPUT placeholder | Always blank today. Will auto-populate once the frontend adds a HouseTip input field — no script redeploy needed. |
| H | REFERENCE # | ← master sheet col A | With suffix: `-Sushi`, `-MainBar`, `-UpstairsBar`. Servers unsuffixed. |
| I | NAME | ← master sheet col B | Per-person |
| J | DUEBACK | ← master sheet col C | Negative = house owes staff; positive = staff owes house |
| K | HOUSE | ← master sheet col D | Calculated tip-out. Zeroed for sushi. |
| L | BUSSER | ← master sheet col E | Calculated. Zeroed for sushi. |
| M | BAR | ← master sheet col F | Blank for bar cashouts (matching main-script convention). Zeroed for sushi. |
| N | EXPO | ← master sheet col G | Zeroed for sushi. |
| O | EVENTS | ← master sheet col H | Zeroed for sushi. |
| P | Submit Type | `NEW` or `RESUBMIT` | Set from `data.isResubmit` |
| Q | Received At | `YYYY-MM-DD HH:mm:ss` America/Vancouver | When the backup script actually ran |
| R | Raw Data | Full JSON of entire submission | Same in every row of a split. Includes all fields, even ones not surfaced in other columns. |

### Why inputs are surfaced in D-G

If a server mistypes a sales number, the mistake is usually invisible in the calculated output columns (HOUSE/BUSSER/BAR etc.) because it propagates proportionally through the percentages. Surfacing the inputs directly lets the manager eyeball a row and spot obvious typos — e.g. `TotalSales=20000` when everything else is `~$1500` screams "missed the decimal point."

**BEO Sales is NOT a column** — by design. Events (column O) is exactly 1% of BEO, so reading `19.77` in Events mentally reverses to `~$1977` in BEO. No separate column needed.

### Disaster-recovery copy-to-master procedure

If the main sheet corrupts or the main Apps Script fails silently and you need to rebuild a cashout manually:

1. In `[BackupLog]AllCashouts`, find the cashout's rows (match by Cashout ID in column A — there's one row per person)
2. Select cells **H:O** across those rows
3. Copy
4. Open the master sheet's daily tab (`DailyCashout-Master` → `YYYY-MM-DD`)
5. Click into cell `A{row}` of the correct section
6. Paste

Column mapping: backup H→master A, I→B, J→C, K→D, L→E, M→F, N→G, O→H. It's a direct 1:1 paste — no re-ordering required.

**For sushi cashouts,** the same H:O block works: each sushi row has its suffixed REF# (`45-Sushi`), the person's name, their per-person dueback, and zeros for house/busser/bar/expo/events. Paste into the PM Main Sushi section (rows 21-36 in the master template) exactly as-is.

### Scan-for-typo quick workflow

When reviewing a shift's cashouts end-of-night:

1. Open `[BackupLog]AllCashouts` and filter/sort to the current date (column Q)
2. Scan columns **D-G** (inputs) row by row — look for numbers that don't fit the usual range for that section (e.g. a 4-digit TotalSales on a shift where $1-2k is typical)
3. If a row looks off, open column R (Raw Data) for the full JSON including any field that isn't surfaced (`beoSales`, `sharePct`, `hours`, etc.)
4. Cross-reference against the master sheet to confirm the final values match what was paid out

### Historical rows note

Rows submitted before 2026-04-19 follow the old **15-column** layout (no CashoutType in column C, Shared By in column M, different column order). If old rows coexist with new ones in the same tab, expect visual misalignment below the header. Default recommendation: cut+paste pre-2026-04-19 rows to an archive tab named `pre-2026-04-19` and keep the live tab clean.

### HouseTip placeholder — how it will activate

Column G is wired to read `row.houseTip || ''`, and the frontend payload doesn't send `houseTip` yet, so G stays blank. When Matt adds a HouseTip input field in `index.html` (a future session), the frontend will start including `houseTip` in each row object — column G will begin populating automatically on the very next submission. Zero Apps Script changes required.

---

## Design rationale: why the date field is locked during resubmit

The cashout date input is **disabled** whenever `isResubmitMode === true` (see `setResubmitMode()` in [index.html](index.html)). The lock is shown via the red `Date Locked for Resubmit` warning: *"Inform manager if wrong day was submitted."*

This is intentional and load-bearing. Keep the lock. Here's why.

### What resubmit actually does server-side

Resubmit is an **upsert / overwrite-in-place**, not an append. The main Apps Script:

1. Resolves the daily tab from the submitted `cashoutDate` (e.g. `2026-04-19`).
2. On that tab, scans the section's row range looking for rows matching the REF#.
3. If matches found → overwrites those cells and tags column A with `(Resubmitted)`.
4. If no matches found → throws `RESUBMIT_NOT_FOUND`.

Which tab gets scanned is a function of the date. The tab + REF# together are the composite identifier for "which rows to overwrite."

### The three failure modes unlocking the date would create

| Failure | What would happen | Why it's bad |
|---|---|---|
| **`RESUBMIT_NOT_FOUND` on an unrelated day** | Staff changes date, the new day's tab has no matching REF#, server throws. | Noisy but recoverable. Confusing for staff mid-shift because the mental model is "I'm resubmitting *this* cashout" but the error implies it's not there. |
| **Silent duplicate on a different tab** | New day's tab has an empty slot, Apps Script falls through to the fresh-write path, creates a new REF# row on the NEW day. The original rows stay on the OLD day's tab. | Catastrophic. Two copies of one cashout on two different daily tabs, both looking legitimate. End-of-week reconciliation finds a duplicate with no easy way to tell which was the "real" one. |
| **Lost audit trail** | Managers reviewing historical cashouts can't trust that each row reflects what was actually paid out on that date. | Undermines the core value of the master sheet. |

### Why the loud-failure path is actually a *feature*

When the date is wrong for any reason (stale iPad, typo, etc.), the server errors (`REF_CONFLICT`, `SECTION_FULL`, `RESUBMIT_NOT_FOUND`) all funnel staff into the SAME manual-recovery workflow:

> Change REF# to `00` → submit to overflow → inform manager.

One recovery rule, three triggering errors. Staff only memorize the rule, not the diagnosis. And every path ends with "inform manager," which means a human touchpoint happens within minutes of any data-integrity risk. This is by design — silent routing of a mis-dated cashout to the "right" day would mask bugs for days or weeks before anyone noticed. Loud failure is the system's self-reporting mechanism.

### The legitimate "date was actually wrong" escape hatch

If the ORIGINAL submission truly landed on the wrong day (e.g. the staff submitted Monday's cashout with the iPad stuck on Sunday's date), the fix is **not** a resubmit with a corrected date. It's a manager-side manual fix:

1. Manager opens the wrong-day tab, deletes the errant rows.
2. Staff submits fresh on the correct day via a normal submit (not Edit to Resubmit).

The `Date Locked for Resubmit` warning text points to this: *"Inform manager if wrong day was submitted."* That's the handoff. The staff don't try to "fix" it from the iPad; they escalate.

### Smart detection that keeps the lock from over-triggering

The lock only applies when there are actually rows to overwrite. `loadFromBackup()` derives `isResubmit` from `entry.mainStatus`:

| `mainStatus` | `isResubmit` | Date field |
|---|---|---|
| `success` | `true` | **Locked** — original rows exist on original day's tab, must overwrite there. |
| `pending` / `error` / `manual` | `false` | **Editable** — nothing ever landed on any tab, this is really a fresh submit in disguise. |

This is why a WiFi-drop recovery (Pending cashout, never made it to the server) lets the staff edit the date — there are no server-side rows to protect.

### How this pairs with the 2026-04-19 stale-date guard

The stale-date guard (`scheduleDailyDateRefresh()` + `visibilitychange` listener + submit-time "Date Not Current" banner) is the **preventative layer** — it stops a stale date from reaching the server in the first place.

The resubmit date-lock + server error codes are the **reactive layer** — they catch anything that slips past prevention.

Together they form defense in depth:

- **Prevent:** 3am refresh → visibilitychange refresh → submit-time banner.
- **React:** `REF_CONFLICT` / `SECTION_FULL` / `RESUBMIT_NOT_FOUND` errors → force the `00` overflow path → inform manager.

No single mechanism has to be bulletproof. Any two can fail silently and the third still catches it.

---

## Important: never use Private Browsing

If Safari is in Private Browsing mode, localStorage is wiped when the tab closes. This means all backup data stored on the iPad would be lost. The home screen shortcut avoids this by always opening in a normal Safari session, but if someone ever opens the app URL manually in a private tab, backups will not persist.

**Rule:** always use the home screen shortcut, never open the app URL directly in a private Safari tab.

---

## What to do when nothing in this doc helps

1. Don't delete anything on the iPad or in the master sheet
2. Screenshot any error messages
3. Note the Cashout ID(s) of affected cashouts
4. Contact Matt with all of the above

Matt's contact: `matt@veraisonlabs.com`

---

## Potential future improvements

### Multi-iPad REF# conflict check (server-side, column A scan)

**Idea:** Upgrade REF# conflict detection from the current client-side localStorage scan to a server-side scan of column A on today's tab. Would allow safely running the app from more than one iPad in parallel.

**Why this might matter later:**
- Current check (as of 2026-04-14) is **localStorage-only**. It scans the backup entries saved on *this* iPad for a matching `cashoutId` (`YYYY-MM-DD[REF##]`) and blocks the submit if found. This works perfectly for the intended single-iPad deployment at Sandbar.
- If Sandbar ever adds a second iPad (or a manager submits from a desktop in parallel), each device's localStorage is blind to the other. Two staff could simultaneously pick REF# 42 on the same day, and both submits would slip past the client-side check.
- Server-side scan closes that gap because it's authoritative — it reads the REAL state of today's tab, not a device-local cache.

**Trigger this improvement when:**
- Sandbar plans to use more than one iPad at a time
- The app is ever deployed to another restaurant with multi-terminal workflow
- Matt explicitly asks about expanding capability, input sources, or multi-device support

**Implementation sketch (~15 lines in Apps Script):**
1. In `sb-cashout-apps-script.gs`, replace the section-scoped REF# conflict check with a scan of all non-empty values in column A of today's tab.
2. Still allow matches during resubmit (`isResubmit === true` in the payload), same as today's section-scoped check does.
3. Throw `REF_CONFLICT: <refNum>` if a match is found outside the resubmit context. The existing client-side error translation already handles this code — no UI work needed.
4. Can live alongside the localStorage check. Client catches same-iPad cases instantly (no network); server catches cross-iPad cases as the authoritative safety net.

**Trade-offs:**
- Requires an Apps Script change and a redeploy.
- Server check only runs after the POST reaches Google, so feedback is slightly slower than the client-side check.
- Needs the iPad to be online; the client-side check is still the only guard that works offline.

**Status:** Not implemented as of 2026-04-14. Single-iPad workflow is the explicit current design; localStorage-only REF# check is sufficient for that. This note exists so future maintainers know the second-stage option without having to rediscover it.

---

### URL-based manager mode (deep link to Cashout Log)

**Idea:** Replace any "Cashout Log access code" gate with a URL-based soft gate. Two iPad home-screen shortcuts on the same device:

- **Staff shortcut** → `https://veraisonlabs.github.io/cashapp-SBV3/` → opens the calculator. Cashout Log button hidden.
- **Manager shortcut** → `https://veraisonlabs.github.io/cashapp-SBV3/?log` → opens directly to the Cashout Log view. No calculator screen, no button to tap.

**Why consider this:**
- Native `prompt()` / `confirm()` dialogs are suppressed by Chrome under certain conditions (the "Prevent this page from showing more dialogs" checkbox, and the "page is not the active tab of the front window" check). Both have bitten this app. A URL-based gate uses no dialogs at all and cannot be suppressed.
- Both shortcuts read the same `localStorage` because localStorage is scoped by origin (protocol + host), not by URL path or query string. Manager sees the same cashout history the staff iPad has been storing.
- The URL itself is the "key." Staff don't bookmark it, managers do. Soft-gate with zero UI.

**Implementation sketch (~10 lines):**
1. On page load, read `new URLSearchParams(location.search).has('log')`.
2. If true: hide the calculator screen, show the backups screen, skip any prompt.
3. If false: hide the Cashout Log button entirely (staff never see it).
4. Remove the `LOG_ACCESS_CODE` and the native `prompt()` gate.

**Trade-offs:**
- URL is shareable — anyone with the URL is "a manager." That's fine for soft-gating a restaurant workflow where the threat model is "staff might tap something out of curiosity."
- Requires manager to set up a second iPad home-screen shortcut one time. Standard iOS Safari flow (Share → Add to Home Screen on the `?log` URL).

**Status:** Not implemented as of 2026-04-14. The access-code `prompt()` gate was removed in the same session because of the Chrome dialog suppression issues, leaving the Cashout Log with no gate at all. If/when a soft gate is wanted back, this URL pattern is the path of least resistance.

---

### Per-row deep links from Cashout Log to troubleshooting sections

**Idea:** Make each error message in the Cashout Log table a clickable link that jumps directly to its corresponding section in the troubleshooting guide. Tapping "REF# 42 already exists on today's sheet" on the iPad would open the troubleshooting page scrolled right to the REF# conflict walkthrough — one tap from "something went wrong" to "here is how to fix it."

**Why consider this:**
- Manager sees a specific error in the log, taps it, and lands on the exact instructions for that error instead of having to scan the full troubleshooting page.
- Works especially well for the less-common errors (SECTION_FULL, UNKNOWN_SECTION) where the manager might not remember the fix.
- The troubleshooting HTML already has named anchors for every error code (`#err-template-missing`, `#err-ref-conflict`, `#err-section-full`, `#err-resubmit-not-found`, `#err-unknown-section`, `#err-network-down`, `#err-main-sync-failed`, `#err-backup-sync-failed`, `#err-both-syncs-failed`). The hard part is done.

**Implementation sketch (~15 lines in index.html):**
1. Add a dictionary mapping error codes to anchor IDs:
   ```
   const ERROR_ANCHORS = {
     TEMPLATE_MISSING: 'err-template-missing',
     REF_CONFLICT:     'err-ref-conflict',
     SECTION_FULL:     'err-section-full',
     // ...
   };
   ```
2. In `renderBackupsTable()`, when rendering the Message column, check if the error has a known anchor and wrap the message text in an `<a href="https://veraisonlabs.github.io/cashapp-SBV3/CashApp-Troubleshooting.html#err-...">` tag with `target="_blank"`.
3. Non-error entries (Synced, no message) stay plain text.
4. Style the link minimally to indicate clickability without overwhelming the table row (dashed underline, matches the troubleshooting doc's own link style).

**Trade-offs:**
- Requires keeping the anchor IDs in the troubleshooting doc in sync with the mapping in index.html. If an anchor is renamed, the corresponding app link breaks silently. Low risk since anchors are not renamed often.
- Adds 15-ish lines to index.html, violating the "keep simple" constraint slightly. But the feature is strictly additive and cannot break the submit flow or any other existing functionality.

**Status:** ✅ **SHIPPED** on 2026-04-14 in commit `f92022f`. The feature was built with the exact architecture sketched above:

- `ERROR_ANCHORS` dictionary in `index.html` maps Apps Script error codes to anchor IDs in the troubleshooting doc.
- `getDisplayStatus()` now attaches an `anchor` field to every returned status object, covering both Apps-Script errors (REF_CONFLICT, TEMPLATE_MISSING, SECTION_FULL, RESUBMIT_NOT_FOUND, UNKNOWN_SECTION) and non-Apps-Script statuses (err-network-down, err-main-sync-failed, err-backup-sync-failed, err-both-syncs-failed).
- In `renderBackupsTable()`, error messages are wrapped in `<a class="err-link" href="CashApp-Troubleshooting.html#${anchor}" target="_blank" rel="noopener">` with `onclick="event.stopPropagation()"` so tapping the link opens the troubleshooting page without also triggering the row-selection handler.
- Bonus additions in the same commit (not part of the original sketch but shipped alongside):
  - A persistent "View Troubleshooting Guide" button at the top of the Cashout Log view.
  - The action button "Load into Form" was renamed to "Edit to Resubmit" for clearer intent.

Original design sketch preserved above for historical context — useful when debugging the feature later or extending it.

---

## Change log for this doc

| Date | Added by | Change |
|---|---|---|
| 2026-04-11 | Matt | Initial scaffold during v3 build |
| 2026-04-11 | Matt | Added "bar cashout resubmit stale bartender entries" known limitation after rewriting the main Apps Script |
| 2026-04-11 | Matt | Changed error display rule: reassurance ("Cashout data saved to iPad") now goes at the BOTTOM of the message, not the top. Prevents scan-and-dismiss at 2am. |
| 2026-04-11 | Matt | Error messages now NAME the specific artifact ("cashout master sheet", "PM Server Main section", "REF# 42") instead of vague references. Added runbook entries for SECTION_FULL, RESUBMIT_NOT_FOUND, and UNKNOWN_SECTION errors. |
| 2026-04-11 | Matt | Added full status/message quick reference table (every possible Backups screen state). Orphan rows from shrinking splits are now auto-cleared instead of left for manual deletion. Approach A locked in: removing no-cors to enable real error reporting. |
| 2026-04-11 | Matt | Added backup Apps Script (`sb-backup-apps-script.gs`). Append-only log to `[BackupLog]AllCashouts` sheet. Referenced backup sheet name in troubleshooting doc. |
| 2026-04-14 | Matt | Launched `CashApp-Troubleshooting.html` as a second live GitHub Pages URL. Styled header to match the app palette. Added anchor links on the status reference table. |
| 2026-04-14 | Matt | Renamed `[CashApp]Troubleshooting.md` → `[CashApp]DevelopmentTroubleshooting.md` to clarify the living-internal-doc vs. stable-client-facing distinction. |
| 2026-04-14 | Matt | Shipped per-row deep links: error messages in the Cashout Log table are now clickable anchors that open the corresponding troubleshooting-guide section. Plus: "View Troubleshooting Guide" button at the top of the log, and "Load into Form" action renamed to "Edit to Resubmit" (commit `f92022f`). |
| 2026-04-14 | Matt | Moved the Private Browsing / localStorage warning above Status References so readers can't miss it. Removed the change log section from the client-facing HTML (kept here in the dev doc). |
| 2026-04-19 | Matt | Backup sheet column layout expanded 15 → 18 columns. Added scan-for-typo INPUT columns (TotalSales, CashDue, FoodSales, HouseTip) between `Names` and the master-mirror block. `CashoutType` moved forward to column C. `Shared By` dropped (derivable from Names). Master-mirror paste range shifted from `C:J → A:H` to `H:O → A:H`. `HouseTip` is a forward-looking placeholder — column exists now, will auto-populate when the frontend adds a HouseTip input field. Requires manual header-row update on `[BackupLog]AllCashouts` + Apps Script redeploy. |
| 2026-04-19 | Matt | Documentation pass for the new 18-column layout: (1) added "Backup Sheet Layout (v3)" section to `projects/cashapp-sb/CLAUDE.md` pointing here for depth; (2) added "Backup Sheet — Layout & Scan-for-Typo Reference" section in this doc (full column table, H:O→A:H paste procedure, scan workflow, HouseTip placeholder mechanics); (3) updated client-facing `CashApp-Troubleshooting.html` Layer 2 block to note blue-headers = inputs / green-headers = outputs, plus brief H:O→A:H copy-to-master mention. Planned header color convention on the physical sheet: blue fill for D-G, green fill for H-O. |
| 2026-04-19 | Matt | **Stale-date bug fix.** Discovered a cashout submitted on 2026-04-19 landed on yesterday's (2026-04-18) daily tab via the 00 overflow. Root cause: iOS Safari treats home-screen web apps as long-lived tabs — locking the iPad overnight suspends the tab instead of closing it, so the INIT IIFE (which sets `#cashoutDate` to today's Vancouver date) never re-fires on wake. The date field silently carried yesterday into the next day's first cashout. Three-layer defense added: (1) `scheduleDailyDateRefresh()` fires at 3am Vancouver time to refresh the date (3am not midnight, so late-night bar-close cashouts keep the correct prior-day date); (2) `visibilitychange` listener catches the case where the iPad slept through 3am and the setTimeout paused — when the app returns to foreground past 3am with a prior-day date, it refreshes; (3) Submit-time soft guard: if `calcData.cashoutDate !== todayVancouver()` and not in resubmit mode, show a soft yellow "Date Not Current" banner with an "OK, I've Checked" button. User must dismiss the banner before re-tapping Submit (non-blocking, preserves legitimate old-date submissions). New helper `todayVancouver()` centralizes date computation; all inline `new Date().toLocaleDateString(...)` calls replaced. Added `staleDateAcknowledged` flag reset on date-field change AND resetForm. |
| 2026-04-19 | Matt | Added "Design rationale: why the date field is locked during resubmit" section. Documents the upsert semantics of resubmit (scan a specific daily tab by date, overwrite matching REF# rows), the three failure modes unlocking the date would create (RESUBMIT_NOT_FOUND confusion, silent cross-tab duplicates, lost audit trail), the smart `isResubmit` derivation from `mainStatus` that keeps the lock from over-triggering, and the loud-failure-is-a-feature insight (all error paths funnel to 00 overflow + manager notification). Documents how the resubmit lock pairs with the stale-date guard as complementary prevent/react layers. |

*Add entries here as you make edits. Keep a paper trail.*
