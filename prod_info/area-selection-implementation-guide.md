# Area-Selection Implementation Guide  
*(manual changes & test checklist)*

---  

## 0 · Prerequisites  
* Working copy of the repository `Eveve-Form-React-3`.  
* `npm install` already completed.  
* An Eveve UID you can test with – eg. `TestNZA` (has areas + `areaAny=true`).  

---

## 1 · Files to Modify  

| Path | Purpose of change |
|------|------------------|
| **`src/config/configLoader.js`** | Make sure `arSelect` & `areaAny` are included in the `variablesToExtract` array (they already are in recent code). |
| **`src/components/ReservationForm.jsx`** | Core logic: read flags, filter areas, enforce validation, add area to hold payload, show area name in summary. |
| **`src/components/AreaSelection.jsx`** | Stateless UI component – render radio list; show “Any Area” only when allowed; helper text/asterisk when required. |
| **`src/utils/apiFormatter.js`** | Add `formatAreaForApi()` (returns `""`, `"any"` or concrete UID). |
| **`src/i18n/en.json`** | New language keys (`areaSelectionTitle`, `anyArea`, `areaSelectionHelp`, `areaSelectionRequired`, `selectAreaPrompt`). |
| **(optional) docs** `AREA_SELECTION.md` | Developer guide (not required for runtime). |

---

## 2 · Code Changes (high level)

### 2.1 Extract flags (`configLoader.js`)
```js
const variablesToExtract = [
  /* …existing… */, 'arSelect', 'areaAny'
];
```

### 2.2 ReservationForm.jsx  

1. **Local state**
   ```js
   const [availableAreas, setAvailableAreas] = useState([]);
   const [selectedArea, setSelectedArea] = useState(null);
   const [selectedAreaName, setSelectedAreaName] = useState(null);
   ```

2. **After time is selected**  
   ```js
   const allAreas = availabilityData?.areas || [];
   const filtered = allAreas.filter(a =>
     Array.isArray(a.times) && a.times.includes(actualTime)
   );
   setAvailableAreas(filtered);
   setSelectedArea(null);
   setSelectedAreaName(null);
   ```

3. **Area-validation logic (inside `useEffect` that sets Proceed button)**  
   ```js
   const areaSelectEnabled = appConfig?.arSelect === 'true';
   const areaAnyAllowed    = appConfig?.areaAny === 'true';
   const areaRequired      = areaSelectEnabled && !areaAnyAllowed && availableAreas.length > 0;

   if (areaRequired && !selectedArea) {
     setProceedButtonState({ text: lng.selectAreaPrompt, disabled: true });
     return;
   }
   ```

4. **Booking summary row** – append  
   ```jsx
   {selectedAreaName && ` – ${selectedAreaName}`}
   ```

5. **Hold-payload**  
   ```js
   const formattedArea = formatAreaForApi(selectedArea);
   const bookingData = {
     …,
     ...(formattedArea && { area: formattedArea })
   };
   ```

### 2.3 AreaSelection.jsx (simplified)
* Accept `areaAnyEnabled` prop (`appConfig.areaAny==='true'`).
* Render “Any Area” radio only when `areaAnyEnabled`.
* Show red asterisk + red helper when `!areaAnyEnabled`.

### 2.4 apiFormatter.js
```js
export function formatAreaForApi(val){
  if(!val) return '';
  return val.trim().toLowerCase() === 'any' ? 'any' : String(val).trim();
}
```

### 2.5 Language strings (en.json)
```json
{
  "areaSelectionTitle": "Select Seating Area",
  "anyArea": "Any Area",
  "anyAreaDesc": "No preference for seating area",
  "areaSelectionHelp": "Select your preferred seating area (optional)",
  "areaSelectionRequired": "Area selection is required to proceed",
  "selectAreaPrompt": "Please select a seating area"
}
```

---

## 3 · Testing Steps  

### 3.1 Scenario A – `areaAny = true`
1. Start dev server: `npm run dev` → visit `http://localhost:5173/?est=TestNZA`.  
2. Pick date + covers + a time that exists in `areas[].times`.  
3. **Expect:**  
   * Area panel lists “Any Area” + concrete areas.  
   * Proceed button **enabled immediately** (area optional).  
4. Choose a specific area → summary updates.  
5. Click **Proceed** – console payload should include `"area":<uid>`.  
6. Choose “Any Area” instead → payload contains `"area":"any"` *or* no `area` key (depending on config).

### 3.2 Scenario B – `areaAny = false`
1. Use /form that sets `areaAny=false` (or temporarily force in `appConfig`).  
2. Repeat selection flow.  
3. **Expect:**  
   * “Any Area” **not** shown.  
   * Proceed button disabled until a specific area is picked.  
   * Helper line + red asterisk indicate requirement.  
4. After picking an area, Proceed button enables; payload includes `"area":<uid>`.

### 3.3 Edge cases
* If `arSelect=false` ⇒ area panel never appears; bookings proceed as before.  
* If chosen time has **no** matching areas ⇒ area panel hidden, requirement waived.  
* Verify responsiveness on mobile viewport.

---

## 4 · Commit & Push

```bash
git add src/components/ReservationForm.jsx \
        src/components/AreaSelection.jsx \
        src/utils/apiFormatter.js \
        src/i18n/en.json \
        src/config/configLoader.js
git commit -m "feat: area selection with areaAny support"
git push   # push to your feature branch
```

Create a PR and tag reviewers.

---

**Done – the widget now honours `arSelect` & `areaAny`, enforcing area selection only when required.**
