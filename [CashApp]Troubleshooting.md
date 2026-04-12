# Sandbar Cashout App — Troubleshooting Guide

**Living document.** Add to this as issues come up. When something breaks and you figure out how to fix it, write it down here so next time is faster.

---

## Quick orientation

The Sandbar Cashout App has **four layers** that each kick in for a different failure mode. Most problems only break ONE layer — knowing which one is broken tells you which recovery path to follow.

| Layer | What it is | When it saves you |
|---|---|---|
| **1 — Main Cashout Sheet** | The normal Google Sheet where cashouts land | Normal day |
| **2 — Backup Sheet** | A separate Google Sheet with a raw copy of every submission | Main sheet corruption, formula errors |
| **3 — iPad Local Storage** | Cashouts stored directly on the iPad itself | WiFi down, Google down, Apps Script broken |
| **4 — Physical screenshot** | Photo of the iPad screen | Everything else failed at once |

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

## What to do when nothing in this doc helps

1. Don't delete anything on the iPad or in the master sheet
2. Screenshot any error messages
3. Note the Cashout ID(s) of affected cashouts
4. Contact Matt with all of the above

Matt's contact: `matt@veraisonlabs.com`

---

## Change log for this doc

| Date | Added by | Change |
|---|---|---|
| 2026-04-11 | Matt + Claude | Initial scaffold during v3 build |
| 2026-04-11 | Matt + Claude | Added "bar cashout resubmit stale bartender entries" known limitation after rewriting the main Apps Script |
| 2026-04-11 | Matt + Claude | Changed error display rule: reassurance ("Cashout data saved to iPad") now goes at the BOTTOM of the message, not the top. Prevents scan-and-dismiss at 2am. |
| 2026-04-11 | Matt + Claude | Error messages now NAME the specific artifact ("cashout master sheet", "PM Server Main section", "REF# 42") instead of vague references. Added runbook entries for SECTION_FULL, RESUBMIT_NOT_FOUND, and UNKNOWN_SECTION errors. |
| 2026-04-11 | Matt + Claude | Added full status/message quick reference table (every possible Backups screen state). Orphan rows from shrinking splits are now auto-cleared instead of left for manual deletion. Approach A locked in: removing no-cors to enable real error reporting. |
| 2026-04-11 | Matt + Claude | Added backup Apps Script (`sb-backup-apps-script.gs`). Append-only log to `[BackupLog]AllCashouts` sheet. Referenced backup sheet name in troubleshooting doc. |

*Add entries here as you make edits. Keep a paper trail.*
