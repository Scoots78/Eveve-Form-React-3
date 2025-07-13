/**
 * ======================================================================
 *  🚨  DEPRECATED COMPONENT – DO NOT USE IN NEW CODE  🚨
 * ----------------------------------------------------------------------
 *  CalendarPicker.jsx has been superseded by ReactCalendarPicker.jsx,
 *  which uses `react-calendar` (not `react-flatpickr`) for improved
 *  accessibility, performance, and maintainability.
 *
 *  This file is retained only for legacy reference.  All new features
 *  or bug-fixes should target ReactCalendarPicker.jsx instead.
 * ======================================================================
 */

import React from 'react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/airbnb.css';

/**
 * CalendarPicker
 *
 * A thin wrapper around react-flatpickr that provides a consistently styled
 * inline calendar with support for:
 *  • Custom display formats (`dateFormat`)
 *  • Optional past-date disabling (`disablePast`)
 *  • Disabling specific dates returned from Eveve month-avail (`disabledDates`)
 *  • Detecting month navigation so the parent component can fetch additional
 *    availability data (`onMonthChange`)
 *
 * Props
 * @param {Date|null}   date            – Currently selected date
 * @param {Function}    onChange        – Callback fired when the user selects a date
 * @param {String}      [dateFormat]    – Optional display format for altInput
 * @param {Boolean}     [disablePast]   – If true, past dates are not selectable
 * @param {Date[]}      [disabledDates] – Array of Date objects that should be
 *                                        disabled/unselectable
 * @param {Function}    [onMonthChange] – Callback fired when user navigates to
 *                                        a different month (receives the same
 *                                        args as flatpickr's onMonthChange)
 */
export default function CalendarPicker({
  date,
  onChange,
  dateFormat,
  disablePast,
  disabledDates = [],
  onMonthChange
}) {
  // ---- DEBUG: track renders ----
  console.log(
    `%c[CalendarPicker] render – disabledDates length: ${disabledDates.length}`,
    "color: teal; font-weight: bold;"
  );

  /* -------------------------------------------------------------
     Log whenever disabledDates array reference / length changes.
     This helps detect re-renders that may trigger extra callbacks.
  ------------------------------------------------------------- */
  React.useEffect(() => {
    console.log(
      `%c[CalendarPicker] disabledDates changed – new length: ${disabledDates.length}`,
      "color: purple; font-weight: bold;"
    );
  }, [disabledDates]);
  const options = {
    // Standard internal date format, good for API calls
    dateFormat: "D, M j, Y",
    // altInput and altFormat are used for display purposes if dateFormat prop is provided
    altInput: !!dateFormat, // Enable altInput only if a custom display format is given
    altFormat: dateFormat || "D, M j, Y", // Use provided dateFormat for display, or fallback
    minDate: disablePast ? "today" : null, // Disable past dates if prop is true
    disable: disabledDates, // Disable dates returned from month-avail
    inline: true, // Open the calendar by default
    locale: {
      firstDayOfWeek: 1 // Set Monday as the first day of the week
    },
    /*
     * Trigger parent callback when user navigates month/year.
     * We wrap the call in a `setTimeout(..., 0)` so Flatpickr can
     * finish its own DOM/state updates first.  Calling immediately
     * can cause the calendar to appear “stuck” until a second click.
     */
    onMonthChange: [
      function handleMonthChange(selectedDates, dateStr, instance) {
        console.log(
          `%c[CalendarPicker] onMonthChange fired – yr:${instance.currentYear} m:${instance.currentMonth + 1}`,
          "color: orange; font-weight: bold;"
        );
        if (typeof onMonthChange === "function") {
          console.log(
            "%c[CalendarPicker] scheduling parent onMonthChange callback via setTimeout(0)",
            "color: orange; font-style: italic;"
          );
          setTimeout(() => {
            console.log(
              "%c[CalendarPicker] → calling parent onMonthChange now",
              "color: orange"
            );
            onMonthChange(selectedDates, dateStr, instance);
          }, 0);
        }
      }
    ]
  };

  return (
    <div className="mb-4">
      <label htmlFor="date-picker" className="block font-medium mb-1">Select a date:</label>
      <Flatpickr
        id="date-picker"
        options={options}
        value={date}
        onChange={onChange}
        className="w-full border rounded px-3 py-2"
        
      />
    </div>
  );
}
