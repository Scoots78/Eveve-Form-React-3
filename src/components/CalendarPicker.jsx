import React from 'react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/material_blue.css';

export default function CalendarPicker({ date, onChange }) {
  return (
    <div className="mb-4">
      <label className="block font-medium mb-1">Select a date:</label>
      <Flatpickr
        options={{
          dateFormat: 'D, M j, Y',
          minDate: 'today',
        }}
        value={date}
        onChange={onChange}
        className="w-full border rounded px-3 py-2"
      />
    </div>
  );
}
