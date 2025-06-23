# Actively Used Configuration Variables

This document outlines the configuration variables that are parsed from the initial API call (`/api/get-config`) and are actively used within the frontend application. These variables control various aspects of the booking form's behavior and appearance.

They are typically fetched by `extract_js_vars_logic.py` from an external source, processed, and then made available to the JavaScript modules primarily through `config_manager.js` (stored in `bookingConfig` object) and `window.bookingConfig`.

## Actively Used Variables

Here's a list of variables, their original source name (from the Python extraction list, if different), expected data type after parsing in `config_manager.js`, and their purpose:

1.  **`estNameForApi`**
    *   Original Source: `RESTAURANT_ID`
    *   Type: `String`
    *   Managed in: `config_manager.js` (stores `RESTAURANT_ID` as `bookingConfig.estNameForApi`)
    *   Usage: Serves as the unique establishment identifier for constructing API call URLs in `api_service.js` (e.g., for fetching available times, holding bookings).

2.  **`languageStrings`**
    *   Original Source: `LANG_STRINGS` (expected as a JSON string)
    *   Type: `Object`
    *   Managed in: `config_manager.js` (parsed into `bookingConfig.languageStrings`)
    *   Usage: Contains key-value pairs for UI text localization. Accessed via `getLanguageStrings()` primarily in `ui_manager.js` for rendering labels, messages, and error texts, and also in `event_handlers.js`. `config_manager.js` also sets default fallback strings if specific keys are missing.

3.  **`minGuests`**
    *   Original Source: `MIN_GUESTS`
    *   Type: `Number`
    *   Managed in: `config_manager.js` (parsed as an integer into `bookingConfig.minGuests`)
    *   Usage: Defines the operational minimum number of guests allowed for a booking. It's accessed in `booking_page.js` (via `window.bookingConfig.minGuests`) to control the behavior of the guest count input field (e.g., decrement limit).

4.  **`maxGuests`**
    *   Original Source: `MAX_GUESTS`
    *   Type: `Number`
    *   Managed in: `config_manager.js` (parsed as an integer into `bookingConfig.maxGuests`)
    *   Usage: Defines the maximum number of guests allowed for a booking. This value is set as a `data-max` attribute on the covers display input in `main.js` (from `window.bookingConfig.maxGuests`) and subsequently used in `booking_page.js` to control the guest count input field (e.g., increment limit).

5.  **`areaAny`**
    *   Original Source: `AREA_ANY_AVAILABLE`
    *   Type: `String` ("true" or "false")
    *   Managed in: `config_manager.js` (stored as `bookingConfig.areaAny`)
    *   Usage: Determines if the "Any Area" option should be presented in the area selection interface. Checked in `ui_manager.js` during rendering of area selectors and in `event_handlers.js`.

6.  **`areaAnySelected`**
    *   Original Source: `AREA_ANY_DEFAULT_SELECTED`
    *   Type: `String` ("true" or "false")
    *   Managed in: `config_manager.js` (stored as `bookingConfig.areaAnySelected`)
    *   Usage: If `areaAny` is "true", this variable determines if the "Any Area" option should be selected by default when the area selection UI is first populated. Used in `ui_manager.js`.

7.  **`arSelect`**
    *   Original Source: `AREA_SELECTION_AVAILABLE`
    *   Type: `String` ("true" or "false")
    *   Managed in: `config_manager.js` (stored as `bookingConfig.arSelect`)
    *   Usage: A primary flag that controls whether the entire area selection feature is enabled. If "true", area selection UI components are shown and relevant logic is active. Checked in `main.js`, `ui_manager.js`, and `event_handlers.js`.

8.  **`showUnavailableSlotsConfig`** (indirectly used)
    *   Original Source: `SHOW_UNAVAILABLE_SLOTS`
    *   Type: `String` ("true" or "false")
    *   Managed in: `config_manager.js` (value used to set state in `state_manager.js`)
    *   Usage: The string value is converted to a boolean and stored in `state_manager.js`'s `showUnavailableSlots` state. This state is then queried via `getShowUnavailableSlots()` in `ui_manager.js` to decide whether to display time slots that are marked as unavailable (e.g., fully booked or explicitly disabled).

9.  **`usrLang`**
    *   Original Source: `USER_LANG`
    *   Type: `String`
    *   Managed in: `config_manager.js` (stored as `bookingConfig.usrLang`, then processed into `processedUsrLang`)
    *   Usage: Represents the user's language preference. It's processed (e.g., to extract primary language code like "en" from "en-US") and then used via `getProcessedUsrLang()` in `event_handlers.js` to set the `lng` parameter for API calls like `holdBooking`.

10. **`currSym`**
    *   Original Source: `CURRENCY_SYMBOL`
    *   Type: `String`
    *   Managed in: `config_manager.js` (stored as `bookingConfig.currSym`)
    *   Usage: Provides the currency symbol (e.g., "$", "£"). It's used in `ui_manager.js` when rendering addon prices and in the booking summary to display costs correctly. Also used in `dom_utils.js`.

11. **`dateFormat`**
    *   Original Source: `DATE_FORMAT`
    *   Type: `String`
    *   Managed in: `config_manager.js` (stored as `bookingConfig.dateFormat`)
    *   Usage: Specifies the desired user-facing date display format for the Flatpickr date picker. Used in `main.js` to set the `altFormat` option during Flatpickr initialization.

12. **`timeFormat`**
    *   Original Source: `TIME_FORMAT`
    *   Type: `Number` (expected to be 12 or 24)
    *   Managed in: `config_manager.js` (stored as `bookingConfig.timeFormat`)
    *   Usage: Determines whether time should be displayed in 12-hour (with AM/PM) or 24-hour format. Used by the `formatTime` utility in `dom_utils.js` (accessed via `window.bookingConfig.timeFormat`).

13. **`disablePast`**
    *   Original Source: `DISABLE_PAST_DATES`
    *   Type: `String` ("true" or "false")
    *   Managed in: `config_manager.js` (stored as `bookingConfig.disablePast`)
    *   Usage: If "true", past dates are disabled in the Flatpickr date picker. Used in `main.js` to set the `minDate` option of Flatpickr during initialization.

14. **`eventsB`**
    *   Original Source: `EVENT_JSON_STRING` (expected as a JSON string)
    *   Type: `Array` of `Object`
    *   Managed in: `config_manager.js` (parsed from JSON into `bookingConfig.eventsB`)
    *   Usage: Contains an array of canonical event definitions (UID, name, description, etc.). This data is accessed via `getEventsB()` in `event_handlers.js` when an event time slot is selected (to get full event details) and in `ui_manager.js` for displaying event details in a modal.

## Variables Not Currently Actively Used

The following variables are parsed from the source but do not appear to be actively used in the application's core logic or UI rendering based on current code analysis:

*   **`accIdForApi`** (from `ACC_ID`)
*   **`logoUrl`** (from `LOGO_URL`)
*   **`defaultTimeIncrement`** (from `DEFAULT_TIME_INCREMENT`): Although passed during Flatpickr initialization, it's not used by the `initializeFlatpickr` function to configure the date picker itself.
*   **`eventMessages`** (from `EVENT_MESSAGES_JSON_STRING`): The getter `getEventMessages()` is defined but not called.
*   **`showEventsFeature`** (from `SHOW_EVENT_FEATURE`): The getter `getShowEventsFlag()` is defined but not called.

This list should be periodically reviewed if the application undergoes significant changes, as variable usage might evolve.