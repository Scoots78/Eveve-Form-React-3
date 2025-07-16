# Pull Request – Add Optional Seating Area Selection

This PR introduces **optional seating-area selection** to the Eveve React booking widget.  
Guests can now choose a specific area (e.g. *Main*, *Outside*, *RengaRenga*) or keep the default **Any Area** after they have selected a time.

---

## ✨ Feature Overview
1. **Dynamic Area Extraction**  
   • When the user picks a time, the widget reads `areas` supplied by the shift or time object in the `/web/day-avail` response.  
   • If at least one area is present and `arSelect` is enabled in the remote config, an Area Selection UI is displayed.

2. **User Interface**  
   • The UI is a radio-button list rendered by the **new `AreaSelection` component**.  
   • Supports “Any Area” if the config flag `areaAny === "true"`.  
   • Helper text and labels use new language-string keys (see 🗣 section).

3. **Validation & Flow Integration**  
   • The **Proceed to Booking** button stays disabled until an area is chosen when area selection is required.  
   • Selected area is included in the simulated *hold* payload via a new utility formatter.

4. **API Formatting**  
   • Added `formatAreaForApi()` to normalise the value (`'' | 'any' | '<uid>'`) before submission.

---

## 🔨 File-by-File Changes

| File | Type | Summary |
|------|------|---------|
| **`src/components/AreaSelection.jsx`** | 🆕 added | Stateless component that renders the radio list and reports changes upward. |
| **`src/components/ReservationForm.jsx`** | ✏️ modified | • Added area-related state (`availableAreas`, `selectedArea`).<br>• Extract areas on time-selection, render `AreaSelection`, enforce validation, include formatted area in the hold payload.<br>• Updated proceed-button logic and debug alert. |
| **`src/utils/apiFormatter.js`** | ✏️ modified | • Added `formatAreaForApi()` helper.<br>• Export now includes both addon and area formatters. |
| **`src/i18n/en.json`** | ✏️ modified | Added area-related strings: `areaSelectionTitle`, `anyArea`, `anyAreaDesc`, `areaSelectionHelp`, `selectAreaPrompt`. |

_No other application logic or build tooling was affected._

---

## ⚙️ Configuration Flags Used
* `arSelect` – master toggle (remote config).  
* `areaAny` – enables “Any Area” option (remote config).  
These flags were already parsed by `configLoader.js`; no changes were needed there.

---

## 🧪 How to Test
1. Load the widget with an establishment that returns areas in its availability payload.  
2. Select date, covers, and a time slot.  
3. Verify the **“Select Seating Area”** panel appears.  
4. Choose a specific area or “Any Area”; the Proceed button should enable once all other validations pass.  
5. Observe console / alert – the *hold payload* now contains an `area` key with the expected value.

---

## 📚 Notes
* Area selection is **optional** and only appears when applicable; existing flows without area data are unaffected.  
* The implementation follows the existing addon pattern to minimise UI & logic divergence.  
* All new strings are safely proxied through `appConfig.lng`.

Closes #<issue-id-if-any>.
