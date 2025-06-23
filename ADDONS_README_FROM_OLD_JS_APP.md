# Addon Handling Logic

This document details how addons are managed and processed within the booking system, from API data retrieval to UI interaction and API submission.

## Table of Contents

1.  [Addon Data Structure](#addon-data-structure)
2.  [Addon Usage Policies and UI Rendering](#addon-usage-policies-and-ui-rendering)
    *   [Usage Policy 1: Radio Buttons / Single Checkbox](#usage-policy-1-radio-buttons--single-checkbox)
    *   [Usage Policy 2: Incremental Quantity](#usage-policy-2-incremental-quantity)
    *   [Usage Policy 3: Multiple Checkboxes](#usage-policy-3-multiple-checkboxes)
    *   [Usage Policy 0 (or other): Default/Generic Checkboxes](#usage-policy-0-or-other-defaultgeneric-checkboxes)
3.  [Addon Filtering](#addon-filtering)
    *   [Cover Count Filtering](#cover-count-filtering)
    *   [Area-Specific Filtering](#area-specific-filtering)
4.  [State Management for Addons](#state-management-for-addons)
5.  [UI Rendering Logic](#ui-rendering-logic)
6.  [Event Handling for Addons](#event-handling-for-addons)
7.  [API Interaction for Addons](#api-interaction-for-addons)

## 1. Addon Data Structure

Addon data is received from the API as part of a shift's details (e.g., within an array in `shiftObject.addons`). Each addon is an object containing several properties that define its characteristics, pricing, and display. Understanding this structure is key to how addons are processed and presented to the user.

The primary properties for an addon object are:

*   **`uid`** (String or Number):
    *   Description: A unique identifier for the addon.
    *   Example: `"addon_123"`, `456`
    *   Usage: Essential for tracking selections, rendering unique HTML element IDs, and referencing in API calls.

*   **`name`** (String):
    *   Description: The human-readable display name of the addon.
    *   Example: `"Glass of Champagne"`, `"Birthday Cake"`
    *   Usage: Shown to the user in the list of available addons.

*   **`price`** (Number):
    *   Description: The cost of the addon. This is typically provided in the smallest currency unit (e.g., cents).
    *   Example: `1200` (representing $12.00 or £12.00)
    *   Usage: Used for display and for calculating the total cost of the booking. The UI formats this into a readable currency string (e.g., `+$12.00`).

*   **`desc`** (String, Optional):
    *   Description: A more detailed description of the addon.
    *   Example: `"A chilled glass of our finest house Champagne."`, `"Includes candles and a personalized message."`
    *   Usage: Displayed below the addon name to provide more context to the user.

*   **`per`** (String):
    *   Description: Specifies how the `price` is applied – whether it's per guest or a fixed charge for the item itself.
    *   Common Values:
        *   `"Guest"`: The addon price is multiplied by the number of guests if selected (this application logic is handled during price calculation, often for display in summary or confirmation, rather than the base price itself being per guest inherently in `addon.price`).
        *   (any other value or missing): Typically implies a fixed price for the addon, irrespective of the guest count. The exact value for "fixed" might vary or be inferred if `per` is not `"Guest"`.
    *   Usage: Critical for accurate price calculation, especially when addons are charged on a per-guest basis.

*   **`type`** (String, Optional):
    *   Description: A classification or category for the addon.
    *   Example: `"Beverage"`, `"Celebration"`
    *   Usage: While present in the data model, this field is not heavily used in the current UI rendering logic for conditional behaviors beyond data organization. It could be used for future enhancements like grouping addons.

*   **`min`** (Number, Optional):
    *   Description: The minimum number of guests required in the booking for this addon to be available or automatically included.
    *   Example: `2` (addon only available if 2 or more guests)
    *   Usage: Used in the `renderAddons` function to filter addons based on the current number of selected guests. If not specified, it often defaults to `1`.

*   **`max`** (Number, Optional):
    *   Description: The maximum number of guests in the booking for which this addon is available or applicable.
    *   Example: `10` (addon only available if 10 or fewer guests)
    *   Usage: Also used in `renderAddons` for filtering. If not specified, it often defaults to a very high number (effectively no maximum).

*   **`area_uids`** (Array of Strings/Numbers, Optional):
    *   Description: A list of unique identifiers for seating areas where this addon is specifically available.
    *   Example: `["area_patio", "area_window"]`
    *   Usage: Intended for restricting addon availability to certain parts of the establishment. As noted in the "Addon Filtering" section, the current client-side implementation primarily assumes addons are pre-filtered by the API or are generally available, with client-side filtering by `area_uids` being a potential future enhancement or a responsibility of the API.

This comprehensive data structure allows for flexible and varied addon offerings, each with its own rules for availability and pricing. The client-side JavaScript then uses this data to render the appropriate UI elements and manage user selections.

## 2. Addon Usage Policies and UI Rendering

Shifts (and potentially events) obtained from the API include a `usage` policy (e.g., `shiftObject.usage`). This policy number dictates how addons associated with that shift are presented and behave in the UI. The `ui_manager.js` module is responsible for interpreting this policy and rendering the appropriate input elements.

### Usage Policy 1: Radio Buttons / Single Checkbox (`usage: 1`)

*   **Behavior**: This policy ensures that the user can select at most one addon from the available list for the shift.
*   **UI Rendering (`renderUsage1Addons` in `ui_manager.js`):**
    *   **Single Addon**: If only one addon (after filtering) is available for this policy, it is rendered as a single checkbox.
        ```html
        <div class="addon-item usage1-single">
            <input type="checkbox" class="addon-checkbox usage1-checkbox" value="{addon.uid}" id="addon-{addon.uid}-{shiftName}"
                   data-addon-uid="{addon.uid}" data-addon-name="{addon.name}"
                   data-addon-price="{addon.price}" data-addon-desc="{addon.desc}"
                   data-addon-per="{addon.per}" data-addon-type="{addon.type}">
            <label for="addon-{addon.uid}-{shiftName}">
                <span class="addon-name">{addon.name}</span>
                <span class="addon-price">(+{currencySymbol}{price})</span>
                <br><small class="addon-desc">{addon.desc}</small> <!-- Example: description might be multiline -->
            </label>
        </div>
        ```
    *   **Multiple Addons**: If multiple addons are available, they are rendered as a group of radio buttons. This inherently allows only one selection. The `name` attribute of the radio buttons is dynamically generated (e.g., `shift_{shiftName}_usage1_addons`) to group them.
        ```html
        <div class="addon-radio-group">
            <div class="addon-item usage1-radio">
                <input type="radio" class="addon-radio usage1-radio-btn"
                       name="shift_{shiftName_sanitized}_usage1_addons" value="{addon.uid}" id="addon-{addon.uid}-{shiftName_sanitized}"
                       data-addon-uid="{addon.uid}" data-addon-name="{addon.name}"
                       data-addon-price="{addon.price}" data-addon-desc="{addon.desc}"
                       data-addon-per="{addon.per}" data-addon-type="{addon.type}">
                <label for="addon-{addon.uid}-{shiftName_sanitized}">
                    <span class="addon-name">{addon.name}</span>
                    <span class="addon-price">(+{currencySymbol}{price})</span>
                    <br><small class="addon-desc">{addon.desc}</small>
                </label>
            </div>
            <!-- ... more radio items ... -->
        </div>
        ```
*   **State Management**: The selected addon object (or `null` if none) is stored in `state.currentSelectedAddons.usage1` (see `state_manager.js`).
*   **Event Handling**: `handleAddonUsage1Selection` in `event_handlers.js` updates the state upon user interaction.

### Usage Policy 2: Incremental Quantity (`usage: 2`)

*   **Behavior**: This policy allows users to select quantities for one or more addons. A key constraint is that the sum of quantities for all selected "Usage 2" addons cannot exceed the total number of guests booked.
*   **UI Rendering (`renderUsage2Addons` in `ui_manager.js`):** Each addon is rendered with:
    *   Its name, price, and description.
    *   A quantity selector consisting of a "minus" button, a read-only quantity display input, and a "plus" button.
        ```html
        <div class="addon-item usage2-item">
            <div class="addon-info">
                <span class="addon-name">{addon.name}</span>
                <span class="addon-price">(+{currencySymbol}{price})</span>
                <br><small class="addon-desc">{addon.desc}</small>
            </div>
            <div class="addon-quantity-selector">
                <button type="button" class="qty-btn minus-btn">-</button>
                <input type="text" class="qty-input" value="0" readonly
                       data-addon-uid="{addon.uid}" data-addon-name="{addon.name}"
                       data-addon-price="{addon.price}" data-addon-desc="{addon.desc}"
                       data-addon-per="{addon.per}" data-addon-type="{addon.type}">
                <button type="button" class="qty-btn plus-btn">+</button>
            </div>
        </div>
        ```
    *   The "plus" button (class `plus-btn`) is disabled if the total quantity of usage 2 addons already equals the guest count, or if the guest count is 0.
    *   The "minus" button (class `minus-btn`) is disabled when the quantity for that specific addon is 0.
    *   The `updateAllUsage2ButtonStatesUI` function in `ui_manager.js` dynamically updates the enabled/disabled state of these buttons based on the current guest count and total selected quantity of usage 2 items.
*   **State Management**: Selected addons are stored as an array in `state.currentSelectedAddons.usage2`. Each object in the array includes the addon details plus a `quantity` property.
    ```javascript
    // Example state.currentSelectedAddons.usage2
    [
        { uid: "101", name: "Extra Bread", price: 200, quantity: 2, /* other addon props */ },
        { uid: "102", name: "Sparkling Water", price: 500, quantity: 1, /* other addon props */ }
    ]
    ```
*   **Event Handling**: Clicks on the plus/minus buttons are handled by `addonsDelegatedListener`, which calls `handleUsage2ButtonClick`. This, in turn, calls `handleAddonUsage2Selection` in `event_handlers.js` to update quantities in the state.

### Usage Policy 3: Multiple Checkboxes (`usage: 3`)

*   **Behavior**: This policy allows users to select multiple addons simultaneously. Each addon selection is independent.
*   **UI Rendering (`renderUsage3Addons` in `ui_manager.js`):** Each addon is rendered as a checkbox.
    ```html
    <div class="addon-item usage3-item">
        <input type="checkbox" class="addon-checkbox usage3-checkbox" value="{addon.uid}" id="addon-{addon.uid}-{shiftName_sanitized}"
               data-addon-uid="{addon.uid}" data-addon-name="{addon.name}"
               data-addon-price="{addon.price}" data-addon-desc="{addon.desc}"
               data-addon-per="{addon.per}" data-addon-type="{addon.type}">
        <label for="addon-{addon.uid}-{shiftName_sanitized}">
            <span class="addon-name">{addon.name}</span>
            <span class="addon-price">(+{currencySymbol}{price})</span>
            <br><small class="addon-desc">{addon.desc}</small>
        </label>
    </div>
    ```
*   **State Management**: Selected addons are stored as an array of addon objects in `state.currentSelectedAddons.usage3`.
*   **Event Handling**: `handleAddonUsage3Selection` in `event_handlers.js` adds or removes addons from the state array based on checkbox interaction.

### Usage Policy 0 (or other): Default/Generic Checkboxes

*   **Behavior**: If the `usagePolicy` is `0`, not defined, or an unrecognized value, the system defaults to a generic addon handling mechanism.
*   **UI Rendering (`renderGenericAddons` in `ui_manager.js`):** These addons are rendered as checkboxes, similar to Usage Policy 3, allowing multiple selections. The checkbox class is `generic-addon-checkbox`.
    ```html
    <div class="addon-item generic-addon-item">
        <input type="checkbox" class="addon-checkbox generic-addon-checkbox" value="{addon.uid}" id="addon-generic-{addon.uid}-{shiftName_sanitized}"
               data-addon-uid="{addon.uid}" data-addon-name="{addon.name}"
               data-addon-price="{addon.price}" data-addon-desc="{addon.desc}"
               data-addon-per="{addon.per}" data-addon-type="{addon.type}">
        <label for="addon-generic-{addon.uid}-{shiftName_sanitized}">
             <span class="addon-name">{addon.name}</span>
             <span class="addon-price">(+{currencySymbol}{price})</span>
             <br><small class="addon-desc">{addon.desc}</small>
        </label>
    </div>
    ```
*   **State Management**: Interactions with these generic checkboxes are also handled by `handleAddonUsage3Selection` (as it listens for `.generic-addon-checkbox`), and thus, these selections are also stored in `state.currentSelectedAddons.usage3`. This effectively merges the state for "Usage 3" and "Generic/Default" checkbox-style addons.

In all rendering methods, `data-*` attributes are attached to the input elements. These attributes store all necessary details of the addon (`uid`, `name`, `price`, `desc`, `per`, `type`), making it easy for event handlers to retrieve this information without needing to look up the addon details elsewhere when an interaction occurs. The `shiftName` (often sanitized to replace spaces, e.g., with underscores) is used to create unique `id` attributes for labels and inputs, ensuring proper association.

## 3. Addon Filtering

Before addons are rendered in the UI, the raw list of addons received from the API for a particular shift or event undergoes a filtering process. This ensures that only relevant and applicable addons are presented to the user based on the current booking context (e.g., number of guests).

### Cover Count Filtering

*   **Mechanism**: Each addon object from the API can include `min` and `max` properties, representing the minimum and maximum number of guests (covers) for which the addon is valid.
    *   `addon.min`: The minimum number of guests required. If a booking has fewer guests than this value, the addon will be filtered out. Defaults to `1` if not specified in the addon data.
    *   `addon.max`: The maximum number of guests allowed. If a booking has more guests than this value, the addon will also be filtered out. Defaults to `Infinity` (no practical upper limit) if not specified.
*   **Implementation**: This filtering logic is primarily executed within the `renderAddons` function in `ui_manager.js`.
    ```javascript
    // Inside renderAddons function (ui_manager.js)
    let addonsToRender = originalAddonsArray.filter(addon => {
        const minCovers = (typeof addon.min === 'number' && !isNaN(addon.min)) ? addon.min : 1;
        const maxCovers = (typeof addon.max === 'number' && !isNaN(addon.max)) ? addon.max : Infinity;
        // numericGuestCount is the current number of guests selected by the user
        return numericGuestCount >= minCovers && numericGuestCount <= maxCovers;
    });
    ```
*   **Effect**: Only addons that are appropriate for the current number of selected guests are passed on to the specific rendering functions (e.g., `renderUsage1Addons`, `renderUsage2Addons`). If no addons remain after this filtering, the addon section might be hidden or display a "no addons available" message.

### Area-Specific Filtering

*   **Concept**: Some addons might only be available when the user selects a particular seating area in the establishment (e.g., "Outdoor Dining Special" only for the "Patio" area). Addon data can potentially include an `area_uids` array, listing the UIDs of areas where the addon is valid.
*   **Current Implementation**:
    *   The `renderAddons` function in `ui_manager.js` includes a *commented-out placeholder* for client-side area-specific filtering.
        ```javascript
        // Inside renderAddons function (ui_manager.js)
        // ...
        // if (areaId && areaId !== "any") { // Example: only filter if a specific area is chosen
        //     addonsToRender = addonsToRender.filter(addon => {
        //        // return !addon.area_uids || addon.area_uids.includes(areaId); // Example logic
        //        return true; // Assuming API pre-filters for now
        //     });
        // }
        ```
    *   The comment `// Assuming API pre-filters for now` indicates that the current operational assumption is that the API is responsible for sending only area-appropriate addons. If the API doesn't pre-filter, and this client-side logic remains commented out, addons might be shown even if they aren't strictly applicable to a chosen specific area.
*   **Behavior if Implemented**: If this client-side filtering were active, when a user selects a specific area (e.g., "Terrace"), `renderAddons` would be called with the `areaId`. The filter would then iterate through addons, checking if their `addon.area_uids` list (if present) includes the selected `areaId`, or if the addon is generally available (e.g., `addon.area_uids` is undefined or empty). If "Any Area" is selected, this filtering step would likely be bypassed, showing all addons that pass the cover count filter.

The filtering stage is crucial for tailoring the addon choices to the user's specific booking details, simplifying the selection process and preventing the display of irrelevant options.

## 4. State Management for Addons

Effective state management is essential for tracking user selections for addons and ensuring the UI reflects the current state accurately. The `state_manager.js` module centralizes this logic.

Key state variables related to addons include:

*   **`state.currentSelectedAddons`**: This is the core object holding all addon selections made by the user. It's structured to accommodate different usage policies:
    *   **`usage1: null | Object`**:
        *   Stores the complete addon object if an addon under Usage Policy 1 (single checkbox or radio button) is selected.
        *   It's `null` if no selection is made or if a different usage policy is active.
        *   Example: `{ uid: "addon_abc", name: "Welcome Drink", price: 500, ... }`
    *   **`usage2: Array<Object>`**:
        *   Stores an array of addon objects for selections made under Usage Policy 2 (incremental quantity).
        *   Each object in the array is a copy of the original addon data, augmented with a `quantity` property indicating how many units of that addon have been selected.
        *   Example:
            ```javascript
            [
                { uid: "addon_qty1", name: "Extra Servings", price: 300, quantity: 2, ... },
                { uid: "addon_qty2", name: "Side Dish", price: 450, quantity: 1, ... }
            ]
            ```
    *   **`usage3: Array<Object>`**:
        *   Stores an array of addon objects for selections made under Usage Policy 3 (multiple checkboxes) or the default/generic checkbox policy.
        *   Example:
            ```javascript
            [
                { uid: "addon_opt1", name: "Gift Wrap", price: 150, ... },
                { uid: "addon_opt2", name: "Priority Seating", price: 1000, ... }
            ]
            ```

*   **`state.currentShiftUsagePolicy: null | Number`**:
    *   Stores the active `usage` policy number (e.g., `0`, `1`, `2`, `3`) associated with the currently selected shift or event time.
    *   This value is determined from the `shift.usage` property of the API data for the selected time slot.
    *   It's crucial for `renderAddons` to know which rendering logic to apply and for `event_handlers.js` to correctly process interactions.
    *   Set to `null` when no time/shift is selected or during resets.

*   **`state.selectedAddonsForContext: null | Object`**:
    *   This state variable stores a snapshot of `state.currentSelectedAddons` at the point when the user proceeds from addon selection to the confirmation/details stage (e.g., after clicking the "Next" button and a successful `holdBooking` call).
    *   It ensures that the addons confirmed with the initial hold are the ones sent in the final booking confirmation (`PATCH /web/update`), even if the user were to go back and change selections (though the flow typically prevents this without re-initiating the hold).
    *   Populated by `setSelectedAddonsForContext(getSelectedAddons())` in `event_handlers.js` during `handleNextButtonClick`.

**Getter and Setter Functions in `state_manager.js`**:

The module provides functions to interact with these state variables, ensuring controlled access and updates:

*   **`getSelectedAddons()`**: Returns a *deep copy* of `state.currentSelectedAddons`. This is important to prevent direct modification of the state object from outside the state manager, promoting unidirectional data flow.
    ```javascript
    // state_manager.js
    export function getSelectedAddons() {
        return JSON.parse(JSON.stringify(state.currentSelectedAddons));
    }
    ```

*   **`setSelectedAddons(newAddons)`**: Replaces the entire `state.currentSelectedAddons` object with a *deep copy* of `newAddons`.
    ```javascript
    // state_manager.js
    export function setSelectedAddons(newAddons) {
        state.currentSelectedAddons = JSON.parse(JSON.stringify(newAddons));
    }
    ```

*   **`resetSelectedAddons()`**: Resets `state.currentSelectedAddons` to its initial empty state: `usage1` becomes `null`, and `usage2` and `usage3` become empty arrays. This is called when selections need to be cleared (e.g., date/time change).

*   **`getCurrentShiftUsagePolicy()` / `setCurrentShiftUsagePolicy(policy)`**: Standard getter and setter for the usage policy.

*   **`getSelectedAddonsForContext()` / `setSelectedAddonsForContext(addons)`**: Getter and setter for the addons context used in the final booking confirmation. The setter also stores a deep copy.

**Workflow**:
1.  When a shift/time is selected, `setCurrentShiftUsagePolicy` is called.
2.  `resetSelectedAddons` is typically called to clear previous choices.
3.  As the user interacts with addon UI elements (checkboxes, radio buttons, quantity steppers):
    *   Event handlers in `event_handlers.js` capture these interactions.
    *   They call the appropriate functions (e.g., `handleAddonUsage1Selection`, `handleAddonUsage2Selection`, `handleAddonUsage3Selection`).
    *   These handlers fetch the current addons using `getSelectedAddons()`, modify the copy, and then save it back using `setSelectedAddons()`.
4.  UI update functions (like `updateSelectedAddonsDisplay` and `updateNextButtonState` in `ui_manager.js`) then use `getSelectedAddons()` to refresh the display based on the new state.

This centralized state management approach ensures that there's a single source of truth for addon selections, which simplifies debugging and maintains consistency across different parts of the application.

## 5. UI Rendering Logic

The `ui_manager.js` module is responsible for dynamically generating and updating the HTML elements that display addon options to the user. This process is responsive to changes in selected date, time, guest count, and area.

**Core Rendering Function: `renderAddons()`**

*   **Signature**: `renderAddons(originalAddonsArray, usagePolicy, guestCount, shiftName, areaId = null)`
*   **Purpose**: This is the main orchestrator for displaying addons.
*   **Steps**:
    1.  **Clear Previous Addons**: It begins by clearing any existing addon elements from the designated display area in the HTML (typically a `div` with `id="addonsDisplayArea"`). This ensures a fresh render cycle.
        ```javascript
        // ui_manager.js
        const addonsDisplayArea = getAddonsDisplayArea(); // Gets the DOM element
        if (!addonsDisplayArea) { /* ... error handling ... */ return; }
        addonsDisplayArea.innerHTML = ''; // Clear previous content
        ```
    2.  **Filter Addons**:
        *   It filters the `originalAddonsArray` based on the current `guestCount` against each addon's `min` and `max` cover properties.
        *   It includes a placeholder for filtering by `areaId` (currently assumes API pre-filters or general applicability).
    3.  **Handle No Addons**: If, after filtering, no addons are left to display, the `addonsDisplayArea` is hidden (`style.display = 'none'`).
    4.  **Display Title**: If there are addons to render, a title like "Available Addons:" (fetched from language strings) is typically added to the display area.
    5.  **Delegate to Specific Renderers**: Based on the `usagePolicy` (0, 1, 2, or 3) passed from the selected shift/event:
        *   `renderUsage1Addons(filteredAddons, guestCount, shiftName)`: Creates single checkboxes or radio button groups.
        *   `renderUsage2Addons(filteredAddons, guestCount, shiftName)`: Creates quantity selectors for each addon.
        *   `renderUsage3Addons(filteredAddons, guestCount, shiftName)`: Creates multiple independent checkboxes.
        *   `renderGenericAddons(filteredAddons, guestCount, shiftName, usagePolicy)`: Handles default cases, usually rendering as checkboxes.
    6.  **Visibility**: The `addonsDisplayArea` is made visible (`style.display = 'block'`) if addons are rendered.

**Helper Rendering Functions (`renderUsage1Addons`, `renderUsage2Addons`, etc.)**

*   These functions are responsible for constructing the actual HTML strings or DOM elements for each addon item according to their specific usage policy.
*   They dynamically create `div` containers for each addon, `input` elements (checkbox, radio, text for quantity), and `label` elements.
*   **`data-*` Attributes**: Crucially, all relevant addon data (uid, name, price, description, per-guest status, type) is embedded into the `input` elements using `data-*` attributes (e.g., `data-addon-uid`, `data-addon-name`). This allows event handlers to easily access addon details when an interaction occurs without needing further lookups.
    ```javascript
    // Example from renderUsage1Addons
    // Helper function setAllAddonDataAttributes(element, addon) is used
    setAllAddonDataAttributes(checkbox, addon);
    // This would set:
    // checkbox.dataset.addonUid = addon.uid;
    // checkbox.dataset.addonName = addon.name;
    // ... and so on for price, desc, per, type.
    ```
*   Labels include the addon name, formatted price (e.g., `+$10.00`), and description. Currency symbols are fetched from the configuration.

**Updating Addon Summary and Controls**

*   **`updateSelectedAddonsDisplay()`**:
    *   Called whenever addon selections change (via event handlers).
    *   Retrieves the current selected addons from `state_manager.js` using `getSelectedAddons()`.
    *   Uses the `generateDetailedAddonsString(addonsObject, guestCount, currencySymbol)` utility to create a comprehensive, human-readable string summarizing all selected addons, their quantities (if applicable), individual costs, and the total cost of all selected addons.
    *   Updates the content of a dedicated summary element on the page (e.g., `<span id="selectedAddonsValue">`).
    *   Example output: `"Extra Bread x2 ($4.00), Birthday Cake ($15.00) --- Total Addons: $19.00"`

*   **`updateAllUsage2ButtonStatesUI(currentGuestCount)`**:
    *   Specific to Usage Policy 2 (incremental quantity addons).
    *   Iterates over all rendered usage 2 addon quantity selectors.
    *   Disables the "plus" button for an item if its quantity cannot be increased (e.g., total quantity of usage 2 addons would exceed `currentGuestCount`).
    *   Disables the "minus" button if an item's quantity is already 0.
    *   This ensures users cannot select invalid quantities.

*   **`updateNextButtonState()`**:
    *   The state of the main "Next" or "Proceed" button of the booking form is often dependent on addon selections, especially if a usage policy mandates selection (e.g., a required addon under policy 1) or specific quantities (policy 2).
    *   This function checks the current addon state against the `currentShiftUsagePolicy` and enables/disables the "Next" button accordingly. For example:
        *   Policy 1 (mandatory selection): Button disabled if no addon is chosen.
        *   Policy 2 (quantity must match guests, if configured as such): Button disabled if `getTotalUsage2AddonQuantity() !== guestCount`.
        *   Policy 0 or 3 (optional): Addon selection doesn't block the "Next" button.

**Resetting Addons UI**

*   When significant booking parameters change (like date, number of covers, or the selected time slot/shift), the entire addon section needs to be re-evaluated and re-rendered.
*   Functions like `resetTimeRelatedUI()` or parts of `handleDateOrCoversChange()` will typically:
    *   Call `resetSelectedAddons()` in `state_manager.js` to clear selections.
    *   Clear the `addonsDisplayArea.innerHTML`.
    *   Update the summary display to show no addons selected.
    *   Then, if new addon data is available for the new context, `renderAddons()` is called again.
*   The `resetCurrentAddonsUICallback` in `ui_manager.js` often points to a function that handles clearing the display and summary text.

The UI rendering logic is designed to be dynamic, reacting to both user input and data fetched from the API, providing an interactive and context-aware way for users to select addons.

## 6. Event Handling for Addons

User interactions with the addon UI elements (checkboxes, radio buttons, quantity steppers) are captured and processed by event handlers defined primarily in `event_handlers.js`. This module ensures that selections are correctly recorded in the application's state and that the UI is updated accordingly.

**Delegated Event Listener: `addonsDelegatedListener(event)`**

*   **Mechanism**: Instead of attaching individual event listeners to each addon input element (which can be numerous and dynamically created), a single delegated event listener is attached to a parent container, typically the `addonsDisplayArea` div.
    ```javascript
    // event_handlers.js - in initializeEventHandlers()
    if (addonsDisplayArea) {
        addonsDisplayArea.addEventListener('change', addonsDelegatedListener); // For checkboxes and radio buttons
        addonsDisplayArea.addEventListener('click', addonsDelegatedListener);  // For buttons like +/-
    }
    ```
*   **Functionality**:
    1.  When a `change` (for checkboxes/radios) or `click` (for buttons) event occurs within `addonsDisplayArea`, `addonsDelegatedListener` is triggered.
    2.  It inspects `event.target` (the actual element that was clicked or changed) to determine if it's an addon-related input.
    3.  It uses `event.target.matches()` with CSS selectors (e.g., `.addon-checkbox.usage1-checkbox`, `.qty-btn.plus-btn`, `.addon-checkbox.usage3-checkbox`) to identify the type of addon interaction.
    4.  It retrieves the addon's details (UID, name, price, etc.) from the `data-*` attributes attached to `event.target` or a relevant parent/sibling element.
    5.  Based on the interaction type, it calls one of the specific addon handling functions.

**Specific Addon Handler Functions (in `event_handlers.js`)**

These functions are responsible for updating the application state (`state_manager.js`) based on user input.

*   **`handleAddonUsage1Selection(eventTarget, addonData, isSingleCheckboxMode)`**:
    *   Triggered for Usage Policy 1 addons (single checkbox or radio buttons).
    *   If `isSingleCheckboxMode` is true:
        *   If `eventTarget.checked` is true, `state.currentSelectedAddons.usage1` is set to `addonData`.
        *   If `eventTarget.checked` is false, `state.currentSelectedAddons.usage1` is set to `null`.
    *   If radio buttons (not single checkbox mode):
        *   `state.currentSelectedAddons.usage1` is set to `addonData` (the selected radio button).
    *   After updating state, it calls `updateAddonsDisplayUI()` and `updateNextBtnUI()` to refresh the summary and Next button.

*   **`handleUsage2ButtonClick(clickedButton, addonDataset, change)`**:
    *   Triggered by `addonsDelegatedListener` when a plus (`.plus-btn`) or minus (`.minus-btn`) button for a Usage Policy 2 addon is clicked.
    *   `addonDataset` contains the `data-*` attributes from the quantity input field associated with the button.
    *   `change` is `1` for plus, `-1` for minus.
    *   It calculates the new quantity, ensuring it stays within valid bounds (>= 0, and total usage 2 quantity <= guest count).
    *   It then calls `handleAddonUsage2Selection` with the full addon data and the new quantity.

*   **`handleAddonUsage2Selection(addonData, quantity)`**:
    *   Manages `state.currentSelectedAddons.usage2` (array of usage 2 addons).
    *   It first removes any existing entry for `addonData.uid` from the array.
    *   If `quantity > 0`, it adds a new object `{ ...addonData, quantity }` to the array.
    *   Calls `updateAddonsDisplayUI()`, `updateNextBtnUI()`, and `updateAllUsage2ButtonStatesUI()` to reflect changes.

*   **`handleAddonUsage3Selection(eventTarget, addonData)`**:
    *   Triggered for Usage Policy 3 or generic addons (checkboxes).
    *   If `eventTarget.checked` is true, `addonData` is added to the `state.currentSelectedAddons.usage3` array (if not already present).
    *   If `eventTarget.checked` is false, `addonData` is removed from the `state.currentSelectedAddons.usage3` array.
    *   Calls `updateAddonsDisplayUI()` and `updateNextBtnUI()`.

**Triggering Addon Re-rendering and State Resets**

Addon selections and displays are not static; they often need to be reset and re-evaluated when other booking parameters change:

*   **`handleDateOrCoversChange()`**:
    *   When the user changes the booking date or the number of guests.
    *   This function typically triggers a new API call to fetch availability (`fetchAvailableTimes`).
    *   Crucially, before or after fetching new times, it usually involves:
        *   Resetting selected time, area, and shift/event details.
        *   Calling `resetStateAddons()` (from `state_manager.js`) to clear all current addon selections.
        *   The subsequent call to `displayTimeSlots()` (which calls `renderAddons()`) will then render addons based on the new context (new shift data, new guest count for filtering).

*   **`handleAreaChange()`**:
    *   When the user selects a different seating area (if area selection is enabled).
    *   It calls `resetStateAddons()` to clear addons selected for the previous area.
    *   Then, `renderAddons()` is invoked with the current shift's addons, guest count, and the new `areaId`. This allows for addons to be shown/hidden or change based on area applicability (though current filtering by area is mostly a placeholder).
    *   `updateAddonsDisplayUI()` and `updateNextBtnUI()` are called.

*   **`timeSlotDelegatedListener(event)`** (when a new time/shift/event is selected):
    *   When the user clicks on a new time slot button:
        *   The application state is updated with the new selected time, shift name (`setCurrentSelectedDecimalTime`), and potentially event details (`setSelectedEventDetails`).
        *   The `currentShiftUsagePolicy` is updated from the new shift's data.
        *   `resetStateAddons()` is called to clear any addons from a previously selected time.
        *   `updateAddonsDisplayUI()` clears the visual summary.
        *   `renderAddons()` is then called with the addon data specific to this newly selected shift/event, the current guest count, and the active usage policy.
        *   Finally, `updateNextBtnUI()` adjusts the Next button's state.

*   **`handleShiftChangeClearSelection()`**:
    *   A utility function often called when switching between different shift panels in an accordion UI or when a selection needs to be completely nullified.
    *   It resets selected time, event details, addons state (`resetStateAddons()`), clears the addon display area (`addonsDisplayArea.innerHTML = ''`), and updates UI summaries.

These event handlers work in concert with the state manager and UI manager to provide a reactive and consistent user experience for addon selection.

## 7. API Interaction for Addons

Once the user has made their selections, including any addons, this information needs to be communicated to the backend API to finalize the booking.

**Formatting Addons for API Submission: `formatSelectedAddonsForApi()`**

*   **Location**: `dom_utils.js`
*   **Purpose**: This utility function is responsible for converting the `state.currentSelectedAddons` object (which holds addon selections structured by usage policy) into a flat, comma-separated string format that the backend API expects.
*   **Input**: It takes the `addonsObject` (typically the result of `getSelectedAddons()` or `getSelectedAddonsForContext()`).
*   **Output Format**: A string where each selected addon is represented. The format for each addon in the string is `uid` or `uid:quantity`.
    *   **Usage Policy 1 (Radio/Single Checkbox)**: If an addon is selected, its `uid` is included. Quantity is implicitly 1.
        *   Example: If `addonsObject.usage1` is `{ uid: "A101", ... }`, it contributes `"A101"` to the string.
    *   **Usage Policy 2 (Incremental Quantity)**: For each selected addon, `uid:quantity` is included.
        *   Example: If `addonsObject.usage2` is `[{ uid: "B202", quantity: 3, ... }]`, it contributes `"B202:3"`.
    *   **Usage Policy 3 & Default (Checkboxes)**: For each selected addon, its `uid` is included. Quantity is implicitly 1.
        *   Example: If `addonsObject.usage3` includes `{ uid: "C303", ... }`, it contributes `"C303"`.
*   **Combined String**: All selected addons from different usage policies are combined into a single comma-separated string.
    *   Example: If selections include one from usage 1, two from usage 2, and one from usage 3, the string might look like: `"A101,B202:3,B205:1,C303"` (order may vary).
    *   If no addons are selected, an empty string is returned.

**API Endpoints and Addon Data**

Selected addons (formatted as the string above) are included in the following key API interactions:

1.  **Holding a Booking (`handleNextButtonClick` in `event_handlers.js`)**
    *   When the user clicks the "Next" button after making their initial selections (date, time, covers, area, addons).
    *   The `handleNextButtonClick` function prepares `holdApiData`.
    *   The `formatSelectedAddonsForApi(getSelectedAddons())` function is called to get the addons string.
    *   This string is assigned to `holdApiData.addons`.
        ```javascript
        // event_handlers.js
        const addonsString = formatSelectedAddonsForApi(getSelectedAddons());
        if (addonsString && addonsString.trim() !== "") {
            holdApiData.addons = addonsString;
        }
        ```
    *   **Discrepancy Note**: The `api_service.js` `holdBooking` function, which `handleNextButtonClick` calls, has a comment `// *** Addons are explicitly NOT appended ***` when constructing the GET request URL for the `https://nz.eveve.com/web/hold` endpoint.
        *   This suggests a potential inconsistency or an outdated comment. The `event_handlers.js` code *does* prepare the `addons` field in the `holdApiData` object.
        *   **If the comment in `api_service.js` is accurate for the GET request**, it implies that addons might be sent in a different manner for the hold step (e.g., not at all, or via a subsequent POST/PATCH after an initial hold confirmation, or that `holdApiData.addons` is used for a different purpose than being a query param in the GET hold).
        *   **If `event_handlers.js` reflects the intended logic for data preparation**, then `holdApiData.addons` is indeed populated. The `api_service.js` might be simplified and not using all fields from the passed object for that specific GET call.
        *   For the purpose of this documentation, we acknowledge that `event_handlers.js` prepares the addon string for the hold context. The exact mechanism of its transmission during the "hold" phase needs to be verified against backend expectations if the comment in `api_service.js` is still relevant.

2.  **Confirming/Updating a Booking (`handleConfirmBookingSubmit` in `event_handlers.js`)**
    *   After the initial hold is successful and the user fills in their personal details, they submit the form to confirm the booking.
    *   This triggers `handleConfirmBookingSubmit`.
    *   The addons string is retrieved from the context saved during the hold step: `formatSelectedAddonsForApi(getSelectedAddonsForContext())`. `getSelectedAddonsForContext()` returns the addons that were selected when the initial hold was placed.
    *   The formatted addons string is then included as a query parameter named `addons` in the `PATCH` request to the `https://nz.eveve.com/web/update` endpoint.
        ```javascript
        // event_handlers.js
        const formattedAddonsString = formatSelectedAddonsForApi(addonsContextObject); // addonsContextObject from getSelectedAddonsForContext()
        // ...
        const queryParamsData = { /* ..., */ };
        if (formattedAddonsString && formattedAddonsString.trim() !== "") {
            queryParamsData.addons = formattedAddonsString;
        }
        const queryParams = new URLSearchParams(queryParamsData);
        const apiUrl = `${baseUrl}?${queryParams.toString()}`; // baseUrl is https://nz.eveve.com/web/update
        // fetch(apiUrl, { method: 'PATCH' });
        ```
    *   This ensures that the final confirmed booking includes the addons selected by the user.

The consistent formatting of addon data by `formatSelectedAddonsForApi` is vital for the backend to correctly interpret and record the user's choices. The inclusion of this data in the `update` call is the primary mechanism for persisting addon selections with the booking.
