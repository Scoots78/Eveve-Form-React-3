import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

/**
 * ReactCalendarPicker - A modern React calendar component using react-calendar
 * Designed as a drop-in replacement for the flatpickr-based CalendarPicker
 */
const ReactCalendarPicker = ({
  date,
  onChange,
  disabledDates = [],
  onMonthChange,
  dateFormat,
  disablePast = true
}) => {
  // Track when component renders for debugging
  useEffect(() => {
    console.log(
      `%c[ReactCalendar] render – disabledDates length: ${disabledDates.length}`,
      "color:teal;font-weight:bold"
    );
  });

  // Track when disabledDates changes
  useEffect(() => {
    console.log(
      `%c[ReactCalendar] disabledDates changed – new length: ${disabledDates.length}`,
      "color:purple;font-weight:bold"
    );
  }, [disabledDates]);

  // Function to determine if a date should be disabled
  const tileDisabled = ({ date, view }) => {
    // Only apply to month view
    if (view !== 'month') return false;

    // Disable past dates if required
    if (disablePast && date < new Date().setHours(0, 0, 0, 0)) {
      return true;
    }

    // Check if date is in disabledDates array
    return disabledDates.some(disabledDate => {
      return (
        date.getFullYear() === disabledDate.getFullYear() &&
        date.getMonth() === disabledDate.getMonth() &&
        date.getDate() === disabledDate.getDate()
      );
    });
  };

  // Handle month navigation
  const handleActiveStartDateChange = ({ activeStartDate, view }) => {
    if (view === 'month' && onMonthChange) {
      console.groupCollapsed(
        `%c[ReactCalendar] onMonthChange fired – yr:${activeStartDate.getFullYear()} m:${activeStartDate.getMonth() + 1}`,
        "color:orange;font-weight:bold"
      );
      
      console.log(
        `%c[ReactCalendar] calling parent onMonthChange callback`,
        "color:blue"
      );
      
      // Call the parent's onMonthChange with parameters that match the expected format
      onMonthChange(
        null, // selected (not used in our implementation)
        null, // dateStr (not used in our implementation)
        { 
          currentYear: activeStartDate.getFullYear(),
          currentMonth: activeStartDate.getMonth() // 0-based, like flatpickr
        }
      );
      
      console.groupEnd();
    }
  };

  // Handle date selection
  const handleDateChange = (newDate) => {
    if (onChange) {
      // Convert to array format to match the old flatpickr format
      onChange([newDate]);
    }
  };

  return (
    <div className="react-calendar-wrapper">
      <Calendar
        value={date}
        onChange={handleDateChange}
        onActiveStartDateChange={handleActiveStartDateChange}
        tileDisabled={tileDisabled}
        minDetail="month"
        maxDetail="month"
        /* Remove year-jump navigation (<< and >>) */
        prev2Label={null}
        next2Label={null}
        showNeighboringMonth={false}
        className="react-calendar-custom"
      />
      <style jsx="true">{`
        .react-calendar-wrapper {
          width: 100%;
          max-width: 100%;
        }
        
        :global(.react-calendar-custom) {
          width: 100%;
          max-width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          padding: 0.5rem;
          font-family: inherit;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }
        
        :global(.react-calendar-custom button) {
          border-radius: 0.25rem;
          padding: 0.5rem;
        }
        
        :global(.react-calendar-custom .react-calendar__tile--active) {
          background: #4f46e5;
          color: white;
        }
        
        :global(.react-calendar-custom .react-calendar__tile--now) {
          background: #e5e7eb;
        }
        
        :global(.react-calendar-custom .react-calendar__navigation) {
          margin-bottom: 0.5rem;
        }
        
        :global(.react-calendar-custom .react-calendar__navigation button) {
          min-width: 2.5rem;
          background: none;
        }
        
        :global(.react-calendar-custom .react-calendar__navigation button:enabled:hover,
                .react-calendar-custom .react-calendar__navigation button:enabled:focus) {
          background-color: #e5e7eb;
        }
        
        :global(.react-calendar-custom .react-calendar__tile:disabled) {
          background-color: #f9fafb;
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
};

export default ReactCalendarPicker;
