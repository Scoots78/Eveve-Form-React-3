# Eveve React Widget – Debug Mode Reference Guide

_Updated August 2025_

---

## 1. What Is Debug Mode?  

Debug mode is a **developer-only overlay** that surfaces the internal state of the Eveve booking widget directly in the UI—no need to inspect Redux, React DevTools or console logs.  
When enabled it renders colour-coded panels at critical stages of the flow, showing **variable names and live values** so you can quickly trace data as it moves from page ➊ (search & addons) to page ➋ (details / payment).

| Panel Colour | Location | Primary Purpose |
|--------------|-----------|-----------------|
| 🟡 Yellow    | Selected Add-ons Summary (Booking page) | Costs, addon UIDs/qty/pricing |
| 🟠 Orange    | “Proceed to Booking” button (Booking page) | Time / date / covers / area that will be posted to hold endpoint |
| 🔵 Blue      | Booking Summary (Details modal) | Final payload preview incl. transferred addon cost |

---

## 2. Enabling / Disabling

Debug mode is toggled by a single **URL parameter**:

```
?debug=true      # enable
?debug=false     # disable (or remove the param)
```

The flag is read once on page load by `ReservationForm.jsx`:

```js
const debugMode = new URLSearchParams(window.location.search).get('debug') === 'true';
```

No build-time flags, environment variables or re-compile are required—works the same in `npm run dev` and production builds.

---

## 3. Panels in Detail

### 3.1 Selected Add-ons Summary Panel 🟡

Location: Under the “Selected Add-ons Summary” card on the booking page.

Shows:

* `totalAddonCost` – _raw cents_
* `totalAddonCost (formatted)` – currency string (`$12.50`)
* Counts:
  * `selectedAddons.menus.length`
  * `Object.keys(selectedAddons.options).length`
* `guestCount`
* **Detailed Menus**  
  ```
  menu[0].uid          // numeric UID
  menu[0].name         // display name
  menu[0].price        // price in cents
  menu[0].quantity     // qty (usage:2)
  menu[0].per          // "Guest", "Item", "Party" …
  ```
* **Detailed Options**  
  ```
  option[0].uid
  option[0].quantity
  option[0].name
  option[0].price
  option[0].per
  ```

### 3.2 Booking Button Panel 🟠

Location: Immediately below the purple “Proceed to Booking” button.

Shows:

```
selectedShiftTime.name
selectedDate                     // YYYY-MM-DD
guests
selectedShiftTime.selectedTime   // decimal time e.g. 18.75
selectedAreaName
selectedArea                     // UID | "any" | null
proceedButtonState.text
proceedButtonState.disabled      // true | false
```

### 3.3 Booking Summary Panel 🔵

Location: Inside `BookingDetailsModal` under the standard “Booking Summary”.

Shows:

```
bookingData.formattedDate
bookingData.time
bookingData.covers
bookingData.areaName
bookingData.formattedAddons      // human-readable string
bookingData.addons               // uid[:qty],uid…
totalAddonCost                   // carried forward (cents)
totalAddonCost (formatted)
bookingData.area
holdData.perHead
holdData.uid
holdData.card                    // 0 none, 1 no-show, 2 deposit
```

---

## 4. Implementation Notes (Developer)

1. **ReservationForm.jsx**
   * Detects `debug` URL param.
   * Passes `debugMode` to `SelectedAddonsSummary` and `BookingDetailsModal`.
   * Calculates `totalAddonCost` **once** when user clicks “Proceed to Booking” and injects it into `bookingData`.

2. **SelectedAddonsSummary.jsx**
   * New `debugMode` prop renders yellow panel.
   * Utility `findAddonByUid` enables name/price lookup for options.
   * Loops through `selectedAddons` to output raw values.

3. **Booking Button Section (inside ReservationForm)**
   * Inline JSX block renders orange panel when `debugMode`.

4. **BookingDetailsModal.jsx**
   * Accepts `debugMode` prop.
   * Blue panel added to `renderBookingSummary()`.
   * Displays `totalAddonCost` passed via `bookingData`.

5. **Styling**
   * Tailwind utility classes—no global CSS changes.
   * Colours chosen for high contrast but easy removal.

---

## 5. Usage Examples

### Local Dev

```
npm run dev
open http://localhost:5173/?est=demo123&debug=true
```

### Production QA

```
https://your-site.com/booking-widget/?est=55&covers=2&debug=true
```

Disable quickly by deleting `debug=true` or toggling browser query string editor.

---

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| No debug panels visible | Missing or misspelled `debug=true` | Check URL query string |
| Yellow panel missing prices | `currentShiftAddons` not passed / addon price undefined | Verify API response contains `price` field |
| Blue panel shows `totalAddonCost: null` | Calculation failed or not passed | Ensure “Proceed to Booking” was clicked **after** addons selected; confirm ReservationForm calculation code present |
| Panel overlaps content | Temporary dev feature; adjust Tailwind classes or hide debug mode |

---

## 7. Screenshot Placeholders

> Replace with real images or GIFs in `/docs/images/` once available.

| Panel | Example |
|-------|---------|
| Selected Add-ons Summary 🟡 | ![Yellow panel](docs/images/debug-yellow.png) |
| Booking Button 🟠 | ![Orange panel](docs/images/debug-orange.png) |
| Booking Summary 🔵 | ![Blue panel](docs/images/debug-blue.png) |

---

## 8. Extending Debug Mode

* **Add new variables**: locate the relevant panel’s JSX block and insert additional `<div className="flex justify-between">` rows.
* **Different trigger**: change the URL param test in `ReservationForm`—e.g., read from `localStorage` or environment variable.
* **Production safety**: since debug panels are pure client-side, they will never render unless the flag is explicitly present.

---

### Happy Debugging!  
For questions contact the frontend team / #eveve-widget-dev Slack channel.
