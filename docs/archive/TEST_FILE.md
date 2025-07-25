# 🔬 TEST — Area Selection Feature

This file exists solely to verify that we can create, commit, and push new files from the development environment **and** to record a quick overview of the newly-added *Area Selection* functionality.

---

## 1 • Purpose of This File
1. Confirm file-system write access (`TEST_FILE.md` should now appear in the repo).  
2. Provide a lightweight reference/checklist for QA of the area-selection flow.

---

## 2 • Feature Snapshot

| Aspect                         | Behaviour |
|--------------------------------|-----------|
| **Trigger**                    | UI appears **after** user selects a valid time. |
| **Source of areas**            | `availabilityData.areas[]` (top-level of `/web/day-avail` response). |
| **Filtering rule**             | Display only areas whose `times[]` contains the chosen decimal time. |
| **“Any Area” option**          | Shown when `areaAny === true` in remote config. Selecting it results in *no* `area` param in hold request. |
| **Validation**                 | Proceed button disabled until an area is chosen when `arSelect === true` **and** at least one area is available. |
| **Booking summary**            | Selected area name appended (e.g. “Dinner – Jul 20 – 4 Guests – 7:30 PM – Outside”). |
| **Hold payload**               | `"area": "<uid>"` or omitted if “Any Area”. |

---

## 3 • Manual Test Checklist

1. Run the widget with an establishment that returns areas (`?est=TestNZA`).  
2. Select **Date** & **Guests**.  
3. Pick a **Time** (e.g. `19.25`).  
4. ✅ Verify **Area Selection** panel appears with:  
   - “Any Area” (if enabled)  
   - “Main”, “Outside”, “RengaRenga” (filtered correctly).  
5. Choose “Outside”.  
6. Confirm:  
   - Proceed button enables.  
   - Summary line shows “… – Outside”.  
7. Click **Proceed**. In alert/console, ensure payload contains `"area": 1001`.  
8. Repeat choosing “Any Area”; payload **should not include** `area`.

---

*(End of test file)*
