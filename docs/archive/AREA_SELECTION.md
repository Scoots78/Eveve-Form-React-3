# 🗺️ Area Selection – Implementation Guide

Comprehensive reference for how the **Seating-Area Selection** feature works inside the Eveve React booking widget.

---

## 1 · Configuration parameters

| Variable  | Location / extraction | Type (string) | Meaning |
|-----------|-----------------------|---------------|---------|
| `arSelect` | `/web/form?est=…` → parsed in `configLoader.js` | `"true"` / `"false"` | **Master switch.** When `"true"` the widget activates the area-selection flow (provided areas exist). |
| `areaAny` | `/web/form?est=…` → `configLoader.js` | `"true"` / `"false"` | Enables the **“Any Area”** radio option. When `"true"` guests may proceed without picking a concrete area. |

Rule of thumb  
• `arSelect = false` → UI never rendered  
• `arSelect = true` → UI rendered *iff* at least one valid area exists for the chosen time  
  • `areaAny = true`  → area selection **optional**  
  • `areaAny = false` → area selection **mandatory**

---

## 2 · Retrieving areas from the API

1. After **Date + Covers** are chosen, the app fetches:  
   `GET /web/day-avail?est=<id>&covers=<n>&date=<yyyy-mm-dd>`  
2. Response includes a top-level array `areas[]`:

```json
{
  "areas": [
    { "uid": 1000, "name": "Main",    "short": "Main",    "times": [18,18.25,…] },
    { "uid": 1001, "name": "Outside", "short": "Outside", "times": [18,18.25,…] }
  ]
}
```

3. When the user clicks a **time** button:

```js
const chosen = actualTime;                    // e.g. 19.25
const filteredAreas = (availabilityData.areas || [])
  .filter(a => Array.isArray(a.times) && a.times.includes(chosen));

setAvailableAreas(filteredAreas);             // drives the UI
```

Only areas whose `times[]` include the selected decimal time are offered.

---

## 3 · UI display & behaviour

Component `src/components/AreaSelection.jsx`

Display rules  
1. `arSelect === "true"` **and** `filteredAreas.length > 0` → render panel under the currently-expanded shift.  
2. If `areaAny === "true"` prepend an **“Any Area”** radio choice; otherwise omit.  

Visual cues  
• Red asterisk & red helper text when a concrete area is *required*.  
• Grey helper text when “Any Area” keeps the choice optional.  
• Mobile-friendly radio list.

---

## 4 · Validation logic

In `ReservationForm.jsx`:

```js
const areaSelectEnabled = appConfig.arSelect === "true";
const areaAnyAllowed    = appConfig.areaAny === "true";

const areaRequired =
  areaSelectEnabled &&
  !areaAnyAllowed &&          // “Any Area” not permitted
  availableAreas.length > 0;  // at least one specific area exists
```

• If `areaRequired` is **true** and no area picked →  
  Proceed button disabled & label set to *“Please select a seating area”*.  
• Otherwise – once all other validations pass – button enables with *“Proceed to Booking”*.

---

## 5 · Booking-request integration

Helper `formatAreaForApi(selectedArea)` returns:

| `selectedArea` value | Helper output | Payload effect |
|----------------------|---------------|----------------|
| `null` / `undefined` | `""`          | omit `area` key |
| `"any"`              | `"any"`       | `area=any` (explicit no-preference) |
| e.g. `"1001"`        | `"1001"`      | `area=1001` |

```js
const formattedArea = formatAreaForApi(selectedArea);

const bookingData = {
  est, covers, date, time,
  addons: formattedAddons,
  ...(formattedArea && { area: formattedArea })   // conditional spread
};
```

If **“Any Area”** is chosen *and* `areaAny === true`, `formattedArea` is `"any"`; if the guest leaves the panel untouched (optional case) it is `""` and the key is omitted entirely.

---

### QA checklist (quick)

1. Use a restaurant whose `/web/form` sets `arSelect` and `areaAny`.  
2. Select date → covers → time.  
3. Confirm:  
   • List only shows areas valid for that decimal time.  
   • “Any Area” appears **only** when `areaAny === true`.  
   • Proceed button stays locked when mandatory area not yet chosen.  
4. Complete flow and check console: payload contains correct `area` key/value *or* omits it when allowed.

*(End of file)*