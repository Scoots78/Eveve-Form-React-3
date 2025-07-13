# Eveve React Widget

A frontend booking widget built with **React**, **Tailwind CSS**, and **Vite**, designed to integrate with the **Eveve restaurant booking API**. This project is currently under development and aims to provide an embeddable widget that restaurants can use to allow customers to select dates, guest numbers, and dynamically retrieve configuration data using their Eveve UID.

---

## 🚀 Tech Stack

- **React** – Component-based UI rendering
- **Tailwind CSS** – Utility-first styling
- **Vite** – Fast development server and build tool
- **react-flatpickr** – Date picker library
- **date-fns** – For date formatting and utilities.
- **Custom Hooks** – e.g., `useDebounce` for optimizing API calls.
- **ESBuild** – Powered by Vite for fast bundling

---

## 🎯 Current Features

- [x] **React, Vite, Tailwind CSS Base:** Solid foundation for the widget.
- [x] **Dynamic Restaurant Configuration:** Loads restaurant-specific settings, UI text (language strings), and operational parameters (min/max guests, time format, date format, etc.) using a `?est=UID` query parameter via `configLoader.js`.
- [x] **Interactive Date Picker:** Allows users to select a booking date using `react-flatpickr`, with options for disabling past dates, configured by the dynamic configuration.
- [x] **Guest Number Selection:** Users can easily increment or decrement the number of guests, constrained by `partyMin` and `partyMax` from the configuration.
- [x] **Real-time Availability:** Fetches and displays available booking slots (shifts and specific times) from the Eveve API (`/web/day-avail`) based on selected date and guest count.
- [x] **Addon Selection System:**
    - Displays available "Menus" (e.g., Set Menu A, A La Carte) and "Options" (e.g., Wine Pairing, Extra Bread) associated with a selected time slot, parsed from the availability response.
    - Supports different selection modes for Menus based on `usage` policy (e.g., `usage: 1` for radio-button style single selection, `usage: 2` for quantity selection per menu up to guest count and `maxMenuTypes`, `usage: 3` for checkbox style multiple selection up to guest count or `maxMenuTypes`).
    - Handles quantity selection for Options, respecting their individual `min`/`max` values, the total guest count, and the quantity of any parent Menu they are attached to.
- [x] **Selected Addons Summary:** Shows a real-time summary of chosen addons and their quantities.
- [x] **Debounced API Calls:** Efficiently fetches availability by debouncing requests during date/guest input changes using a custom `useDebounce` hook.
- [x] **Basic Error Handling & Loading States:** Displays messages for configuration loading errors, availability API issues, and loading indicators during data fetching.
- [x] **API Data Formatting:** Includes utility `formatSelectedAddonsForApi` to structure selected addon data for future API submission.
- [x] **Placeholder Booking Action:** A "Proceed to Booking" button simulates the data that would be sent to a booking/hold API.

---

## 🔧 Setup Instructions

1. Clone the repository or extract the zip.
2. Navigate into the project folder:
   ```bash
   cd eveve-react-widget
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open your browser to [http://localhost:5173/?est=testnza](http://localhost:5173/?est=testnza) (or replace `testnza` with another restaurant UID).

---

## 📌 Goals & Next Steps

- **Full Booking Flow Integration:**
    - [ ] **Implement "Hold Reservation":** Integrate with the Eveve `/web/hold` API endpoint, sending date, time, guests, and formatted addon data.
    - [ ] **Selection Summary/Confirmation:** Create an intermediate step or modal to display currently selected values (selected shift, selected date, selected guests, selected time) for user review before collecting customer details.
    - [ ] **Customer Details Form:** Develop a new component/step to collect user information (name, email, phone, notes) after a successful hold.
    - [ ] **Confirm Booking:** Integrate with the final Eveve booking confirmation API endpoint.
- **UI/UX Refinements:**
    - [ ] **Condense Long Forms:** Implement strategies to make the form less overwhelming, especially the addon section (see "UI Improvement Suggestions" below).
    - [ ] **Visual Feedback:** Enhance feedback for addon selection constraints (e.g., why an option is disabled or quantity is capped).
    - [ ] **Price Display:** Integrate and display pricing for addons and a total booking price.
- **Advanced Addon Logic & Configuration:**
    - [ ] **Addon Dependencies:** Handle more complex addon dependencies if required by API (e.g., option X requires menu Y).
    - [ ] **Session/Offer Handling:** If `sid` (session ID) or `offer` parameters become relevant, integrate their selection and impact on availability/addons.
- **Comprehensive Error Handling:**
    - [ ] Provide more granular and user-friendly error messages for various API failure scenarios (hold, confirm booking).
    - [ ] Implement retry mechanisms for transient network errors.
- **Testing:**
    - [ ] **Unit Tests:** Write tests for `ReservationForm` logic, `addonSelection` rules, `apiFormatter`, and `configLoader`.
    - [ ] **Integration Tests:** Create end-to-end tests for the booking flow once implemented.
- **Code Quality & Maintainability:**
    - [ ] **Component Granularity:** Break down `ReservationForm.jsx` into smaller, more focused sub-components (e.g., for shift display, time selection).
    - [ ] **State Management:** Evaluate if a more robust state management solution (like Zustand or Redux Toolkit) is needed as complexity grows.
    - [ ] **Documentation:** Add JSDoc or similar documentation for props, functions, and complex logic.

---

## 💡 UI Improvement Suggestions

The `ReservationForm.jsx` component can become quite long, especially when numerous shifts, times, and addons are available. Here are some suggestions to improve the user experience by condensing the interface:

*   **Accordions/Collapsible Sections:**
    *   **Shift Details:** If multiple shifts are returned, display each shift name as a clickable header that expands to show its details (description, times, addons). Only one shift might be expanded by default, or the most relevant one.
    *   **Addon Categories:** Group addons (Menus and Options) under collapsible sections if the list is extensive. For example, "Set Menus", "Drinks Packages", "Side Dishes".
    *   **Selected Addons Summary:** Place the summary in a collapsible section that can be expanded for review before proceeding.

*   **Multi-Step/Tabbed Interface:**
    *   Break the booking process into logical steps or tabs:
        1.  **Date & Guests:** Initial selection.
        2.  **Time & Addons:** Appears after date/guests are valid. This step could further have sub-sections or a clear flow from time selection to addon selection.
        3.  **Review & Confirm:** Shows a summary of all selections (date, time, guests, addons, total price) before the "Proceed to Booking" action.

*   **Dynamic Section Visibility:**
    *   Only show sections when they become relevant. For example, the addon selection area should only appear after a specific time slot has been chosen.
    *   The "Selected Addons Summary" could be a floating element or a sidebar that updates dynamically, rather than a static block that pushes content down.

*   **Modal Dialogs for Addons:**
    *   For complex addons with many choices or detailed descriptions, consider opening them in a modal dialog upon clicking an "Add" or "Customize" button next to the addon name. This keeps the main form cleaner.

*   **Consolidated Time Slot Display:**
    *   If there are many time slots for a shift without significant individual differences (e.g., no unique addons per time slot), explore more compact ways to display them, perhaps in a tighter grid or a horizontal scroll.

*   **"Smart" Defaults & Quick Add:**
    *   If some addons are very common, offer a "quick add" option.
    *   Pre-select default addons if appropriate based on restaurant configuration or popular choices, allowing users to customize further if needed.

These approaches can help manage the visual complexity and guide the user more smoothly through the booking process.

---

## 🔍 Note

Ensure your antivirus or firewall is not blocking local file creation or auto-deleting any key components. The application relies on dynamic configuration fetched from an external API based on the `est` parameter.

---

## 📄 License

MIT License – for development and educational use only at this stage.
