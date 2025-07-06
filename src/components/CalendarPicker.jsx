import React from 'react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/airbnb.css';

export default function CalendarPicker({ date, onChange, dateFormat, disablePast }) {
  const options = {
    // Standard internal date format, good for API calls
    dateFormat: "D, M j, Y",
    // altInput and altFormat are used for display purposes if dateFormat prop is provided
    altInput: !!dateFormat, // Enable altInput only if a custom display format is given
    altFormat: dateFormat || "D, M j, Y", // Use provided dateFormat for display, or fallback
    minDate: disablePast ? "today" : null, // Disable past dates if prop is true
    inline: true, // Open the calendar by default
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
