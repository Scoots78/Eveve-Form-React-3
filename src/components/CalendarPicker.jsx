import React from 'react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/airbnb.css';
import { format as formatDateFns } from 'date-fns'; // Renamed to avoid conflict

export default function CalendarPicker({ date, onChange, dateFormat, disablePast, closedDates, onCalendarMonthChange }) {
  const options = {
    // Standard internal date format, good for API calls
    dateFormat: "Y-m-d", // Changed to Y-m-d to match closedDates format easily. Flatpickr handles display via altFormat.
    // altInput and altFormat are used for display purposes if dateFormat prop is provided
    altInput: !!dateFormat, // Enable altInput only if a custom display format is given
    altFormat: dateFormat || "D, M j, Y", // Use provided dateFormat for display, or fallback
    minDate: disablePast ? "today" : null, // Disable past dates if prop is true
    inline: true, // Open the calendar by default
    locale: {
      firstDayOfWeek: 1 // Set Monday as the first day of the week
    },
    disable: [
      function(d) {
        // d is a JavaScript Date object from Flatpickr
        const formattedDate = formatDateFns(d, 'yyyy-MM-dd');
        return closedDates && closedDates.includes(formattedDate);
      }
    ],
    onMonthChange: function(selectedDates, dateStr, instance) {
      if (onCalendarMonthChange) {
        // currentMonth is 0-indexed, currentYear is full year
        const firstDayOfNewMonth = new Date(instance.currentYear, instance.currentMonth, 1);
        onCalendarMonthChange(firstDayOfNewMonth);
      }
    },
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
